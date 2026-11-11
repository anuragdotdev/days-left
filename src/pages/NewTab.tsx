import { useCallback, useEffect, useMemo, useState } from 'react';
import { Header } from '../components/Header/Header';
import { YearlyCalendar } from '../components/Calendar/YearlyCalendar';
import { UpcomingEvents } from '../components/UpcomingEvents/UpcomingEvents';
import { TodoList, type TodoFilter } from '../components/Todo/TodoList';
import { EventModal, type EventDraft } from '../components/EventModal/EventModal';
import { TaskModal, type TaskDraft } from '../components/Todo/TaskModal';
import { SettingsModal } from '../components/Settings/SettingsModal';
import { DatePopover } from '../components/DatePopover/DatePopover';
import { Celebration } from '../components/Celebration/Celebration';
import { useAppData } from '../hooks/useAppData';
import { useToday } from '../hooks/useToday';
import type { EventItem, TodoItem } from '../types';
import { createId } from '../utils/id';
import { toDateString } from '../utils/dates';

export function NewTab() {
  const { data, loading, setEvents, setTasks, updateSettings, resetAll, importData } = useAppData();
  const today = useToday();

  const [calendarYear, setCalendarYear] = useState(() => Number(today.slice(0, 4)));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [popoverAnchor, setPopoverAnchor] = useState<HTMLElement | null>(null);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventItem | null>(null);
  const [eventDefaultDate, setEventDefaultDate] = useState<string | null>(null);

  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TodoItem | null>(null);

  const [todoFilter, setTodoFilter] = useState<TodoFilter>('today');

  // Theme is applied to the document root so the CSS variables cascade.
  useEffect(() => {
    document.documentElement.dataset.theme = data.settings.theme;
  }, [data.settings.theme]);

  const eventDates = useMemo(
    () => new Set(data.events.map((event) => event.date)),
    [data.events],
  );

  const eventsByDate = useMemo(() => {
    const map = new Map<string, EventItem[]>();
    for (const event of data.events) {
      const list = map.get(event.date);
      if (list) list.push(event);
      else map.set(event.date, [event]);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    }
    return map;
  }, [data.events]);

  const upcomingEvents = useMemo(
    () =>
      data.events
        .filter((event) => event.date >= today)
        .sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt)),
    [data.events, today],
  );

  const visibleTasks = useMemo(() => {
    const pending = data.tasks.filter((task) => !task.completed);
    if (todoFilter === 'completed') {
      return data.tasks
        .filter((task) => task.completed)
        .sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''));
    }
    if (todoFilter === 'pending') {
      return [...pending].sort((a, b) => {
        const aDue = a.dueDate ?? '9999-12-31';
        const bDue = b.dueDate ?? '9999-12-31';
        return aDue.localeCompare(bDue) || a.createdAt.localeCompare(b.createdAt);
      });
    }
    // Today view: overdue + due today + tasks without a due date.
    // Completed tasks stay in place (struck through) so the day's list reads
    // as a single list of what was on the plate.
    return data.tasks
      .filter((task) => task.dueDate === undefined || task.dueDate <= today)
      .sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        const aDue = a.dueDate ?? '9999-12-31';
        const bDue = b.dueDate ?? '9999-12-31';
        return aDue.localeCompare(bDue) || a.createdAt.localeCompare(b.createdAt);
      });
  }, [data.tasks, todoFilter, today]);

  const handleSelectDate = useCallback((date: Date, anchor: HTMLElement) => {
    setSelectedDate(toDateString(date));
    setPopoverAnchor(anchor);
    setPopoverOpen(true);
  }, []);

  /** Keyboard navigation only moves the selection; the popover stays closed. */
  const handleFocusDate = useCallback((date: Date) => {
    setSelectedDate(toDateString(date));
  }, []);

  /** The "Today" action returns to the current year and selects today. */
  const handleToday = useCallback(
    (year: number) => {
      setCalendarYear(year);
      setSelectedDate(today);
      setPopoverOpen(false);
    },
    [today],
  );

  const handleYearChange = useCallback((year: number) => {
    setCalendarYear(year);
  }, []);

  const openNewEvent = useCallback(
    (date?: string) => {
      setEditingEvent(null);
      setEventDefaultDate(date ?? today);
      setEventModalOpen(true);
      setPopoverOpen(false);
    },
    [today],
  );

  const openEditEvent = useCallback((event: EventItem) => {
    setEditingEvent(event);
    setEventDefaultDate(event.date);
    setEventModalOpen(true);
    setPopoverOpen(false);
  }, []);

  const handleSaveEvent = useCallback(
    async (draft: EventDraft) => {
      const now = new Date().toISOString();
      const existing = draft.id ? data.events.find((e) => e.id === draft.id) : undefined;
      const event: EventItem = {
        id: draft.id ?? createId(),
        title: draft.title,
        date: draft.date,
        description: draft.description || undefined,
        type: draft.type,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      };
      await setEvents((events) => {
        const index = events.findIndex((e) => e.id === event.id);
        if (index >= 0) {
          const next = [...events];
          next[index] = event;
          return next;
        }
        return [...events, event];
      });
      setEventModalOpen(false);
      setEditingEvent(null);
      setSelectedDate(event.date);
    },
    [data.events, setEvents],
  );

  const handleDeleteEvent = useCallback(
    async (event: EventItem) => {
      if (!window.confirm(`Delete "${event.title}"?`)) return;
      await setEvents((events) => events.filter((e) => e.id !== event.id));
    },
    [setEvents],
  );

  const openNewTask = useCallback(() => {
    setEditingTask(null);
    setTaskModalOpen(true);
  }, []);

  const openEditTask = useCallback((task: TodoItem) => {
    setEditingTask(task);
    setTaskModalOpen(true);
  }, []);

  const handleSaveTask = useCallback(
    async (draft: TaskDraft) => {
      const now = new Date().toISOString();
      const existing = draft.id ? data.tasks.find((t) => t.id === draft.id) : undefined;
      const task: TodoItem = {
        id: draft.id ?? createId(),
        title: draft.title,
        completed: existing?.completed ?? false,
        priority: draft.priority,
        dueDate: draft.dueDate,
        createdAt: existing?.createdAt ?? now,
        completedAt: existing?.completedAt,
        updatedAt: now,
      };
      await setTasks((tasks) => {
        const index = tasks.findIndex((t) => t.id === task.id);
        if (index >= 0) {
          const next = [...tasks];
          next[index] = task;
          return next;
        }
        return [...tasks, task];
      });
      setTaskModalOpen(false);
      setEditingTask(null);
    },
    [data.tasks, setTasks],
  );

  const handleToggleTask = useCallback(
    async (task: TodoItem) => {
      const now = new Date().toISOString();
      const next: TodoItem = {
        ...task,
        completed: !task.completed,
        completedAt: !task.completed ? now : undefined,
        updatedAt: now,
      };
      await setTasks((tasks) => tasks.map((t) => (t.id === task.id ? next : t)));
    },
    [setTasks],
  );

  const handleDeleteTask = useCallback(
    async (task: TodoItem) => {
      if (!window.confirm(`Delete "${task.title}"?`)) return;
      await setTasks((tasks) => tasks.filter((t) => t.id !== task.id));
    },
    [setTasks],
  );

  const handleReset = useCallback(async () => {
    await resetAll();
    setSelectedDate(null);
    setPopoverOpen(false);
  }, [resetAll]);

  return (
    <div className="min-h-full bg-bg text-text">
      <Header settings={data.settings} today={today} onOpenSettings={() => setSettingsOpen(true)} />

      <main className="mx-auto w-full max-w-[1440px] px-6 pb-16 pt-8 lg:px-10">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-10">
          <div className="relative min-w-0">
            {loading ? (
              <p className="py-16 text-center text-[12px] text-text-3">Loading…</p>
            ) : (
              <YearlyCalendar
                year={calendarYear}
                weekStartsOn={data.settings.weekStartsOn}
                today={today}
                selectedDate={selectedDate}
                eventDates={eventDates}
                onYearChange={handleYearChange}
                onSelectDate={handleSelectDate}
                onFocusDate={handleFocusDate}
                onToday={handleToday}
              />
            )}

            {popoverOpen && selectedDate ? (
              <DatePopover
                open={popoverOpen}
                date={selectedDate}
                events={eventsByDate.get(selectedDate) ?? []}
                anchor={popoverAnchor}
                onClose={() => setPopoverOpen(false)}
                onAdd={(date) => openNewEvent(date)}
                onEdit={openEditEvent}
                onDelete={(event) => void handleDeleteEvent(event)}
              />
            ) : null}
          </div>

          <aside className="flex min-w-0 flex-col gap-8">
            <UpcomingEvents
              events={upcomingEvents}
              onAdd={() => openNewEvent()}
              onSelect={openEditEvent}
            />

            <div className="border-t border-line-soft pt-6">
              <TodoList
                tasks={visibleTasks}
                allTasks={data.tasks}
                today={today}
                filter={todoFilter}
                onFilterChange={setTodoFilter}
                onAdd={openNewTask}
                onToggle={(task) => void handleToggleTask(task)}
                onEdit={openEditTask}
                onDelete={(task) => void handleDeleteTask(task)}
              />
            </div>
          </aside>
        </div>
      </main>

      <EventModal
        open={eventModalOpen}
        event={editingEvent}
        defaultDate={eventDefaultDate}
        today={today}
        onClose={() => {
          setEventModalOpen(false);
          setEditingEvent(null);
        }}
        onSave={(draft) => void handleSaveEvent(draft)}
      />

      <TaskModal
        open={taskModalOpen}
        task={editingTask}
        today={today}
        onClose={() => {
          setTaskModalOpen(false);
          setEditingTask(null);
        }}
        onSave={(draft) => void handleSaveTask(draft)}
      />

      <SettingsModal
        open={settingsOpen}
        settings={data.settings}
        data={data}
        onClose={() => setSettingsOpen(false)}
        onSave={(patch) => void updateSettings(patch)}
        onImport={(incoming) => void importData(incoming)}
        onReset={() => void handleReset()}
      />

      <Celebration settings={data.settings} today={today} />
    </div>
  );
}
