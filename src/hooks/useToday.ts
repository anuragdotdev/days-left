import { useEffect, useState } from 'react';
import { todayString } from '../utils/dates';

/**
 * Tracks today's local date string and refreshes it when the clock crosses
 * midnight, when the tab regains focus, or when it becomes visible again.
 */
export function useToday(): string {
  const [today, setToday] = useState(() => todayString());

  useEffect(() => {
    let timer: number | undefined;

    const schedule = () => {
      window.clearTimeout(timer);
      const now = new Date();
      const nextMidnight = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + 1,
        0,
        0,
        1,
      );
      timer = window.setTimeout(() => {
        setToday(todayString());
        schedule();
      }, nextMidnight.getTime() - now.getTime());
    };

    const refresh = () => setToday(todayString());

    schedule();
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, []);

  return today;
}
