import type { DateString } from '../types';

/**
 * The four visual phases a calendar day can be in.
 *
 *  - `past`   — before today
 *  - `today`  — today
 *  - `active` — after today and up to and including the deadline
 *  - `beyond` — after the deadline
 *
 * `YYYY-MM-DD` strings sort lexicographically in chronological order, so
 * plain string comparison is the correct comparison here.
 */
export type DayPhase = 'past' | 'today' | 'active' | 'beyond';

/**
 * Classifies a calendar day relative to today and the deadline.
 *
 * `past` is checked before `beyond`, so when the deadline itself is already
 * in the past, days after it stay struck through rather than turning into
 * plain muted days.
 */
export function dayPhase(
  date: DateString,
  today: DateString,
  deadline: DateString,
): DayPhase {
  if (date < today) return 'past';
  if (date === today) return 'today';
  if (date <= deadline) return 'active';
  return 'beyond';
}
