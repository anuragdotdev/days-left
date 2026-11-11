import { describe, expect, it } from 'vitest';
import {
  addDays,
  daysInMonth,
  daysUntil,
  diffDays,
  endOfYearString,
  formatLongDate,
  isDateString,
  isLeapYear,
  monthMatrix,
  parseLocalDate,
  startOfWeek,
  toDateString,
  todayString,
  weekdayInitials,
} from './dates';

describe('parseLocalDate', () => {
  it('parses a date string as local midnight', () => {
    const date = parseLocalDate('2026-12-31');
    expect(date).not.toBeNull();
    expect(date?.getFullYear()).toBe(2026);
    expect(date?.getMonth()).toBe(11);
    expect(date?.getDate()).toBe(31);
    expect(date?.getHours()).toBe(0);
    expect(date?.getMinutes()).toBe(0);
  });

  it('never parses as UTC', () => {
    // A naive `new Date('2026-01-01')` would be Dec 31 in the Americas.
    const date = parseLocalDate('2026-01-01');
    expect(date?.getDate()).toBe(1);
  });

  it('rejects malformed and impossible dates', () => {
    expect(parseLocalDate('')).toBeNull();
    expect(parseLocalDate('not-a-date')).toBeNull();
    expect(parseLocalDate('2026-13-01')).toBeNull();
    expect(parseLocalDate('2026-02-30')).toBeNull();
    expect(parseLocalDate('2026-02-29')).toBeNull();
    expect(parseLocalDate('2024-02-29')).not.toBeNull();
  });
});

describe('isDateString', () => {
  it('accepts valid dates only', () => {
    expect(isDateString('2026-02-28')).toBe(true);
    expect(isDateString('2024-02-29')).toBe(true);
    expect(isDateString('2026-02-29')).toBe(false);
    expect(isDateString(20260228)).toBe(false);
    expect(isDateString(undefined)).toBe(false);
  });
});

describe('toDateString / todayString', () => {
  it('formats using local components', () => {
    expect(toDateString(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(toDateString(new Date(2026, 11, 31))).toBe('2026-12-31');
  });

  it('builds today from local components, never from UTC', () => {
    const local = new Date(2026, 5, 15, 23, 30);
    expect(todayString(local)).toBe('2026-06-15');
  });
});

describe('month lengths and leap years', () => {
  it('detects leap years', () => {
    expect(isLeapYear(2024)).toBe(true);
    expect(isLeapYear(2026)).toBe(false);
    expect(isLeapYear(1900)).toBe(false);
    expect(isLeapYear(2000)).toBe(true);
  });

  it('returns the right number of days per month', () => {
    expect(daysInMonth(2026, 1)).toBe(31);
    expect(daysInMonth(2026, 2)).toBe(28);
    expect(daysInMonth(2024, 2)).toBe(29);
    expect(daysInMonth(2026, 4)).toBe(30);
    expect(daysInMonth(2026, 12)).toBe(31);
  });
});

describe('diffDays / daysUntil', () => {
  it('counts calendar days, not 24-hour chunks', () => {
    expect(diffDays(new Date(2026, 0, 10), new Date(2026, 0, 1))).toBe(9);
    expect(diffDays(new Date(2026, 0, 1), new Date(2026, 0, 10))).toBe(-9);
  });

  it('spans month and year transitions', () => {
    expect(diffDays(new Date(2026, 0, 1), new Date(2025, 11, 31))).toBe(1);
    expect(diffDays(new Date(2027, 0, 1), new Date(2026, 11, 31))).toBe(1);
    expect(diffDays(new Date(2028, 2, 1), new Date(2028, 1, 29))).toBe(1);
  });

  it('computes days until a target date', () => {
    const today = new Date(2026, 11, 31);
    expect(daysUntil('2026-12-31', today)).toBe(0);
    expect(daysUntil('2027-01-01', today)).toBe(1);
    expect(daysUntil('2026-12-30', today)).toBe(-1);
  });

  it('is stable across a DST transition', () => {
    // The European DST switch falls on the last Sunday of March 2026 (Mar 29).
    const before = new Date(2026, 2, 28);
    const after = new Date(2026, 2, 29);
    expect(diffDays(after, before)).toBe(1);

    // And on the US switch in November.
    const beforeNov = new Date(2026, 10, 1);
    const afterNov = new Date(2026, 10, 2);
    expect(diffDays(afterNov, beforeNov)).toBe(1);
  });
});

describe('addDays', () => {
  it('handles month transitions', () => {
    expect(toDateString(addDays(new Date(2026, 0, 31), 1))).toBe('2026-02-01');
    expect(toDateString(addDays(new Date(2026, 1, 28), 1))).toBe('2026-03-01');
  });

  it('handles leap days', () => {
    expect(toDateString(addDays(new Date(2024, 1, 28), 1))).toBe('2024-02-29');
    expect(toDateString(addDays(new Date(2024, 1, 28), 2))).toBe('2024-03-01');
  });

  it('handles year transitions in both directions', () => {
    expect(toDateString(addDays(new Date(2026, 11, 31), 1))).toBe('2027-01-01');
    expect(toDateString(addDays(new Date(2027, 0, 1), -1))).toBe('2026-12-31');
  });
});

describe('startOfWeek', () => {
  it('starts on Monday when requested', () => {
    // 2026-01-01 is a Thursday.
    expect(toDateString(startOfWeek(new Date(2026, 0, 1), 'monday'))).toBe('2025-12-29');
  });

  it('starts on Sunday when requested', () => {
    expect(toDateString(startOfWeek(new Date(2026, 0, 1), 'sunday'))).toBe('2025-12-28');
  });

  it('handles a week starting exactly on the first day', () => {
    expect(toDateString(startOfWeek(new Date(2026, 5, 1), 'monday'))).toBe('2026-06-01');
    expect(toDateString(startOfWeek(new Date(2026, 5, 1), 'sunday'))).toBe('2026-05-31');
  });
});

describe('weekdayInitials', () => {
  it('returns monday-first and sunday-first orders', () => {
    expect(weekdayInitials('monday')).toEqual(['M', 'T', 'W', 'T', 'F', 'S', 'S']);
    expect(weekdayInitials('sunday')).toEqual(['S', 'M', 'T', 'W', 'T', 'F', 'S']);
  });
});

describe('monthMatrix', () => {
  it('returns whole weeks only (35 or 42 cells)', () => {
    for (const month of Array.from({ length: 12 }, (_, i) => i + 1)) {
      const cells = monthMatrix(2026, month, 'monday');
      expect(cells.length % 7).toBe(0);
      expect([35, 42]).toContain(cells.length);
    }
  });

  it('always contains every day of the target month', () => {
    for (const month of Array.from({ length: 12 }, (_, i) => i + 1)) {
      const cells = monthMatrix(2026, month, 'monday');
      const expected = daysInMonth(2026, month);
      const inMonth = cells.filter((d) => d.getMonth() === month - 1 && d.getFullYear() === 2026);
      expect(inMonth).toHaveLength(expected);
      expect(toDateString(inMonth[0]!)).toBe(`2026-${String(month).padStart(2, '0')}-01`);
    }
  });

  it('handles a leap February', () => {
    const cells = monthMatrix(2024, 2, 'monday');
    const inMonth = cells.filter((d) => d.getMonth() === 1 && d.getFullYear() === 2024);
    expect(inMonth).toHaveLength(29);
    expect(toDateString(inMonth[inMonth.length - 1]!)).toBe('2024-02-29');
  });

  it('aligns the first of the month to the correct weekday column', () => {
    // 2026-01-01 is Thursday -> column index 3 in a Monday-first grid.
    const mondayFirst = monthMatrix(2026, 1, 'monday');
    const firstIndex = mondayFirst.findIndex((d) => toDateString(d) === '2026-01-01');
    expect(firstIndex % 7).toBe(3);

    // 2026-01-01 is Thursday -> column index 4 in a Sunday-first grid.
    const sundayFirst = monthMatrix(2026, 1, 'sunday');
    const firstIndexSunday = sundayFirst.findIndex((d) => toDateString(d) === '2026-01-01');
    expect(firstIndexSunday % 7).toBe(4);
  });
});

describe('endOfYearString', () => {
  it('defaults the countdown target to December 31', () => {
    expect(endOfYearString(2026)).toBe('2026-12-31');
  });
});

describe('formatLongDate', () => {
  it('renders a readable date', () => {
    expect(formatLongDate('2026-12-31')).toBe('December 31, 2026');
  });
});
