import type { AppData, EventItem, Settings, TodoItem } from '../types';
import {
  LEGACY_KEYS,
  SCHEMA_VERSION,
  STORAGE_KEY,
  defaultData,
  migrate,
} from './migrate';

/**
 * Centralised access to `chrome.storage.local`.
 *
 * All application state lives under a single key so every write is atomic.
 * Mutations are serialised through a promise chain and always re-read the
 * latest stored value first, which prevents lost updates when several
 * mutations are triggered in the same tick.
 *
 * An in-memory cache backs the store when `chrome.storage` is unavailable
 * (for example in a plain web page or when the quota is exceeded). Without
 * it, every mutation would start from empty defaults and silently discard
 * the existing events and tasks.
 */

function hasChromeStorage(): boolean {
  return typeof chrome !== 'undefined' && !!chrome.storage?.local;
}

let cache: AppData | null = null;

async function readRaw(): Promise<unknown> {
  if (!hasChromeStorage()) return cache;
  try {
    const result = await chrome.storage.local.get(STORAGE_KEY);
    const stored = result?.[STORAGE_KEY];
    if (stored === undefined) return cache;
    return stored;
  } catch {
    return cache;
  }
}

async function writeRaw(data: AppData): Promise<void> {
  cache = data;
  if (!hasChromeStorage()) return;
  try {
    await chrome.storage.local.set({ [STORAGE_KEY]: data });
  } catch (error) {
    console.error('[deadline] failed to persist data', error);
  }
}

let queue: Promise<unknown> = Promise.resolve();

/** Run a mutation after all previously queued mutations have settled. */
function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const result = queue.then(task, task);
  queue = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}

/** Load the current application state, migrating it if needed. */
export async function loadData(): Promise<AppData> {
  const raw = await readRaw();
  const data = migrate(raw);
  cache = data;
  const hadLegacyKeys = await removeLegacyKeys();
  if (raw === null || hadLegacyKeys || !hasChromeStorage()) {
    // Persist the migrated shape so the next load is a plain read.
    await writeRaw(data);
  }
  return data;
}

/** Remove the flat keys used by v1 of the extension (one-time cleanup). */
export async function removeLegacyKeys(): Promise<boolean> {
  if (!hasChromeStorage()) return false;
  try {
    const existing = await chrome.storage.local.get(LEGACY_KEYS);
    const present = LEGACY_KEYS.filter((key) => existing?.[key] !== undefined);
    if (present.length === 0) return false;
    await chrome.storage.local.remove(present);
    return true;
  } catch {
    return false;
  }
}

/** Overwrite the entire application state. */
export async function saveData(data: AppData): Promise<void> {
  await enqueue(async () => {
    await writeRaw({ ...data, version: SCHEMA_VERSION });
  });
}

/** Apply a partial update to the stored state. */
export async function updateData(
  updater: (current: AppData) => AppData,
): Promise<AppData> {
  return enqueue(async () => {
    const raw = await readRaw();
    const current = migrate(raw);
    const next = updater(current);
    await writeRaw({ ...next, version: SCHEMA_VERSION });
    return next;
  });
}

/* ---------------------------------------------------------------- events */

export async function upsertEvent(event: EventItem): Promise<AppData> {
  return updateData((current) => {
    const index = current.events.findIndex((e) => e.id === event.id);
    const events = [...current.events];
    if (index >= 0) {
      events[index] = event;
    } else {
      events.push(event);
    }
    return { ...current, events };
  });
}

export async function removeEvent(id: string): Promise<AppData> {
  return updateData((current) => ({
    ...current,
    events: current.events.filter((e) => e.id !== id),
  }));
}

/* ----------------------------------------------------------------- tasks */

export async function upsertTask(task: TodoItem): Promise<AppData> {
  return updateData((current) => {
    const index = current.tasks.findIndex((t) => t.id === task.id);
    const tasks = [...current.tasks];
    if (index >= 0) {
      tasks[index] = task;
    } else {
      tasks.push(task);
    }
    return { ...current, tasks };
  });
}

export async function removeTask(id: string): Promise<AppData> {
  return updateData((current) => ({
    ...current,
    tasks: current.tasks.filter((t) => t.id !== id),
  }));
}

/* -------------------------------------------------------------- settings */

export async function patchSettings(patch: Partial<Settings>): Promise<AppData> {
  return updateData((current) => ({
    ...current,
    settings: { ...current.settings, ...patch },
  }));
}

/* ----------------------------------------------------------------- reset */

export async function resetAll(): Promise<AppData> {
  return enqueue(async () => {
    const data = defaultData();
    await writeRaw(data);
    return data;
  });
}

/** Replace all data (used by JSON import). */
export async function replaceAll(data: AppData): Promise<AppData> {
  return enqueue(async () => {
    const next = migrate(data);
    await writeRaw(next);
    return next;
  });
}

/** Subscribe to external storage changes. Returns an unsubscribe function. */
export function onStorageChanged(listener: () => void): () => void {
  if (!hasChromeStorage()) return () => undefined;
  const handler = (
    changes: Record<string, chrome.storage.StorageChange>,
    areaName: string,
  ) => {
    if (areaName !== 'local') return;
    if (Object.keys(changes).some((key) => key === STORAGE_KEY || LEGACY_KEYS.includes(key))) {
      listener();
    }
  };
  chrome.storage.onChanged.addListener(handler);
  return () => chrome.storage.onChanged.removeListener(handler);
}
