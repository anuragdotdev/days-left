import { describe, expect, it } from 'vitest';
import { defaultData, migrate, normalizeEvent, normalizeTask, SCHEMA_VERSION } from './migrate';

describe('migrate', () => {
  it('returns defaults for missing data', () => {
    const data = migrate(undefined);
    expect(data.version).toBe(SCHEMA_VERSION);
    expect(data.events).toEqual([]);
    expect(data.tasks).toEqual([]);
    expect(data.settings.countdownLabel).toBe('year end');
    expect(data.settings.weekStartsOn).toBe('monday');
    expect(data.settings.theme).toBe('dark');
  });

  it('returns defaults for malformed data', () => {
    expect(migrate('nonsense').events).toEqual([]);
    expect(migrate(42).tasks).toEqual([]);
    expect(migrate({ events: 'not-an-array' }).events).toEqual([]);
    expect(migrate({ tasks: 5 }).tasks).toEqual([]);
  });

  it('preserves valid events and tasks', () => {
    const data = migrate({
      version: 1,
      settings: { countdownLabel: 'graduation', weekStartsOn: 'sunday', theme: 'light' },
      events: [
        {
          id: 'e1',
          title: 'Exam',
          date: '2026-12-04',
          type: 'examination',
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
      tasks: [
        {
          id: 't1',
          title: 'Read',
          completed: true,
          priority: 'high',
          dueDate: '2026-11-10',
          createdAt: '2026-01-01T00:00:00.000Z',
          completedAt: '2026-01-02T00:00:00.000Z',
          updatedAt: '2026-01-02T00:00:00.000Z',
        },
      ],
    });

    expect(data.settings.countdownLabel).toBe('graduation');
    expect(data.settings.weekStartsOn).toBe('sunday');
    expect(data.settings.theme).toBe('light');
    expect(data.events).toHaveLength(1);
    expect(data.events[0]?.date).toBe('2026-12-04');
    expect(data.tasks).toHaveLength(1);
    expect(data.tasks[0]?.completed).toBe(true);
    expect(data.tasks[0]?.priority).toBe('high');
  });

  it('drops records that cannot be repaired', () => {
    const data = migrate({
      events: [
        { title: 'No date', date: 'not-a-date' },
        { title: '', date: '2026-01-01' },
        { title: 'Good', date: '2026-01-01' },
      ],
      tasks: [{ title: '' }, { title: 'Fine' }],
    });
    expect(data.events).toHaveLength(1);
    expect(data.events[0]?.title).toBe('Good');
    expect(data.tasks).toHaveLength(1);
    expect(data.tasks[0]?.title).toBe('Fine');
  });

  it('repairs invalid settings values', () => {
    const data = migrate({
      settings: {
        countdownTarget: 'bad-date',
        countdownLabel: '',
        weekStartsOn: 'wednesday',
        theme: 'neon',
      },
    });
    expect(data.settings.countdownTarget).toMatch(/^\d{4}-12-31$/);
    expect(data.settings.countdownLabel).toBe('year end');
    expect(data.settings.weekStartsOn).toBe('monday');
    expect(data.settings.theme).toBe('dark');
  });

  it('does not import legacy flat countdown keys', () => {
    const data = migrate({ eventName: 'Graduation', targetDate: '2026-06-01' });
    expect(data.settings.countdownLabel).toBe('year end');
    expect(data.settings.countdownTarget).not.toBe('2026-06-01');
  });
});

describe('normalizeEvent', () => {
  it('fills in defaults for missing fields', () => {
    const event = normalizeEvent({ title: 'Demo', date: '2026-05-05' });
    expect(event?.type).toBe('other');
    expect(event?.id).toBeTruthy();
    expect(event?.createdAt).toBeTruthy();
  });

  it('rejects events without a title or date', () => {
    expect(normalizeEvent({ date: '2026-05-05' })).toBeNull();
    expect(normalizeEvent({ title: 'Demo' })).toBeNull();
  });
});

describe('normalizeTask', () => {
  it('keeps optional fields undefined when absent', () => {
    const task = normalizeTask({ title: 'Demo' });
    expect(task?.priority).toBeUndefined();
    expect(task?.dueDate).toBeUndefined();
    expect(task?.completed).toBe(false);
  });

  it('drops invalid due dates', () => {
    const task = normalizeTask({ title: 'Demo', dueDate: '2026-02-31' });
    expect(task?.dueDate).toBeUndefined();
  });
});

describe('defaultData', () => {
  it('starts empty with a Dec 31 countdown target', () => {
    const data = defaultData();
    expect(data.events).toEqual([]);
    expect(data.tasks).toEqual([]);
    expect(data.settings.countdownTarget).toMatch(/^\d{4}-12-31$/);
  });
});
