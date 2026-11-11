import { Check, Pencil, Plus, Trash2 } from 'lucide-react';
import type { Priority, TodoItem } from '../../types';
import { formatLongDate } from '../../utils/dates';

export type TodoFilter = 'today' | 'pending' | 'completed';

interface TodoListProps {
  tasks: TodoItem[];
  /** Every task, used for the overall progress counter. */
  allTasks: TodoItem[];
  today: string;
  filter: TodoFilter;
  onFilterChange: (filter: TodoFilter) => void;
  onAdd: () => void;
  onToggle: (task: TodoItem) => void;
  onEdit: (task: TodoItem) => void;
  onDelete: (task: TodoItem) => void;
}

const PRIORITY_DOT: Record<Priority, string> = {
  high: 'bg-amber',
  medium: 'bg-text-2',
  low: 'bg-text-3',
};

const FILTERS: { key: TodoFilter; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'pending', label: 'Pending' },
  { key: 'completed', label: 'Completed' },
];

export function TodoList({
  tasks,
  allTasks,
  today,
  filter,
  onFilterChange,
  onAdd,
  onToggle,
  onEdit,
  onDelete,
}: TodoListProps) {
  const completedCount = allTasks.filter((t) => t.completed).length;
  const totalCount = allTasks.length;

  return (
    <section aria-labelledby="todo-heading" className="min-w-0">
      <div className="mb-2 flex items-center justify-between">
        <h2
          id="todo-heading"
          className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-2"
        >
          To Do
        </h2>
        {totalCount > 0 ? (
          <span className="text-[10px] tracking-[0.08em] text-text-3">
            {completedCount}/{totalCount}
          </span>
        ) : null}
      </div>

      <div role="tablist" aria-label="Task views" className="mb-2 flex gap-1">
        {FILTERS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={filter === tab.key}
            onClick={() => onFilterChange(tab.key)}
            className={[
              'rounded-md px-1.5 py-0.5 text-[10px] uppercase tracking-[0.1em] transition-colors',
              filter === tab.key ? 'text-text' : 'text-text-3 hover:text-text-2',
            ].join(' ')}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {tasks.length === 0 ? (
        <div className="rounded-lg border border-dashed border-line px-3 py-6 text-center">
          <p className="text-[12px] text-text-3">
            {filter === 'completed' ? 'No completed tasks' : 'Nothing here yet'}
          </p>
        </div>
      ) : (
        <ul className="flex flex-col divide-y divide-line-soft">
          {tasks.map((task) => {
            const overdue = !task.completed && task.dueDate !== undefined && task.dueDate < today;
            return (
              <li key={task.id} className="group flex items-start gap-2.5 py-2.5">
                <button
                  type="button"
                  onClick={() => onToggle(task)}
                  aria-label={
                    task.completed ? `Mark "${task.title}" as not done` : `Mark "${task.title}" as done`
                  }
                  aria-pressed={task.completed}
                  className="mt-[1px] flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-line transition-colors hover:border-text-2"
                >
                  {task.completed ? (
                    <Check size={11} strokeWidth={2.5} className="text-done" aria-hidden="true" />
                  ) : null}
                </button>

                <div className="min-w-0 flex-1">
                  <p
                    className={[
                      'truncate text-[13px]',
                      task.completed ? 'text-text-3 line-through' : 'text-text',
                    ].join(' ')}
                  >
                    {task.title}
                  </p>
                  {(task.dueDate || task.priority) && (
                    <p className="mt-0.5 flex items-center gap-2 text-[10px] uppercase tracking-[0.08em]">
                      {task.priority ? (
                        <span className="flex items-center gap-1 text-text-3">
                          <span
                            aria-hidden="true"
                            className={`h-[5px] w-[5px] rounded-full ${PRIORITY_DOT[task.priority]}`}
                          />
                          {task.priority}
                        </span>
                      ) : null}
                      {task.dueDate ? (
                        <span className={overdue ? 'text-amber' : 'text-text-3'}>
                          {overdue ? 'Overdue · ' : 'Due '}
                          {formatLongDate(task.dueDate)}
                        </span>
                      ) : null}
                    </p>
                  )}
                </div>

                <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
                  <button
                    type="button"
                    onClick={() => onEdit(task)}
                    aria-label={`Edit ${task.title}`}
                    className="flex h-6 w-6 items-center justify-center rounded-md text-text-3 transition-colors hover:bg-surface-2 hover:text-text"
                  >
                    <Pencil size={12} strokeWidth={1.5} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(task)}
                    aria-label={`Delete ${task.title}`}
                    className="flex h-6 w-6 items-center justify-center rounded-md text-text-3 transition-colors hover:bg-surface-2 hover:text-danger"
                  >
                    <Trash2 size={12} strokeWidth={1.5} aria-hidden="true" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <button
        type="button"
        onClick={onAdd}
        className="mt-1 flex w-full items-center gap-1.5 rounded-md px-1 py-2 text-[11px] uppercase tracking-[0.1em] text-text-2 transition-colors hover:bg-surface-2 hover:text-text"
      >
        <Plus size={12} strokeWidth={1.5} aria-hidden="true" />
        Add task
      </button>
    </section>
  );
}
