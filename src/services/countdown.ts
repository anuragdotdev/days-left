import type { Settings } from '../types';
import { daysUntil, parseLocalDate } from '../utils/dates';

/**
 * Resolves the effective countdown target.
 *
 * The default target is December 31 of the current year, so once that date
 * has passed the countdown must roll forward to the next year end instead of
 * counting up forever. Only December 31 targets roll; any other date the
 * user configures is treated as a one-off and simply counts up once passed.
 */
export function resolveTarget(settings: Settings, today: Date = new Date()): string {
  const target = parseLocalDate(settings.countdownTarget);
  if (!target) return settings.countdownTarget;

  const isYearEnd = target.getMonth() === 11 && target.getDate() === 31;
  if (!isYearEnd) return settings.countdownTarget;

  const todayYear = today.getFullYear();
  if (target.getFullYear() >= todayYear) return settings.countdownTarget;

  // Roll forward to the next December 31 that is still in the future.
  const candidate = new Date(todayYear, 11, 31);
  if (candidate.getTime() < new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()) {
    return `${todayYear + 1}-12-31`;
  }
  return `${todayYear}-12-31`;
}

/**
 * Formats the header countdown line, e.g. "50 DAYS LEFT UNTIL YEAR END".
 * Returns the remaining days (negative once the target has passed).
 */
export function countdownDays(settings: Settings, today: Date = new Date()): number {
  return daysUntil(resolveTarget(settings, today), today);
}

export function countdownText(settings: Settings, today: Date = new Date()): string {
  const days = countdownDays(settings, today);
  const label = settings.countdownLabel.trim().toUpperCase() || 'TARGET';

  if (days === 0) return `TODAY IS ${label}`;
  if (days < 0) return `${Math.abs(days)} DAYS PAST ${label}`;
  if (days === 1) return `1 DAY LEFT UNTIL ${label}`;
  return `${days} DAYS LEFT UNTIL ${label}`;
}
