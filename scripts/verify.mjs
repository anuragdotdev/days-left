/**
 * Headless verification driver using the Chrome DevTools Protocol.
 * Usage: node scripts/verify.mjs [url]
 */
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

const URL = process.argv[2] ?? 'http://localhost:4173';
const PORT = 9333;

const chrome = spawn(
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  [
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    '--no-first-run',
    '--no-default-browser-check',
    `--remote-debugging-port=${PORT}`,
    '--user-data-dir=C:/Users/hp/AppData/Local/Temp/opencode/cdp-profile',
    'about:blank',
  ],
  { stdio: 'ignore' },
);

process.on('exit', () => chrome.kill());

async function waitForTarget() {
  for (let i = 0; i < 60; i += 1) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/list`);
      const list = await res.json();
      const page = list.find((t) => t.type === 'page');
      if (page) return page;
    } catch {
      /* not ready */
    }
    await sleep(250);
  }
  throw new Error('Chrome DevTools endpoint never became available');
}

const target = await waitForTarget();
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  ws.addEventListener('open', resolve, { once: true });
  ws.addEventListener('error', reject, { once: true });
});

let nextId = 1;
const pending = new Map();
ws.addEventListener('message', (event) => {
  const msg = JSON.parse(event.data);
  if (msg.id && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    if (msg.error) reject(new Error(JSON.stringify(msg.error)));
    else resolve(msg.result);
  }
});

function send(method, params = {}) {
  const id = nextId++;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
}

async function evaluate(expression) {
  const result = await send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.exception?.description ?? 'evaluation failed');
  }
  return result.result.value;
}

await send('Page.enable');
await send('Runtime.enable');
await send('Log.enable');

const consoleErrors = [];
ws.addEventListener('message', (event) => {
  const msg = JSON.parse(event.data);
  if (msg.method === 'Log.entryAdded' && msg.params.entry.level === 'error') {
    consoleErrors.push(msg.params.entry.text);
  }
  if (msg.method === 'Runtime.exceptionThrown') {
    consoleErrors.push(msg.params.exceptionDetails.exception?.description ?? 'exception');
  }
});

await send('Page.navigate', { url: URL });
await sleep(2500);

// Helpers injected into the page.
const HELPERS = `
  window.__dl = {
    byText(scope, text) {
      return [...scope.querySelectorAll('button')].find(b => b.textContent.trim() === text);
    },
    setInput(el, value) {
      const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement : HTMLInputElement;
      const setter = Object.getOwnPropertyDescriptor(proto.prototype, 'value').set;
      setter.call(el, value);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    },
    wait(ms) { return new Promise(r => setTimeout(r, ms)); },
  };
`;

const report = {};

await evaluate(HELPERS);

report.header = await evaluate(`(() => ({
  brand: document.querySelector('h1')?.textContent,
  countdown: document.querySelector('[aria-live="polite"]')?.textContent,
}))()`);

report.calendar = await evaluate(`(() => ({
  months: document.querySelectorAll('section[aria-label$="2026"]').length,
  dayCells: document.querySelectorAll('button[data-date]').length,
}))()`);

report.dateStates = await evaluate(`(() => {
  const read = (date) => {
    const el = document.querySelector('button[data-date="' + date + '"]');
    if (!el) return null;
    const cs = getComputedStyle(el);
    return {
      date,
      color: cs.color,
      bg: cs.backgroundColor,
      decoration: cs.textDecorationLine,
    };
  };
  const todayEl = document.querySelector('button[aria-current="date"]');
  return {
    today: todayEl ? {
      date: todayEl.dataset.date,
      color: getComputedStyle(todayEl).color,
      bg: getComputedStyle(todayEl).backgroundColor,
    } : null,
    past: read('2026-01-05'),
    future: read('2026-12-25'),
    adjacent: read('2025-12-29'),
  };
})()`);

// --- click a date -> popover ---
report.popover = await evaluate(`(async () => {
  document.querySelector('button[data-date="2026-12-04"]').click();
  await window.__dl.wait(300);
  const dialog = document.querySelector('[role="dialog"][aria-label^="Events on"]');
  return {
    opened: !!dialog,
    label: dialog?.getAttribute('aria-label') ?? null,
    emptyState: dialog?.textContent?.includes('No events on this date') ?? false,
  };
})()`);

// --- create an event via the modal ---
report.createEvent = await evaluate(`(async () => {
  const popover = document.querySelector('[role="dialog"][aria-label^="Events on"]');
  window.__dl.byText(popover, 'Add event').click();
  await window.__dl.wait(300);
  const modal = document.querySelector('[role="dialog"][aria-label="New Event"]');
  if (!modal) return { ok: false, reason: 'event modal did not open' };
  window.__dl.setInput(modal.querySelector('#event-title'), 'Headless Event');
  window.__dl.setInput(modal.querySelector('#event-date'), '2026-12-04');
  await window.__dl.wait(100);
  window.__dl.byText(modal, 'Add Event').click();
  await window.__dl.wait(500);
  const cell = document.querySelector('button[data-date="2026-12-04"]');
  const markerBackground = getComputedStyle(cell).backgroundColor;
  const hasMarker = markerBackground !== 'rgba(0, 0, 0, 0)';
  const upcoming = document.querySelector('aside')?.textContent ?? '';
  return {
    ok: hasMarker && upcoming.includes('Headless Event'),
    hasMarker,
    markerBackground,
    upcomingMentionsEvent: upcoming.includes('Headless Event'),
    modalClosed: !document.querySelector('[role="dialog"][aria-label="New Event"]'),
  };
})()`);

// --- create a second event on the same date ---
report.secondEventSameDate = await evaluate(`(async () => {
  document.querySelector('button[data-date="2026-12-04"]').click();
  await window.__dl.wait(250);
  const popover = document.querySelector('[role="dialog"][aria-label^="Events on"]');
  window.__dl.byText(popover, 'Add event').click();
  await window.__dl.wait(300);
  const modal = document.querySelector('[role="dialog"][aria-label="New Event"]');
  window.__dl.setInput(modal.querySelector('#event-title'), 'Second Event');
  window.__dl.setInput(modal.querySelector('#event-date'), '2026-12-04');
  await window.__dl.wait(100);
  window.__dl.byText(modal, 'Add Event').click();
  await window.__dl.wait(500);
  document.querySelector('button[data-date="2026-12-04"]').click();
  await window.__dl.wait(250);
  const popover2 = document.querySelector('[role="dialog"][aria-label^="Events on"]');
  return {
    count: popover2 ? popover2.querySelectorAll('li').length : 0,
    listsBoth:
      popover2?.textContent.includes('Headless Event') &&
      popover2?.textContent.includes('Second Event'),
  };
})()`);

// --- past event is excluded from Upcoming but visible in the calendar ---
report.pastEventHandling = await evaluate(`(async () => {
  document.querySelector('button[data-date="2026-12-04"]').click();
  await window.__dl.wait(200);
  const popover = document.querySelector('[role="dialog"][aria-label^="Events on"]');
  // Edit the first event in the popover ("Headless Event") to a past date.
  const editBtn = popover.querySelector('button[aria-label^="Edit"]');
  const editedName = editBtn.getAttribute('aria-label').replace('Edit ', '');
  editBtn.click();
  await window.__dl.wait(300);
  const modal = document.querySelector('[role="dialog"][aria-label="Edit Event"]');
  window.__dl.setInput(modal.querySelector('#event-date'), '2026-01-15');
  await window.__dl.wait(100);
  window.__dl.byText(modal, 'Save').click();
  await window.__dl.wait(500);
  const upcoming = document.querySelector('aside')?.textContent ?? '';
  const pastCell = document.querySelector('button[data-date="2026-01-15"]');
  return {
    editedName,
    removedFromUpcoming: !upcoming.includes(editedName),
    stillHasEventCell: getComputedStyle(pastCell).backgroundColor !== 'rgba(0, 0, 0, 0)',
    pastCellStrikethrough: getComputedStyle(pastCell).textDecorationLine,
    remainingUpcoming: (upcoming.match(/DEC/g) || []).length,
  };
})()`);

// --- todo: create, complete, filter ---
report.todos = await evaluate(`(async () => {
  const aside = document.querySelector('aside');
  window.__dl.byText(aside, 'Add task').click();
  await window.__dl.wait(300);
  const modal = document.querySelector('[role="dialog"][aria-label="New Task"]');
  window.__dl.setInput(modal.querySelector('#task-title'), 'Headless Task');
  window.__dl.setInput(modal.querySelector('#task-due'), '2026-01-05');
  await window.__dl.wait(100);
  window.__dl.byText(modal, 'Add Task').click();
  await window.__dl.wait(500);

  const asideAfter = document.querySelector('aside');
  const inToday = asideAfter.textContent.includes('Headless Task');
  const overdueLabel = /overdue/i.test(asideAfter.textContent);

  // switch to Pending
  const pendingTab = [...asideAfter.querySelectorAll('button')].find(b => b.textContent.trim() === 'Pending');
  pendingTab.click();
  await window.__dl.wait(200);
  const inPending = document.querySelector('aside').textContent.includes('Headless Task');

  // complete it
  const toggle = document.querySelector('aside button[aria-label^="Mark"]');
  toggle.click();
  await window.__dl.wait(400);
  const completedTab = [...document.querySelectorAll('aside button')].find(b => b.textContent.trim() === 'Completed');
  completedTab.click();
  await window.__dl.wait(300);
  const inCompleted = document.querySelector('aside').textContent.includes('Headless Task');

  return { inToday, overdueLabel, inPending, inCompleted };
})()`);

// --- keyboard navigation in the calendar ---
report.keyboard = await evaluate(`(async () => {
  const todayCell = document.querySelector('button[aria-current="date"]');
  todayCell.focus();
  const startDate = todayCell.dataset.date;
  const press = (key) => {
    const ev = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
    document.activeElement.dispatchEvent(ev);
  };
  press('ArrowRight');
  await window.__dl.wait(250);
  const afterRight = document.activeElement?.dataset?.date ?? null;
  press('ArrowDown');
  await window.__dl.wait(250);
  const afterDown = document.activeElement?.dataset?.date ?? null;
  const popoverOpen = !!document.querySelector('[role="dialog"][aria-label^="Events on"]');
  return { startDate, afterRight, afterDown, popoverOpenAfterArrows: popoverOpen };
})()`);

// --- settings: change week start, verify the calendar re-renders ---
report.settings = await evaluate(`(async () => {
  document.querySelector('button[aria-label="Open settings"]').click();
  await window.__dl.wait(300);
  const modal = document.querySelector('[role="dialog"][aria-label="Settings"]');
  const presence = {
    opened: !!modal,
    hasExport: modal.textContent.includes('Export JSON'),
    hasImport: modal.textContent.includes('Import JSON'),
    hasReset: modal.textContent.includes('Reset all data'),
    hasWeekStart: modal.textContent.includes('Week starts on'),
    hasTheme: modal.textContent.includes('Theme'),
  };
  const sunday = [...modal.querySelectorAll('[role="radio"]')].find(b => b.textContent.trim() === 'Sunday');
  sunday.click();
  await window.__dl.wait(100);
  window.__dl.byText(modal, 'Save').click();
  await window.__dl.wait(500);
  const headers = [...document.querySelectorAll('[role="columnheader"]')].slice(0, 7).map(h => h.textContent);
  return { ...presence, firstWeekdayRow: headers };
})()`);

// --- year navigation ---
report.yearNav = await evaluate(`(async () => {
  const yearBefore = document.querySelector('h2')?.textContent;
  document.querySelector('button[aria-label="Next year"]').click();
  await window.__dl.wait(300);
  const yearAfter = document.querySelector('h2')?.textContent;
  const monthsAfter = document.querySelectorAll('section[aria-label$="2027"]').length;
  document.querySelector('button[aria-label="Previous year"]').click();
  await window.__dl.wait(300);
  const yearBack = document.querySelector('h2')?.textContent;
  document.querySelector('button[aria-label="Previous year"]').click();
  await window.__dl.wait(300);
  const yearPrev = document.querySelector('h2')?.textContent;
  const todayBtn = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Today');
  todayBtn.click();
  await window.__dl.wait(300);
  const yearToday = document.querySelector('h2')?.textContent;
  return { yearBefore, yearAfter, monthsAfter, yearBack, yearPrev, yearToday };
})()`);

// --- persistence: reload and confirm data survives ---
// NOTE: this runs against a plain web page where `chrome.storage` is absent,
// so the storage service falls back to its in-memory cache and data is
// expected to be lost on reload. Real persistence is covered by
// scripts/verify-extension.mjs, which runs inside the real extension.
const beforeReload = await evaluate(`(() => {
  const aside = document.querySelector('aside')?.textContent ?? '';
  return {
    hasEvent: aside.includes('Second Event'),
    hasTask: aside.includes('Headless Task'),
    storageAvailable: typeof chrome !== 'undefined' && !!chrome.storage,
  };
})()`);

await send('Page.navigate', { url: URL });
await sleep(2500);
await evaluate(HELPERS);

const afterReload = await evaluate(`(() => {
  const aside = document.querySelector('aside')?.textContent ?? '';
  return {
    hasEvent: aside.includes('Second Event'),
    hasTask: aside.includes('Headless Task'),
  };
})()`);

report.persistence = { beforeReload, afterReload };

report.consoleErrors = consoleErrors;

console.log(JSON.stringify(report, null, 2));

ws.close();
chrome.kill();
process.exit(0);
