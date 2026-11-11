import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { CalendarPlus, Pencil, Trash2 } from 'lucide-react';
import type { EventItem } from '../../types';
import { eventTypeLabel } from '../../types';
import { formatDateWithWeekday } from '../../utils/dates';

interface DatePopoverProps {
  open: boolean;
  date: string | null;
  events: EventItem[];
  /** The clicked calendar cell, used to position the popover. */
  anchor: HTMLElement | null;
  onClose: () => void;
  onAdd: (date: string) => void;
  onEdit: (event: EventItem) => void;
  onDelete: (event: EventItem) => void;
}

const POPOVER_WIDTH = 280;
const GAP = 8;
const VIEWPORT_PADDING = 8;

interface Position {
  top: number;
  left: number;
}

/**
 * Position the popover next to the clicked cell: below it when there is room,
 * otherwise above it. Uses fixed positioning and the popover's measured
 * height so it always sits flush against the cell.
 */
export function DatePopover({
  open,
  date,
  events,
  anchor,
  onClose,
  onAdd,
  onEdit,
  onDelete,
}: DatePopoverProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<Position | null>(null);

  const reposition = useCallback(() => {
    if (!anchor || !ref.current) return;
    const cell = anchor.getBoundingClientRect();
    const popover = ref.current.getBoundingClientRect();
    const height = popover.height || 200;

    // When the cell sits near the bottom edge, scroll it into view so the
    // popover has room to open below it.
    const spaceBelow = window.innerHeight - cell.bottom;
    if (spaceBelow < height + GAP + VIEWPORT_PADDING) {
      const needed = height + GAP + VIEWPORT_PADDING - spaceBelow;
      const target = Math.max(0, window.scrollY + cell.top - needed - 8);
      window.scrollTo({ top: target, behavior: 'smooth' });
    }

    let top = cell.bottom + GAP;
    if (top + height > window.innerHeight - VIEWPORT_PADDING) {
      const above = cell.top - GAP - height;
      top = above >= VIEWPORT_PADDING ? above : Math.max(VIEWPORT_PADDING, window.innerHeight - VIEWPORT_PADDING - height);
    }

    let left = cell.left + cell.width / 2 - POPOVER_WIDTH / 2;
    left = Math.min(Math.max(VIEWPORT_PADDING, left), window.innerWidth - POPOVER_WIDTH - VIEWPORT_PADDING);

    setPosition({ top, left });
  }, [anchor]);

  useLayoutEffect(() => {
    if (!open) {
      setPosition(null);
      return;
    }
    reposition();
  }, [open, reposition]);

  useEffect(() => {
    if (!open) return;
    const onScrollOrResize = () => reposition();
    window.addEventListener('scroll', onScrollOrResize, true);
    window.addEventListener('resize', onScrollOrResize);
    return () => {
      window.removeEventListener('scroll', onScrollOrResize, true);
      window.removeEventListener('resize', onScrollOrResize);
    };
  }, [open, reposition]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    const onMouseDown = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        const target = event.target;
        if (target instanceof Element && target.closest('button[data-date]')) return;
        onClose();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('mousedown', onMouseDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('mousedown', onMouseDown);
    };
  }, [open, onClose]);

  if (!open || !date) return null;

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label={`Events on ${formatDateWithWeekday(date)}`}
      style={{
        position: 'fixed',
        top: position?.top ?? 0,
        left: position?.left ?? 0,
        width: POPOVER_WIDTH,
        visibility: position ? 'visible' : 'hidden',
      }}
      className="animate-pop-in z-40 rounded-xl border border-line bg-surface p-3 shadow-[0_8px_30px_rgba(0,0,0,0.55)]"
    >
      <p className="mb-2 text-[11px] uppercase tracking-[0.1em] text-text-2">
        {formatDateWithWeekday(date)}
      </p>

      {events.length === 0 ? (
        <p className="py-2 text-[12px] text-text-3">No events on this date.</p>
      ) : (
        <ul className="mb-2 flex flex-col divide-y divide-line-soft">
          {events.map((event) => (
            <li key={event.id} className="flex items-start gap-2 py-2">
              <span
                aria-hidden="true"
                className="mt-[5px] h-[5px] w-[5px] shrink-0 rounded-full bg-amber"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12.5px] text-text">{event.title}</p>
                <p className="text-[10px] uppercase tracking-[0.08em] text-text-3">
                  {eventTypeLabel(event.type)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onEdit(event)}
                aria-label={`Edit ${event.title}`}
                className="flex h-6 w-6 items-center justify-center rounded-md text-text-3 transition-colors hover:bg-surface-2 hover:text-text"
              >
                <Pencil size={12} strokeWidth={1.5} aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => onDelete(event)}
                aria-label={`Delete ${event.title}`}
                className="flex h-6 w-6 items-center justify-center rounded-md text-text-3 transition-colors hover:bg-surface-2 hover:text-danger"
              >
                <Trash2 size={12} strokeWidth={1.5} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={() => onAdd(date)}
        className="flex w-full items-center gap-1.5 rounded-md px-1 py-1.5 text-[11px] uppercase tracking-[0.1em] text-text-2 transition-colors hover:bg-surface-2 hover:text-text"
      >
        <CalendarPlus size={12} strokeWidth={1.5} aria-hidden="true" />
        Add event
      </button>
    </div>
  );
}
