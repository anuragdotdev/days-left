# DEADLINE.

A minimal personal planning dashboard for the Chrome new tab: a yearly calendar, an
upcoming-events sidebar and a persistent todo list, with a countdown in the header.

Built with React 19, TypeScript, Vite, Tailwind CSS v4 and Lucide icons. Manifest V3,
`chrome.storage.local` only — no backend, no accounts, works offline.

## Features

**Header** — `DEADLINE.` wordmark, a live countdown line (`50 DAYS LEFT UNTIL YEAR END`)
and a settings button. The countdown target defaults to December 31 of the current year
and rolls forward to the next year end once it passes.

**Yearly calendar** — all 12 months at once in a 3-column grid. Correct month lengths,
leap years and weekday offsets. Previous/next year navigation and a `Today` action.
Clicking a date opens a popover with that date's events.

| State | Appearance |
|---|---|
| Today | solid white cell, black text |
| Event date | restrained amber cell |
| Past date | muted grey with strikethrough |
| Selected date | subtle outline |

Past dates that contain an event keep their amber marker while staying struck through.

**Upcoming events** — chronological list of today-and-later events with the day number,
month abbreviation, title and type. Events can also be created, edited and deleted from
the calendar popover. Past events stay reachable through the calendar.

Event types: Assignment, Examination, Presentation, Project, Personal, Other.

**Todo list** — add, edit, complete, undo and delete tasks, each with an optional priority
and due date. Three views:

- **Today** — overdue, due today and undated tasks (the default).
- **Pending** — every incomplete task.
- **Completed** — completed task history.

Tasks never disappear automatically. An overdue task stays pending until you complete or
delete it, and everything persists across browser restarts.

**Settings** — countdown label and target date, week start (Monday/Sunday), theme
(dark/light), JSON export, JSON import and a confirmed reset-all.

## Keyboard

| Key | Action |
|---|---|
| Arrow keys | Move between calendar days |
| Enter / Space | Open the events popover for the focused day |
| Escape | Close the popover or dialog |
| Tab | Move between controls (dialogs trap focus) |

## Development

```bash
npm install
npm run dev        # dev server
npm run typecheck  # tsc --noEmit
npm test           # vitest (dates, storage, migration, countdown)
npm run build      # typecheck + production build into dist/
```

### Loading the extension

1. `npm run build`
2. Open `chrome://extensions`
3. Enable **Developer mode**
4. Choose **Load unpacked** and select the `dist/` folder
5. Open a new tab

## Project layout

```
src/
├─ components/
│  ├─ Calendar/       YearlyCalendar, MonthGrid, DateCell
│  ├─ Todo/           TodoList, TaskModal
│  ├─ UpcomingEvents/ UpcomingEvents
│  ├─ EventModal/     EventModal
│  ├─ DatePopover/    DatePopover
│  ├─ Settings/       SettingsModal
│  ├─ Celebration/    Celebration (confetti)
│  ├─ Header/         Header
│  └─ ui/             Modal, Field
├─ hooks/             useAppData, useToday
├─ pages/             NewTab
├─ services/          storage, migrate, countdown
├─ types/             EventItem, TodoItem, Settings, AppData
└─ utils/             dates, id, transfer
```

## Data

Everything lives under a single `chrome.storage.local` key, `deadline:data`:

```json
{
  "version": 1,
  "settings": {
    "countdownTarget": "2026-12-31",
    "countdownLabel": "year end",
    "weekStartsOn": "monday",
    "theme": "dark"
  },
  "events": [],
  "tasks": []
}
```

Writes are atomic and serialised, so concurrent edits never clobber each other. Missing
or malformed data is repaired on load rather than crashing the app. Use **Export JSON**
in settings for backups.

### Date handling

Date-only values are always `YYYY-MM-DD` strings handled with local-calendar utilities in
`src/utils/dates.ts`. The app never calls `new Date('YYYY-MM-DD')` (which parses as UTC)
nor `toISOString()` to derive "today" (which shifts by timezone) — both of which caused
off-by-one-day bugs in the previous version of this extension.

## Verification scripts

```bash
node scripts/verify.mjs             # UI + interaction checks against a dev server
node scripts/verify-extension.mjs   # checks against the real extension (chrome.storage)
node scripts/screenshot.mjs out.png # renders the dashboard to a PNG
```

These drive Chrome through the DevTools Protocol and are development aids, not part of
the extension bundle.
