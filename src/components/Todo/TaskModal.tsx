import { useEffect, useState } from 'react';
import type { Priority, TodoItem } from '../../types';
import { PRIORITIES } from '../../types';
import { Modal } from '../ui/Modal';
import { Field, inputClass, selectClass } from '../ui/Field';

interface TaskModalProps {
  open: boolean;
  task: TodoItem | null;
  today: string;
  onClose: () => void;
  onSave: (draft: TaskDraft) => void;
}

export interface TaskDraft {
  id?: string;
  title: string;
  priority?: Priority;
  dueDate?: string;
}

export function TaskModal({ open, task, today, onClose, onSave }: TaskModalProps) {
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<Priority | ''>('');
  const [dueDate, setDueDate] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setTitle(task?.title ?? '');
    setPriority(task?.priority ?? '');
    setDueDate(task?.dueDate ?? '');
    setError(null);
  }, [open, task]);

  const submit = () => {
    if (!title.trim()) {
      setError('Task name is required');
      return;
    }
    onSave({
      id: task?.id,
      title: title.trim(),
      priority: priority === '' ? undefined : priority,
      dueDate: dueDate === '' ? undefined : dueDate,
    });
  };

  return (
    <Modal
      open={open}
      title={task ? 'Edit Task' : 'New Task'}
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
            {task ? 'Save' : 'Add Task'}
          </button>
        </>
      }
    >
      <Field label="Task" htmlFor="task-title">
        <input
          id="task-title"
          className={inputClass}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Finish ML assignment"
          autoComplete="off"
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Due date (optional)" htmlFor="task-due">
          <input
            id="task-due"
            type="date"
            className={inputClass}
            value={dueDate}
            min={today}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </Field>

        <Field label="Priority (optional)" htmlFor="task-priority">
          <select
            id="task-priority"
            className={selectClass}
            value={priority}
            onChange={(e) => setPriority(e.target.value as Priority | '')}
          >
            <option value="">None</option>
            {PRIORITIES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      {error ? <p className="text-[12px] text-danger">{error}</p> : null}
    </Modal>
  );
}
