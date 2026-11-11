import { useEffect, useState } from 'react';
import type { EventItem, EventType } from '../../types';
import { EVENT_TYPES } from '../../types';
import { Modal } from '../ui/Modal';
import { Field, inputClass, selectClass } from '../ui/Field';

interface EventModalProps {
  open: boolean;
  /** Event being edited; null means "create new". */
  event: EventItem | null;
  /** Pre-selected date for new events. */
  defaultDate: string | null;
  today: string;
  onClose: () => void;
  onSave: (draft: EventDraft) => void;
}

export interface EventDraft {
  id?: string;
  title: string;
  date: string;
  description: string;
  type: EventType;
}

export function EventModal({
  open,
  event,
  defaultDate,
  today,
  onClose,
  onSave,
}: EventModalProps) {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<EventType>('other');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setTitle(event?.title ?? '');
    setDate(event?.date ?? defaultDate ?? today);
    setDescription(event?.description ?? '');
    setType(event?.type ?? 'other');
    setError(null);
  }, [open, event, defaultDate, today]);

  const submit = () => {
    if (!title.trim()) {
      setError('Event name is required');
      return;
    }
    if (!date) {
      setError('Date is required');
      return;
    }
    onSave({
      id: event?.id,
      title: title.trim(),
      date,
      description: description.trim(),
      type,
    });
  };

  return (
    <Modal
      open={open}
      title={event ? 'Edit Event' : 'New Event'}
      onClose={onClose}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-line px-3 py-1.5 text-[12px] text-text-2 transition-colors hover:bg-surface-2 hover:text-text"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            className="rounded-lg bg-accent px-3 py-1.5 text-[12px] font-semibold text-bg transition-opacity hover:opacity-90"
          >
            {event ? 'Save' : 'Add Event'}
          </button>
        </>
      }
    >
      <Field label="Event name" htmlFor="event-title">
        <input
          id="event-title"
          className={inputClass}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Project Presentation"
          autoComplete="off"
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Date" htmlFor="event-date">
          <input
            id="event-date"
            type="date"
            className={inputClass}
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </Field>

        <Field label="Type" htmlFor="event-type">
          <select
            id="event-type"
            className={selectClass}
            value={type}
            onChange={(e) => setType(e.target.value as EventType)}
          >
            {EVENT_TYPES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Description (optional)" htmlFor="event-description">
        <textarea
          id="event-description"
          className={`${inputClass} min-h-[70px] resize-y`}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Notes, location, links…"
        />
      </Field>

      {error ? <p className="text-[12px] text-danger">{error}</p> : null}
    </Modal>
  );
}
