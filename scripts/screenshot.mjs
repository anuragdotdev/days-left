/**
 * Loads the built extension, seeds the mockup's sample data, and captures a
 * screenshot for visual comparison.
 *
 * Usage: node scripts/screenshot.mjs [outFile] [width] [height]
 */
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { writeFileSync, rmSync, existsSync } from 'node:fs';

const DIST = 'C:/Users/hp/Desktop/projects/days-left/dist';
const OUT = process.argv[2] ?? 'C:/Users/hp/AppData/Local/Temp/opencode/deadline-ui.png';
const WIDTH = Number(process.argv[3] ?? 1440);
const HEIGHT = Number(process.argv[4] ?? 900);
const PROFILE = 'C:/Users/hp/AppData/Local/Temp/opencode/shot-profile';
const PORT = 9370;

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
    `--window-size=${WIDTH},${HEIGHT}`,
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

// Seed the sample data shown in the design mockup.
await evaluate(`(async () => {
  const now = new Date().toISOString();
  const data = {
    version: 1,
    settings: {
      countdownTarget: '2026-12-31',
      countdownLabel: 'year end',
      weekStartsOn: 'monday',
      theme: 'dark',
    },
    events: [
      { id: 'e1', title: 'Project Presentation', date: '2026-12-04', type: 'presentation', createdAt: now, updatedAt: now },
      { id: 'e2', title: 'ML Assignment', date: '2026-12-10', type: 'assignment', createdAt: now, updatedAt: now },
      { id: 'e3', title: 'DBMS Examination', date: '2026-12-15', type: 'examination', createdAt: now, updatedAt: now },
    ],
    tasks: [
      { id: 't1', title: 'Solve DSA problems', completed: true, priority: 'high', dueDate: '2026-11-11', createdAt: now, completedAt: now, updatedAt: now },
      { id: 't2', title: 'Finish ML assignment', completed: false, priority: 'medium', dueDate: '2026-11-11', createdAt: now, updatedAt: now },
      { id: 't3', title: 'Work on project', completed: false, priority: 'low', dueDate: '2026-11-11', createdAt: now, updatedAt: now },
      { id: 't4', title: 'Revise DBMS', completed: true, priority: 'high', dueDate: '2026-11-10', createdAt: now, completedAt: now, updatedAt: now },
    ],
  };
  await chrome.storage.local.set({ 'deadline:data': data });
  location.reload();
})()`);

await sleep(3000);

const shot = await send('Page.captureScreenshot', { format: 'png' }, sessionId);
writeFileSync(OUT, Buffer.from(shot.data, 'base64'));
console.log('wrote', OUT);

ws.close();
chrome.kill();
process.exit(0);
