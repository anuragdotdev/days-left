/**
 * Verifies the countdown celebration appears when the target date is today,
 * and that the countdown text is correct across boundary cases.
 *
 * Usage: node scripts/verify-celebration.mjs
 */
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { rmSync, existsSync } from 'node:fs';

const DIST = 'C:/Users/hp/Desktop/projects/days-left/dist';
const PROFILE = 'C:/Users/hp/AppData/Local/Temp/opencode/cel-profile';
const PORT = 9380;

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

const report = {};

report.default = await evaluate(`(async () => {
  const stored = await chrome.storage.local.get('deadline:data');
  const d = stored['deadline:data'];
  const now = new Date();
  const today = now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0') + '-' + String(now.getDate()).padStart(2,'0');
  return { countdownText: document.querySelector('[aria-live="polite"]')?.textContent, target: d.settings.countdownTarget, today };
})()`);

const pageUrl = `chrome-extension://${loaded.id}/index.html`;

// The app listens to `chrome.storage.onChanged`, so writing the setting
// updates the UI without a reload.

const setTarget = (offsetDays, label) => `
  (async () => {
    const stored = await chrome.storage.local.get('deadline:data');
    const d = stored['deadline:data'];
    const now = new Date();
    const t = new Date(now.getFullYear(), now.getMonth(), now.getDate() ${offsetDays});
    d.settings.countdownTarget = t.getFullYear() + '-' + String(t.getMonth()+1).padStart(2,'0') + '-' + String(t.getDate()).padStart(2,'0');
    d.settings.countdownLabel = '${label}';
    await chrome.storage.local.set({ 'deadline:data': d });
  })()`;

// Target = today -> celebration must appear.
await evaluate(setTarget('+ 0', 'the exam'));
await sleep(1200);

report.celebrationState = await evaluate(`(() => ({
  canvasPresent: !!document.querySelector('canvas'),
  countdownText: document.querySelector('[aria-live="polite"]')?.textContent,
  dashboardVisible: document.querySelector('aside') !== null,
}))()`);

// Target = tomorrow -> no celebration, "1 DAY LEFT".
await evaluate(setTarget('+ 1', 'the exam'));
await sleep(1200);

report.tomorrowState = await evaluate(`(() => ({
  canvasPresent: !!document.querySelector('canvas'),
  countdownText: document.querySelector('[aria-live="polite"]')?.textContent,
}))()`);

// Target = 3 days ago -> counts up.
await evaluate(setTarget('- 3', 'the exam'));
await sleep(1200);

report.pastState = await evaluate(`(() => ({
  countdownText: document.querySelector('[aria-live="polite"]')?.textContent,
}))()`);

console.log(JSON.stringify(report, null, 2));

ws.close();
chrome.kill();
process.exit(0);
