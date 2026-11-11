import { describe, expect, it } from 'vitest';
import { countdownDays, countdownText, resolveTarget } from './countdown';
import type { Settings } from '../types';

const settings: Settings = {
  countdownTarget: '2026-12-31',
  countdownLabel: 'year end',
  weekStartsOn: 'monday',
  theme: 'dark',
};

describe('resolveTarget', () => {
  it('keeps a December 31 target in the current year', () => {
    expect(resolveTarget(settings, new Date(2026, 5, 1))).toBe('2026-12-31');
  });

  it('rolls a past year-end target forward to the next December 31', () => {
    expect(resolveTarget(settings, new Date(2027, 0, 1))).toBe('2027-12-31');
    expect(resolveTarget(settings, new Date(2027, 11, 31))).toBe('2027-12-31');
  });

  it('never rolls a non-year-end target', () => {
    const graduation: Settings = { ...settings, countdownTarget: '2026-06-01' };
    expect(resolveTarget(graduation, new Date(2027, 0, 1))).toBe('2026-06-01');
  });
});

describe('countdown', () => {
  it('counts the remaining days', () => {
    expect(countdownDays(settings, new Date(2026, 11, 31))).toBe(0);
    expect(countdownDays(settings, new Date(2026, 11, 1))).toBe(30);
    expect(countdownDays(settings, new Date(2026, 0, 1))).toBe(364);
  });

  it('formats the header line', () => {
    expect(countdownText(settings, new Date(2026, 11, 1))).toBe('30 DAYS LEFT UNTIL YEAR END');
    expect(countdownText(settings, new Date(2026, 11, 30))).toBe('1 DAY LEFT UNTIL YEAR END');
    expect(countdownText(settings, new Date(2026, 11, 31))).toBe('TODAY IS YEAR END');
  });

  it('counts up once a non-year-end target has passed', () => {
    const graduation: Settings = { ...settings, countdownTarget: '2026-06-01' };
    expect(countdownText(graduation, new Date(2026, 5, 3))).toBe('2 DAYS PAST YEAR END');
  });

  it('uppercases the label', () => {
    expect(
      countdownText({ ...settings, countdownLabel: 'graduation' }, new Date(2026, 11, 1)),
    ).toBe('30 DAYS LEFT UNTIL GRADUATION');
  });
});
