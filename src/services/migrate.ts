import type { AppData, EventItem, EventType, Priority, Settings, TodoItem, WeekStart } from '../types';
import { EVENT_TYPES, PRIORITIES } from '../types';
import { endOfYearString, isDateString, todayString } from '../utils/dates';

export const SCHEMA_VERSION = 1;

/** Storage key holding the whole application state as one atomic value. */
export const STORAGE_KEY = 'deadline:data';

/** Legacy flat keys written by v1 of the extension; removed once migration runs. */
export const LEGACY_KEYS = ['eventName', 'targetDate', 'createdAt'];

export function defaultSettings(): Settings {
  return {
    countdownTarget: endOfYearString(new Date().getFullYear()),
    countdownLabel: 'year end',
    weekStartsOn: 'monday',
    theme: 'dark',
  };
}

export function defaultData(): AppData {
  return {
    version: SCHEMA_VERSION,
    settings: defaultSettings(),
    events: [],
    tasks: [],
  };
}

function isEventType(value: unknown): value is EventType {
  return typeof value === 'string' && EVENT_TYPES.some((t) => t.value === value);
}

function isPriority(value: unknown): value is Priority {
  return typeof value === 'string' && PRIORITIES.some((p) => p.value === value);
}

function isWeekStart(value: unknown): value is WeekStart {
  return value === 'monday' || value === 'sunday';
}

function str(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function bool(value: unknown, fallback = false): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

/** Coerce one raw record into an EventItem, or null when it is unusable. */
export function normalizeEvent(raw: unknown): EventItem | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const title = str(r.title).trim();
  if (!title || !isDateString(r.date)) return null;
  const now = new Date().toISOString();
  const type: EventType = isEventType(r.type) ? r.type : 'other';
  const description = str(r.description).trim();
  return {
    id: str(r.id) || `event-${title}-${str(r.date)}`,
    title,
    date: r.date,
    ...(description ? { description } : {}),
    type,
    createdAt: str(r.createdAt) || now,
    updatedAt: str(r.updatedAt) || now,
  };
}

/** Coerce one raw record into a TodoItem, or null when it is unusable. */
export function normalizeTask(raw: unknown): TodoItem | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const title = str(r.title).trim();
  if (!title) return null;
  const now = new Date().toISOString();
  const completed = bool(r.completed, false);
  const priority = isPriority(r.priority) ? r.priority : undefined;
  const dueDate = isDateString(r.dueDate) ? r.dueDate : undefined;
  const completedAt = str(r.completedAt) || undefined;
  return {
    id: str(r.id) || `task-${title}-${now}`,
    title,
    completed,
    ...(priority ? { priority } : {}),
    ...(dueDate ? { dueDate } : {}),
    createdAt: str(r.createdAt) || now,
    ...(completedAt ? { completedAt } : {}),
    updatedAt: str(r.updatedAt) || now,
  };
}

export function normalizeSettings(raw: unknown): Settings {
  const defaults = defaultSettings();
  if (!raw || typeof raw !== 'object') return defaults;
  const r = raw as Record<string, unknown>;
  return {
    countdownTarget: isDateString(r.countdownTarget) ? r.countdownTarget : defaults.countdownTarget,
    countdownLabel: str(r.countdownLabel, defaults.countdownLabel).trim() || defaults.countdownLabel,
    weekStartsOn: isWeekStart(r.weekStartsOn) ? r.weekStartsOn : defaults.weekStartsOn,
    theme: r.theme === 'light' ? 'light' : r.theme === 'dark' ? 'dark' : defaults.theme,
  };
}

/**
 * Upgrade raw stored data to the current schema.
 *
 * Missing or malformed fields fall back to safe defaults; unusable records
 * are dropped rather than propagated. Never throws.
 */
export function migrate(raw: unknown): AppData {
  if (!raw || typeof raw !== 'object') return defaultData();
  const r = raw as Record<string, unknown>;

  const events = Array.isArray(r.events)
    ? r.events.map(normalizeEvent).filter((e): e is EventItem => e !== null)
    : [];

  const tasks = Array.isArray(r.tasks)
    ? r.tasks.map(normalizeTask).filter((t): t is TodoItem => t !== null)
    : [];

  const settings = normalizeSettings(r.settings);

  return {
    version: SCHEMA_VERSION,
    settings,
    events,
    tasks,
  };
}

/**
 * Legacy v1 data was stored as flat keys (`eventName`, `targetDate`).
 * Per the agreed decision the new extension starts clean, so the old keys are
 * only reported (so the caller can delete them) and never imported.
 */
export function legacyCountdownDefaults(): { target: string; label: string } {
  return { target: endOfYearString(new Date().getFullYear()), label: 'year end' };
}

export function defaultCountdownTarget(): string {
  return endOfYearString(new Date().getFullYear());
}

export function isToday(value: string): boolean {
  return value === todayString();
}
