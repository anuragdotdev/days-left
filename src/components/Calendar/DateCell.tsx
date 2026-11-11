import { memo } from 'react';
import type { DayPhase } from '../../services/calendar';
import { toDateString } from '../../utils/dates';

interface DateCellProps {
  date: Date;
  phase: DayPhase;
  isCurrentMonth: boolean;
  isSelected: boolean;
  isFocusable: boolean;
  hasEvent: boolean;
  onSelect: (date: Date, anchor: HTMLElement) => void;
  onKeyDown: (date: Date, event: React.KeyboardEvent<HTMLButtonElement>) => void;
}

export const DateCell = memo(function DateCell({
  date,
  phase,
  isCurrentMonth,
  isSelected,
  isFocusable,
  hasEvent,
  onSelect,
  onKeyDown,
}: DateCellProps) {
  const dateStr = toDateString(date);
  const day = date.getDate();

  const base =
    'relative flex h-[21px] w-[21px] items-center justify-center rounded-[3px] text-[11px] leading-none transition-colors hover:bg-surface-2';

  const struck = 'line-through decoration-text-3/70';

  // Priority: today (solid neutral) > event (restrained amber) > past (muted,
  // struck through) > beyond the deadline (muted) > ordinary.
  let tone: string;
  if (phase === 'today') {
    tone = 'bg-accent font-semibold text-bg';
  } else if (hasEvent) {
    if (phase === 'past') {
      tone = `bg-amber/15 font-medium text-text-3 ${struck}`;
    } else if (phase === 'beyond') {
      tone = 'bg-amber/15 font-medium text-text-3';
    } else {
      tone = 'bg-amber/15 font-medium text-amber';
    }
  } else if (phase === 'past') {
    tone = `text-text-3 ${struck}`;
  } else if (phase === 'beyond') {
    tone = 'text-text-3';
  } else if (isCurrentMonth) {
    tone = 'text-text';
  } else {
    tone = 'text-text-3/45';
  }

  const label = date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <button
      type="button"
      data-date={dateStr}
      aria-label={hasEvent ? `${label}, has events` : label}
      aria-current={phase === 'today' ? 'date' : undefined}
      tabIndex={isFocusable ? 0 : -1}
      onClick={(event) => onSelect(date, event.currentTarget)}
      onKeyDown={(event) => onKeyDown(date, event)}
      className={[
        base,
        tone,
        isSelected && phase !== 'today' ? 'outline-1 outline-offset-[-1px] outline-text-3' : '',
        isSelected && phase === 'today' ? 'outline-1 outline-offset-[-1px] outline-text-2' : '',
      ].join(' ')}
    >
      {day}
    </button>
  );
});
