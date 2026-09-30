// A tiny headless-Chrome driver (no dependencies; needs Node 22+ for the built-in WebSocket).
// Usage in a script:  const page = await openPage(url);  await page.eval('...');  await page.close();
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function openPage(url, { width = 1200, height = 900, port = 9333 } = {}) {
  const profile = mkdtempSync(path.join(tmpdir(), 'chrome-'));
  const chrome = spawn(CHROME, [
    '--headless=new', '--disable-gpu', '--no-sandbox', `--user-data-dir=${profile}`,
    `--remote-debugging-port=${port}`, `--window-size=${width},${height}`, 'about:blank',
  ], { stdio: 'ignore' });

  let targets;
  for (let i = 0; i < 50; i++) {
    try {
      targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
      if (targets.some((t) => t.type === 'page')) break;
    } catch { /* Chrome is still starting */ }
    await sleep(200);
  }
  const target = targets.find((t) => t.type === 'page');
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve) => socket.addEventListener('open', resolve, { once: true }));

  let nextId = 0;
  const pending = new Map();
  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      pending.get(message.id)(message);
      pending.delete(message.id);
    }
  });
  const send = (method, params = {}) =>
    new Promise((resolve) => {
      const id = ++nextId;
      pending.set(id, resolve);
      socket.send(JSON.stringify({ id, method, params }));
    });

  await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url });

  const page = {
    // Evaluate an expression in the page and return its value.
    async eval(expression) {
      const { result } = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
      if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
      return result.result.value;
    },
    // Wait until the expression is truthy (up to ~15 seconds).
    async waitFor(expression, what = expression) {
      for (let i = 0; i < 75; i++) {
        if (await page.eval(`Boolean(${expression})`).catch(() => false)) return;
        await sleep(200);
      }
      throw new Error(`timed out waiting for ${what}`);
    },
    // Click the first element whose visible text contains the given text.
    click: (text, selector = 'button, a, [role=button]') =>
      page.eval(`(() => { const el = [...document.querySelectorAll(${JSON.stringify(selector)})].find((e) => e.textContent.includes(${JSON.stringify(text)})); if (!el) return false; el.click(); return true; })()`),
    async close() {
      socket.close();
      chrome.kill('SIGKILL');
      await sleep(400); // let Chrome release its profile folder
      try {
        rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
      } catch { /* a leftover temp folder is harmless */ }
    },
  };
  return page;
}
