import { useCallback, useEffect, useRef, useState } from 'react';
import type { AppData, EventItem, Settings, TodoItem } from '../types';
import * as storage from '../services/storage';
import { defaultData } from '../services/migrate';

export interface AppDataApi {
  data: AppData;
  loading: boolean;
  setEvents: (updater: (events: EventItem[]) => EventItem[]) => Promise<void>;
  setTasks: (updater: (tasks: TodoItem[]) => TodoItem[]) => Promise<void>;
  updateSettings: (patch: Partial<Settings>) => Promise<void>;
  resetAll: () => Promise<void>;
  importData: (data: AppData) => Promise<void>;
  reload: () => Promise<void>;
}

/**
 * Loads the persisted application state and exposes mutation helpers that
 * write through the storage service. The UI re-renders immediately after
 * each write, and external storage changes trigger a reload.
 */
export function useAppData(): AppDataApi {
  const [data, setData] = useState<AppData>(() => defaultData());
  const [loading, setLoading] = useState(true);
  const mounted = useRef(true);

  const reload = useCallback(async () => {
    const next = await storage.loadData();
    if (!mounted.current) return;
    setData(next);
    setLoading(false);
  }, []);

  useEffect(() => {
    mounted.current = true;
    void reload();
    const unsubscribe = storage.onStorageChanged(() => {
      void reload();
    });
    return () => {
      mounted.current = false;
      unsubscribe();
    };
  }, [reload]);

  const setEvents = useCallback(async (updater: (events: EventItem[]) => EventItem[]) => {
    const next = await storage.updateData((current) => ({
      ...current,
      events: updater(current.events),
    }));
    if (mounted.current) setData(next);
  }, []);

  const setTasks = useCallback(async (updater: (tasks: TodoItem[]) => TodoItem[]) => {
    const next = await storage.updateData((current) => ({
      ...current,
      tasks: updater(current.tasks),
    }));
    if (mounted.current) setData(next);
  }, []);

  const updateSettings = useCallback(async (patch: Partial<Settings>) => {
    const next = await storage.patchSettings(patch);
    if (mounted.current) setData(next);
  }, []);

  const resetAll = useCallback(async () => {
    const next = await storage.resetAll();
    if (mounted.current) setData(next);
  }, []);

  const importData = useCallback(async (incoming: AppData) => {
    const next = await storage.replaceAll(incoming);
    if (mounted.current) setData(next);
  }, []);

  return {
    data,
    loading,
    setEvents,
    setTasks,
    updateSettings,
    resetAll,
    importData,
    reload,
  };
}
