export type EventType =
  | 'assignment'
  | 'examination'
  | 'presentation'
  | 'project'
  | 'personal'
  | 'other';

export type Priority = 'low' | 'medium' | 'high';

export type WeekStart = 'monday' | 'sunday';

export type Theme = 'dark' | 'light';

/** A date-only value in local calendar form: `YYYY-MM-DD`. */
export type DateString = string;

export interface EventItem {
  id: string;
  title: string;
  /** Local calendar date, `YYYY-MM-DD`. */
  date: DateString;
  description?: string;
  type: EventType;
  /** ISO timestamp, used for ordering only. */
  createdAt: string;
  updatedAt: string;
}

export interface TodoItem {
  id: string;
  title: string;
  completed: boolean;
  priority?: Priority;
  /** Local calendar date, `YYYY-MM-DD`. */
  dueDate?: DateString;
  createdAt: string;
  completedAt?: string;
  updatedAt: string;
}

export interface Settings {
  /** Local calendar date, `YYYY-MM-DD`. */
  countdownTarget: DateString;
  countdownLabel: string;
  weekStartsOn: WeekStart;
  theme: Theme;
}

export interface AppData {
  version: number;
  settings: Settings;
  events: EventItem[];
  tasks: TodoItem[];
}

export const EVENT_TYPES: { value: EventType; label: string }[] = [
  { value: 'assignment', label: 'Assignment' },
  { value: 'examination', label: 'Examination' },
  { value: 'presentation', label: 'Presentation' },
  { value: 'project', label: 'Project' },
  { value: 'personal', label: 'Personal' },
  { value: 'other', label: 'Other' },
];

export const PRIORITIES: { value: Priority; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

export function eventTypeLabel(type: EventType): string {
  return EVENT_TYPES.find((t) => t.value === type)?.label ?? 'Other';
}
