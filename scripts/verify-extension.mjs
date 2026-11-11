/**
 * Verifies the built extension running as a real unpacked Chrome extension,
 * where `chrome.storage.local` is available.
 *
 * Usage: node scripts/verify-extension.mjs [distDir]
 */
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { existsSync, rmSync } from 'node:fs';

const DIST = process.argv[2] ?? 'C:/Users/hp/Desktop/projects/days-left/dist';
const PROFILE = 'C:/Users/hp/AppData/Local/Temp/opencode/ext-profile';
const PORT = 9340;

if (!existsSync(`${DIST}/manifest.json`)) {
  console.error(`No manifest at ${DIST}/manifest.json — run "npm run build" first.`);
  process.exit(1);
}

rmSync(PROFILE, { recursive: true, force: true });

const chrome = spawn(
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  [
    '--disable-gpu',
    '--hide-scrollbars',
    '--no-first-run',
    '--no-default-browser-check',
    '--window-position=-3000,-3000',
    '--window-size=1440,900',
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${PROFILE}`,
    'about:blank',
  ],
  { stdio: 'ignore' },
);

process.on('exit', () => chrome.kill());

async function fetchJson(path) {
  const res = await fetch(`http://127.0.0.1:${PORT}${path}`);
  return res.json();
}

async function waitForBrowser() {
  for (let i = 0; i < 80; i += 1) {
    try {
      const version = await fetchJson('/json/version');
      if (version?.webSocketDebuggerUrl) return version;
    } catch {
      /* not ready */
    }
    await sleep(250);
  }
  throw new Error('Chrome DevTools endpoint never became available');
}

const browser = await waitForBrowser();

const ws = new WebSocket(browser.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r, { once: true }));

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

function send(method, params = {}, sessionId) {
  const id = nextId++;
  const payload = { id, method, params };
  if (sessionId) payload.sessionId = sessionId;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify(payload));
  });
}

// Load the built extension.
const loaded = await send('Extensions.loadUnpacked', { path: DIST.replace(/\//g, '\\') });
const extensionId = loaded.id;
const pageUrl = `chrome-extension://${extensionId}/index.html`;

const { targetId } = await send('Target.createTarget', { url: pageUrl });
const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });

async function evaluate(expression) {
  const result = await send(
    'Runtime.evaluate',
    { expression, awaitPromise: true, returnByValue: true },
    sessionId,
  );
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.exception?.description ?? 'evaluation failed');
  }
  return result.result.value;
}

await send('Runtime.enable', {}, sessionId);
await send('Page.enable', {}, sessionId);
await send('Log.enable', {}, sessionId);

const consoleErrors = [];
ws.addEventListener('message', (event) => {
  const msg = JSON.parse(event.data);
  if (msg.sessionId !== sessionId) return;
  if (msg.method === 'Log.entryAdded' && msg.params.entry.level === 'error') {
    consoleErrors.push(msg.params.entry.text);
  }
  if (msg.method === 'Runtime.exceptionThrown') {
    consoleErrors.push(msg.params.exceptionDetails.exception?.description ?? 'exception');
  }
});

await sleep(3000);

const report = { extensionId };

report.loaded = await evaluate(`(() => ({
  hasChrome: typeof chrome !== 'undefined',
  hasStorage: !!(chrome.storage && chrome.storage.local),
  title: document.title,
  brand: document.querySelector('h1')?.textContent ?? null,
  months: document.querySelectorAll('section[aria-label$="2026"]').length,
}))()`);

report.manifest = await evaluate(`(() => {
  const m = chrome.runtime.getManifest();
  return { name: m.name, version: m.version, permissions: m.permissions, overrides: m.chrome_url_overrides };
})()`);

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
await evaluate(HELPERS);

report.create = await evaluate(`(async () => {
  document.querySelector('button[data-date="2026-12-04"]').click();
  await window.__dl.wait(300);
  const popover = document.querySelector('[role="dialog"][aria-label^="Events on"]');
  if (!popover) return { error: 'no popover' };
  window.__dl.byText(popover, 'Add event').click();
  await window.__dl.wait(400);
  const modal = document.querySelector('[role="dialog"][aria-label="New Event"]');
  if (!modal) return { error: 'no event modal' };
  window.__dl.setInput(modal.querySelector('#event-title'), 'Persisted Event');
  window.__dl.setInput(modal.querySelector('#event-date'), '2026-12-04');
  await window.__dl.wait(150);
  window.__dl.byText(modal, 'Add Event').click();
  await window.__dl.wait(700);

  const aside = document.querySelector('aside');
  window.__dl.byText(aside, 'Add task').click();
  await window.__dl.wait(400);
  const taskModal = document.querySelector('[role="dialog"][aria-label="New Task"]');
  if (!taskModal) return { error: 'no task modal' };
  window.__dl.setInput(taskModal.querySelector('#task-title'), 'Persisted Task');
  await window.__dl.wait(150);
  window.__dl.byText(taskModal, 'Add Task').click();
  await window.__dl.wait(700);

  const stored = await chrome.storage.local.get(null);
  const d = stored['deadline:data'];
  return {
    allKeys: Object.keys(stored),
    eventCount: d?.events?.length ?? -1,
    taskCount: d?.tasks?.length ?? -1,
    version: d?.version ?? null,
    settings: d?.settings ?? null,
  };
})()`);

// Reload the extension page and confirm the data survived.
await send('Page.reload', {}, sessionId);
await sleep(3000);
await evaluate(HELPERS);

report.afterReload = await evaluate(`(async () => {
  const stored = await chrome.storage.local.get('deadline:data');
  const d = stored['deadline:data'];
  const aside = document.querySelector('aside')?.textContent ?? '';
  return {
    eventCount: d?.events?.length ?? -1,
    taskCount: d?.tasks?.length ?? -1,
    eventTitle: d?.events?.[0]?.title ?? null,
    taskTitle: d?.tasks?.[0]?.title ?? null,
    eventVisibleInUi: aside.includes('Persisted Event'),
    taskVisibleInUi: aside.includes('Persisted Task'),
    legacyKeys: Object.keys(await chrome.storage.local.get(['eventName','targetDate','createdAt']))
      .filter(k => ['eventName','targetDate','createdAt'].includes(k)),
  };
})()`);

// Export / import round trip.
report.exportImport = await evaluate(`(async () => {
  const stored = await chrome.storage.local.get('deadline:data');
  const snapshot = JSON.parse(JSON.stringify(stored['deadline:data']));
  // Wipe, then restore via the import path.
  await chrome.storage.local.set({ 'deadline:data': { version: 1, settings: snapshot.settings, events: [], tasks: [] } });
  window.dispatchEvent(new Event('focus'));
  await window.__dl.wait(400);
  const afterWipe = (await chrome.storage.local.get('deadline:data'))['deadline:data'];
  await chrome.storage.local.set({ 'deadline:data': snapshot });
  window.dispatchEvent(new Event('focus'));
  await window.__dl.wait(600);
  const afterRestore = (await chrome.storage.local.get('deadline:data'))['deadline:data'];
  return {
    wipedEvents: afterWipe?.events?.length,
    restoredEvents: afterRestore?.events?.length,
    restoredTasks: afterRestore?.tasks?.length,
  };
})()`);

// Reset all data.
report.reset = await evaluate(`(async () => {
  document.querySelector('button[aria-label="Open settings"]').click();
  await window.__dl.wait(400);
  const modal = document.querySelector('[role="dialog"][aria-label="Settings"]');
  if (!modal) return { error: 'no settings modal' };
  window.__dl.byText(modal, 'Reset all data').click();
  await window.__dl.wait(300);
  window.__dl.byText(modal, 'Confirm').click();
  await window.__dl.wait(700);
  const stored = await chrome.storage.local.get('deadline:data');
  const d = stored['deadline:data'];
  return { events: d?.events?.length, tasks: d?.tasks?.length, label: d?.settings?.countdownLabel };
})()`);

report.consoleErrors = consoleErrors;

console.log(JSON.stringify(report, null, 2));

ws.close();
chrome.kill();
process.exit(0);
