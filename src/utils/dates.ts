import type { DateString, WeekStart } from '../types';

/**
 * Local date utilities.
 *
 * Rules enforced here (see spec §12):
 *  - date-only values are `YYYY-MM-DD` strings;
 *  - `new Date('YYYY-MM-DD')` is never used (it parses as UTC);
 *  - `toISOString()` is never used to derive "today" (it shifts by timezone).
 *
 * `YYYY-MM-DD` strings sort lexicographically in chronological order, so
 * comparisons between date-only values are plain string comparisons.
 */

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Parse a `YYYY-MM-DD` string into a local Date at midnight. Returns null if invalid. */
export function parseLocalDate(value: string): Date | null {
  const match = DATE_RE.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > daysInMonth(year, month)) return null;
  return new Date(year, month - 1, day);
}

/** Format a Date as a local `YYYY-MM-DD` string. */
export function toDateString(date: Date): DateString {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Today's local date as `YYYY-MM-DD`. */
export function todayString(now: Date = new Date()): DateString {
  return toDateString(now);
}

/** True when the value is a well-formed `YYYY-MM-DD` date. */
export function isDateString(value: unknown): value is DateString {
  return typeof value === 'string' && parseLocalDate(value) !== null;
}

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function daysInMonth(year: number, month: number): number {
  // month is 1-based
  if (month === 2) return isLeapYear(year) ? 29 : 28;
  return [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1] ?? 30;
}

/**
 * Calendar-day difference between two local dates: `a - b` in days.
 * DST-safe because both dates are normalised to local midnight and then
 * compared via their UTC-day index.
 */
export function diffDays(a: Date, b: Date): number {
  const dayIndex = (d: Date) => Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000);
  return dayIndex(a) - dayIndex(b);
}

/** Whole days from today until `date` (negative when the date is in the past). */
export function daysUntil(date: DateString, today: Date = new Date()): number {
  const target = parseLocalDate(date);
  if (!target) return 0;
  return diffDays(target, new Date(today.getFullYear(), today.getMonth(), today.getDate()));
}

/** Add (or subtract) calendar days, returning a new Date at local midnight. */
export function addDays(date: Date, amount: number): Date {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  result.setDate(result.getDate() + amount);
  return result;
}

export function startOfWeek(date: Date, weekStartsOn: WeekStart): Date {
  const day = date.getDay(); // 0 = Sunday
  const offset = weekStartsOn === 'monday' ? (day === 0 ? 6 : day - 1) : day;
  return addDays(date, -offset);
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export const MONTH_ABBREVIATIONS = [
  'JAN',
  'FEB',
  'MAR',
  'APR',
  'MAY',
  'JUN',
  'JUL',
  'AUG',
  'SEP',
  'OCT',
  'NOV',
  'DEC',
] as const;

export const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

/** Three-letter uppercase month abbreviation for a 1-based month. */
export function monthAbbreviation(month: number): string {
  return MONTH_ABBREVIATIONS[month - 1] ?? '';
}

/** Weekday initials in display order for the given week-start preference. */
export function weekdayInitials(weekStartsOn: WeekStart): string[] {
  if (weekStartsOn === 'monday') return ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  return ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
}

/**
 * The days of the given month laid out in whole weeks, padded with the
 * neighbouring months' days so every date sits in its correct weekday
 * column.
 *
 * Only the weeks the month actually needs are returned (5 or 6), which keeps
 * the yearly calendar compact.
 */
export function monthMatrix(year: number, month: number, weekStartsOn: WeekStart): Date[] {
  const first = new Date(year, month - 1, 1);
  const last = new Date(year, month, 0);
  const gridStart = startOfWeek(first, weekStartsOn);
  const gridEnd = startOfWeek(last, weekStartsOn);

  const totalDays = diffDays(gridEnd, gridStart) + 7;
  const weekCount = totalDays / 7;

  const cells: Date[] = [];
  for (let i = 0; i < weekCount * 7; i += 1) {
    cells.push(addDays(gridStart, i));
  }
  return cells;
}

/** Dec 31 of the given year as a `YYYY-MM-DD` string. */
export function endOfYearString(year: number): DateString {
  return `${year}-12-31`;
}

/** Long readable date, e.g. "December 31, 2026". */
export function formatLongDate(value: DateString): string {
  const date = parseLocalDate(value);
  if (!date) return value;
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/** Weekday + date, e.g. "Thursday, December 31". */
export function formatDateWithWeekday(value: DateString): string {
  const date = parseLocalDate(value);
  if (!date) return value;
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}
