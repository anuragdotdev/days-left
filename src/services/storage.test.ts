import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AppData } from '../types';
import { STORAGE_KEY } from './migrate';

interface FakeStorageArea {
  data: Record<string, unknown>;
  get: (keys?: string | string[] | null) => Promise<Record<string, unknown>>;
  set: (items: Record<string, unknown>) => Promise<void>;
  remove: (keys: string | string[]) => Promise<void>;
  clear: () => Promise<void>;
}

function installFakeStorage() {
  const area: FakeStorageArea = {
    data: {},
    async get(keys) {
      if (keys === undefined || keys === null) return { ...area.data };
      const list = Array.isArray(keys) ? keys : [keys];
      const result: Record<string, unknown> = {};
      for (const key of list) {
        if (key in area.data) result[key] = area.data[key];
      }
      return result;
    },
    async set(items) {
      Object.assign(area.data, items);
    },
    async remove(keys) {
      const list = Array.isArray(keys) ? keys : [keys];
      for (const key of list) delete area.data[key];
    },
    async clear() {
      area.data = {};
    },
  };

  const listeners: ((changes: Record<string, unknown>, areaName: string) => void)[] = [];

  vi.stubGlobal('chrome', {
    storage: {
      local: area,
      onChanged: {
        addListener: (fn: (changes: Record<string, unknown>, areaName: string) => void) =>
          listeners.push(fn),
        removeListener: (fn: (changes: Record<string, unknown>, areaName: string) => void) => {
          const index = listeners.indexOf(fn);
          if (index >= 0) listeners.splice(index, 1);
        },
      },
    },
  });

  return { area, listeners };
}

async function importStorage() {
  vi.resetModules();
  return import('./storage');
}

describe('storage service', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns defaults when nothing is stored', async () => {
    installFakeStorage();
    const storage = await importStorage();
    const data = await storage.loadData();
    expect(data.events).toEqual([]);
    expect(data.tasks).toEqual([]);
    expect(data.settings.theme).toBe('dark');
  });

  it('writes the whole state under a single key', async () => {
    const { area } = installFakeStorage();
    const storage = await importStorage();
    await storage.updateData((current) => ({
      ...current,
      settings: { ...current.settings, countdownLabel: 'graduation' },
    }));
    expect(Object.keys(area.data)).toEqual([STORAGE_KEY]);
    const stored = area.data[STORAGE_KEY] as AppData;
    expect(stored.settings.countdownLabel).toBe('graduation');
  });

  it('does not lose updates when mutations run concurrently', async () => {
    installFakeStorage();
    const storage = await importStorage();

    const event = (id: string) => ({
      id,
      title: id,
      date: '2026-12-04',
      type: 'other' as const,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });

    await Promise.all([
      storage.upsertEvent(event('a')),
      storage.upsertEvent(event('b')),
      storage.upsertEvent(event('c')),
    ]);

    const data = await storage.loadData();
    expect(data.events.map((e) => e.id).sort()).toEqual(['a', 'b', 'c']);
  });

  it('removes legacy flat keys on first load', async () => {
    const { area } = installFakeStorage();
    area.data.eventName = 'Graduation';
    area.data.targetDate = '2026-06-01';
    const storage = await importStorage();
    await storage.loadData();
    expect(area.data.eventName).toBeUndefined();
    expect(area.data.targetDate).toBeUndefined();
  });

  it('resets all data', async () => {
    const { area } = installFakeStorage();
    const storage = await importStorage();
    await storage.updateData((current) => ({
      ...current,
      tasks: [
        {
          id: 't1',
          title: 'Task',
          completed: false,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
    }));
    const afterReset = await storage.resetAll();
    expect(afterReset.tasks).toEqual([]);
    const stored = area.data[STORAGE_KEY] as AppData;
    expect(stored.tasks).toEqual([]);
  });

  it('replaces all data on import', async () => {
    installFakeStorage();
    const storage = await importStorage();
    const incoming: AppData = {
      version: 1,
      settings: {
        countdownTarget: '2027-05-01',
        countdownLabel: 'imported',
        weekStartsOn: 'sunday',
        theme: 'light',
      },
      events: [
        {
          id: 'e1',
          title: 'Imported',
          date: '2026-12-04',
          type: 'project',
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
      tasks: [],
    };
    const result = await storage.replaceAll(incoming);
    expect(result.settings.countdownLabel).toBe('imported');
    expect(result.events).toHaveLength(1);
  });
});
