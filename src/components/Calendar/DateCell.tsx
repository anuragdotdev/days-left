import { memo } from 'react';
import { toDateString } from '../../utils/dates';

interface DateCellProps {
  date: Date;
  isToday: boolean;
  isPast: boolean;
  isCurrentMonth: boolean;
  isSelected: boolean;
  isFocusable: boolean;
  hasEvent: boolean;
  onSelect: (date: Date, anchor: HTMLElement) => void;
  onKeyDown: (date: Date, event: React.KeyboardEvent<HTMLButtonElement>) => void;
}

export const DateCell = memo(function DateCell({
  date,
  isToday,
  isPast,
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

  // Priority: today (solid neutral) > event (restrained amber) > past (muted,
  // struck through) > ordinary.
  let tone: string;
  if (isToday) {
    tone = 'bg-accent font-semibold text-bg';
  } else if (hasEvent) {
    tone = isPast
      ? 'bg-amber/15 font-medium text-text-3 line-through decoration-text-3/70'
      : 'bg-amber/15 font-medium text-amber';
  } else if (isPast) {
    tone = 'text-text-3 line-through decoration-text-3/70';
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
      aria-current={isToday ? 'date' : undefined}
      tabIndex={isFocusable ? 0 : -1}
      onClick={(event) => onSelect(date, event.currentTarget)}
      onKeyDown={(event) => onKeyDown(date, event)}
      className={[
        base,
        tone,
        isSelected && !isToday ? 'outline-1 outline-offset-[-1px] outline-text-3' : '',
        isSelected && isToday ? 'outline-1 outline-offset-[-1px] outline-text-2' : '',
      ].join(' ')}
    >
      {day}
    </button>
  );
});
