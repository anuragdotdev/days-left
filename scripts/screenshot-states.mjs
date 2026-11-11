/**
 * Captures screenshots of interactive states (popover, modals) for review.
 * Usage: node scripts/screenshot-states.mjs [outDir]
 */
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { writeFileSync, rmSync, existsSync } from 'node:fs';

const DIST = 'C:/Users/hp/Desktop/projects/days-left/dist';
const OUT_DIR = process.argv[2] ?? 'C:/Users/hp/AppData/Local/Temp/opencode/states';
const PROFILE = 'C:/Users/hp/AppData/Local/Temp/opencode/states-profile';
const PORT = 9375;

if (!existsSync(`${DIST}/manifest.json`)) {
  console.error('Run "npm run build" first.');
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
    '--window-size=1440,900',
    '--window-position=-3000,-3000',
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${PROFILE}`,
    'about:blank',
  ],
  { stdio: 'ignore' },
);
process.on('exit', () => chrome.kill());

await sleep(3000);

const version = await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json();
const ws = new WebSocket(version.webSocketDebuggerUrl);
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

const loaded = await send('Extensions.loadUnpacked', { path: DIST.replace(/\//g, '\\') });
const { targetId } = await send('Target.createTarget', {
  url: `chrome-extension://${loaded.id}/index.html`,
});
const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
await send('Runtime.enable', {}, sessionId);
await send('Page.enable', {}, sessionId);
await sleep(2500);

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

async function shot(name) {
  const res = await send('Page.captureScreenshot', { format: 'png' }, sessionId);
  writeFileSync(`${OUT_DIR}/${name}.png`, Buffer.from(res.data, 'base64'));
  console.log('wrote', name);
}

// Seed data.
await evaluate(`(async () => {
  const now = new Date().toISOString();
  await chrome.storage.local.set({ 'deadline:data': {
    version: 1,
    settings: { countdownTarget: '2026-12-31', countdownLabel: 'year end', weekStartsOn: 'monday', theme: 'dark' },
    events: [
      { id: 'e1', title: 'Project Presentation', date: '2026-12-04', type: 'presentation', createdAt: now, updatedAt: now },
      { id: 'e2', title: 'ML Assignment', date: '2026-12-10', type: 'assignment', createdAt: now, updatedAt: now },
    ],
    tasks: [
      { id: 't1', title: 'Solve DSA problems', completed: true, priority: 'high', dueDate: '2026-11-11', createdAt: now, completedAt: now, updatedAt: now },
      { id: 't2', title: 'Finish ML assignment', completed: false, priority: 'medium', dueDate: '2026-11-11', createdAt: now, updatedAt: now },
    ],
  }});
  location.reload();
})()`);
await sleep(2500);

// Date popover.
await evaluate(`(async () => {
  document.querySelector('button[data-date="2026-12-04"]').click();
  await new Promise(r => setTimeout(r, 400));
})()`);
await shot('01-date-popover');

// Event modal.
await evaluate(`(async () => {
  const popover = document.querySelector('[role="dialog"][aria-label^="Events on"]');
  [...popover.querySelectorAll('button')].find(b => b.textContent.trim() === 'Add event').click();
  await new Promise(r => setTimeout(r, 500));
})()`);
await shot('02-event-modal');

// Settings modal.
await evaluate(`(async () => {
  document.querySelector('button[aria-label="Close dialog"]').click();
  await new Promise(r => setTimeout(r, 300));
  document.querySelector('button[aria-label="Open settings"]').click();
  await new Promise(r => setTimeout(r, 500));
})()`);
await shot('03-settings-modal');

// Light theme.
await evaluate(`(async () => {
  document.querySelector('button[aria-label="Close dialog"]').click();
  await new Promise(r => setTimeout(r, 300));
  const stored = await chrome.storage.local.get('deadline:data');
  const d = stored['deadline:data'];
  d.settings.theme = 'light';
  await chrome.storage.local.set({ 'deadline:data': d });
  location.reload();
})()`);
await sleep(2500);
await shot('04-light-theme');

ws.close();
chrome.kill();
process.exit(0);
