import { memo, useMemo } from 'react';
import type { WeekStart } from '../../types';
import { dayPhase } from '../../services/calendar';
import { monthMatrix, monthAbbreviation, toDateString, weekdayInitials } from '../../utils/dates';
import { DateCell } from './DateCell';

/** Day deltas for arrow-key navigation within the grid. */
const ARROW_DELTAS: Record<string, number> = {
  ArrowLeft: -1,
  ArrowRight: 1,
  ArrowUp: -7,
  ArrowDown: 7,
};

/** Split an array into fixed-size chunks. */
function chunk<T>(items: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    result.push(items.slice(i, i + size));
  }
  return result;
}

interface MonthGridProps {
  year: number;
  /** 1-based month. */
  month: number;
  weekStartsOn: WeekStart;
  today: string;
  /** The countdown target date; days up to and including it are highlighted. */
  deadline: string;
  selectedDate: string | null;
  eventDates: Set<string>;
  onSelectDate: (date: Date, anchor: HTMLElement) => void;
  onNavigate: (date: Date, dayDelta: number) => void;
}

export const MonthGrid = memo(function MonthGrid({
  year,
  month,
  weekStartsOn,
  today,
  deadline,
  selectedDate,
  eventDates,
  onSelectDate,
  onNavigate,
}: MonthGridProps) {
  const weekdays = useMemo(() => weekdayInitials(weekStartsOn), [weekStartsOn]);
  const cells = useMemo(
    () => monthMatrix(year, month, weekStartsOn),
    [year, month, weekStartsOn],
  );

  const focusDate = selectedDate ?? today;

  return (
    <section aria-label={`${monthAbbreviation(month)} ${year}`} className="min-w-0">
      <h3 className="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-text-2">
        {monthAbbreviation(month)}
      </h3>

      <div role="grid" aria-label={`${monthAbbreviation(month)} ${year}`}>
        <div role="row" className="grid grid-cols-7">
          {weekdays.map((label, index) => (
            <div
              key={`${label}-${index}`}
              role="columnheader"
              aria-label={label}
              className="flex h-[13px] items-center justify-center text-[9px] uppercase text-text-3"
            >
              {label}
            </div>
          ))}
        </div>

        {chunk(cells, 7).map((week, weekIndex) => (
          <div role="row" key={weekIndex} className="grid grid-cols-7">
            {week.map((date) => {
              const dateStr = toDateString(date);
              const isCurrentMonth = date.getMonth() === month - 1;
              const phase = dayPhase(dateStr, today, deadline);
              const isSelected = dateStr === selectedDate;
              return (
                <div
                  role="gridcell"
                  key={dateStr}
                  aria-selected={isSelected}
                  className="flex justify-center"
                >
                  <DateCell
                    date={date}
                    phase={phase}
                    isCurrentMonth={isCurrentMonth}
                    isSelected={isSelected}
                    isFocusable={dateStr === focusDate}
                    hasEvent={eventDates.has(dateStr)}
                    onSelect={onSelectDate}
                    onKeyDown={(d, event) => {
                      const delta = ARROW_DELTAS[event.key];
                      if (delta === undefined) return;
                      event.preventDefault();
                      onNavigate(d, delta);
                    }}
                  />
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </section>
  );
});
