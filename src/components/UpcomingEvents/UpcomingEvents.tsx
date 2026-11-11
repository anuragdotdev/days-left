import { Plus } from 'lucide-react';
import type { EventItem } from '../../types';
import { eventTypeLabel } from '../../types';
import { monthAbbreviation } from '../../utils/dates';

interface UpcomingEventsProps {
  events: EventItem[];
  onAdd: () => void;
  onSelect: (event: EventItem) => void;
}

export function UpcomingEvents({ events, onAdd, onSelect }: UpcomingEventsProps) {
  return (
    <section aria-labelledby="upcoming-heading" className="min-w-0">
      <div className="mb-2 flex items-center justify-between">
        <h2
          id="upcoming-heading"
          className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-2"
        >
          Upcoming
        </h2>
        <button
          type="button"
          onClick={onAdd}
          aria-label="Add event"
          className="flex h-6 w-6 items-center justify-center rounded-md text-text-2 transition-colors hover:bg-surface-2 hover:text-text"
        >
          <Plus size={14} strokeWidth={1.5} aria-hidden="true" />
        </button>
      </div>

      {events.length === 0 ? (
        <div className="rounded-lg border border-dashed border-line px-3 py-6 text-center">
          <p className="text-[12px] text-text-3">No upcoming events</p>
          <button
            type="button"
            onClick={onAdd}
            className="mt-2 text-[11px] uppercase tracking-[0.1em] text-text-2 transition-colors hover:text-text"
          >
            Add Event
          </button>
        </div>
      ) : (
        <ul className="flex flex-col divide-y divide-line-soft">
          {events.map((event) => {
            const month = Number(event.date.slice(5, 7));
            const day = Number(event.date.slice(8, 10));
            return (
              <li key={event.id}>
                <button
                  type="button"
                  onClick={() => onSelect(event)}
                  className="flex w-full items-center gap-3 py-3 text-left transition-colors hover:bg-surface-2/60"
                >
                  <span className="flex w-[34px] shrink-0 flex-col items-center">
                    <span className="text-[20px] font-semibold leading-none text-text">
                      {String(day).padStart(2, '0')}
                    </span>
                    <span className="mt-1 text-[9px] uppercase tracking-[0.1em] text-text-3">
                      {monthAbbreviation(month)}
                    </span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] text-text">{event.title}</span>
                    <span className="block text-[10px] uppercase tracking-[0.08em] text-text-3">
                      {eventTypeLabel(event.type)}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
