import { useMemo, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { WeekStart } from '../../types';
import { addDays, toDateString } from '../../utils/dates';
import { MonthGrid } from './MonthGrid';

interface YearlyCalendarProps {
  year: number;
  weekStartsOn: WeekStart;
  today: string;
  selectedDate: string | null;
  eventDates: Set<string>;
  onYearChange: (year: number) => void;
  onSelectDate: (date: Date, anchor: HTMLElement) => void;
  /** Keyboard navigation moves the selection without opening the popover. */
  onFocusDate: (date: Date) => void;
  /** The "Today" action returns to the current year and selects today. */
  onToday: (year: number) => void;
}

export function YearlyCalendar({
  year,
  weekStartsOn,
  today,
  selectedDate,
  eventDates,
  onYearChange,
  onSelectDate,
  onFocusDate,
  onToday,
}: YearlyCalendarProps) {
  const gridRef = useRef<HTMLDivElement>(null);
  const todayYear = Number(today.slice(0, 4));

  const months = useMemo(() => Array.from({ length: 12 }, (_, i) => i + 1), []);

  const focusDate = (date: Date, dayDelta: number) => {
    const next = addDays(date, dayDelta);
    const nextStr = toDateString(next);
    if (nextStr.slice(0, 4) !== String(year)) {
      // Crossing a year boundary moves the whole calendar.
      onYearChange(Number(nextStr.slice(0, 4)));
    }
    onFocusDate(next);
    requestAnimationFrame(() => {
      gridRef.current
        ?.querySelector<HTMLElement>(`button[data-date="${nextStr}"]`)
        ?.focus();
    });
  };

  return (
    <section aria-label="Yearly calendar" className="min-w-0">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="text-[26px] font-semibold leading-none tracking-[-0.02em] text-text">{year}</h2>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onYearChange(year - 1)}
            aria-label="Previous year"
            className="flex h-7 w-7 items-center justify-center rounded-md text-text-2 transition-colors hover:bg-surface-2 hover:text-text"
          >
            <ChevronLeft size={15} strokeWidth={1.5} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => onYearChange(year + 1)}
            aria-label="Next year"
            className="flex h-7 w-7 items-center justify-center rounded-md text-text-2 transition-colors hover:bg-surface-2 hover:text-text"
          >
            <ChevronRight size={15} strokeWidth={1.5} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => onToday(todayYear)}
            className="ml-2 rounded-md px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-text-3 transition-colors hover:bg-surface-2 hover:text-text"
          >
            Today
          </button>
        </div>
      </div>

      <div
        ref={gridRef}
        className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2 xl:grid-cols-3"
      >
        {months.map((month) => (
          <MonthGrid
            key={month}
            year={year}
            month={month}
            weekStartsOn={weekStartsOn}
            today={today}
            selectedDate={selectedDate}
            eventDates={eventDates}
            onSelectDate={onSelectDate}
            onNavigate={focusDate}
          />
        ))}
      </div>
    </section>
  );
}
