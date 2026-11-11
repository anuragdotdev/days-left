import { describe, expect, it } from 'vitest';
import { importDataFromFile } from './transfer';

function fileWith(content: string, name = 'backup.json'): File {
  return new File([content], name, { type: 'application/json' });
}

describe('importDataFromFile', () => {
  it('imports a valid backup', async () => {
    const backup = {
      version: 1,
      settings: {
        countdownTarget: '2027-05-01',
        countdownLabel: 'graduation',
        weekStartsOn: 'sunday',
        theme: 'light',
      },
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
      tasks: [],
    };

    const result = await importDataFromFile(fileWith(JSON.stringify(backup)));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.settings.countdownLabel).toBe('graduation');
    expect(result.data.events).toHaveLength(1);
  });

  it('rejects invalid JSON without throwing', async () => {
    const result = await importDataFromFile(fileWith('{not json'));
    expect(result.ok).toBe(false);
  });

  it('rejects JSON that is not a DEADLINE. backup', async () => {
    const result = await importDataFromFile(fileWith(JSON.stringify({ hello: 'world' })));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain('DEADLINE');
  });

  it('repairs a partially malformed backup instead of failing', async () => {
    const backup = {
      version: 1,
      settings: { countdownLabel: '', theme: 'neon' },
      events: [{ title: 'Good', date: '2026-01-05' }, { title: '' }],
      tasks: [{ title: 'Task' }],
    };
    const result = await importDataFromFile(fileWith(JSON.stringify(backup)));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.events).toHaveLength(1);
    expect(result.data.settings.theme).toBe('dark');
    expect(result.data.settings.countdownLabel).toBe('year end');
  });
});
