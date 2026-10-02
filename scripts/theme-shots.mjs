// Screenshots of the main pages in every theme at phone and desktop width, plus checks that
// nothing overflows sideways. Usage: node scripts/theme-shots.mjs <base-url> <out-dir>
import { mkdirSync } from 'node:fs';
import { openPage } from './browser.mjs';

const [base, out] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const routes = [
  ['home', '/'],
  ['search', '/search'],
  ['results', '/search?q=%E0%A6%B0%E0%A7%8B%E0%A6%9C%E0%A6%BE'],
  ['hadis', '/hadis/bukhari/307'],
  ['books', '/books'],
  ['book', '/books/bukhari?page=4'],
  ['topics', '/topics'],
  ['topic', `/topics?topic=${encodeURIComponent('নামায')}`],
  ['daily', '/daily'],
  ['daily-plans', '/daily?tab=plans&plan=ramadan-30'],
  ['narrators', '/narrators'],
  ['narrator', '/narrators?name=abu-hurayrah'],
  ['share', '/share/bukhari/307'],
  ['settings', '/settings'],
  ['notfound', '/no-such-page'],
];
const sizes = [['phone', 390, 844], ['desktop', 1200, 900]];
let failed = false;

const page = await openPage(`${base}/`, { width: 1200, height: 900 });
try {
  await page.waitFor(`document.readyState === 'complete'`, 'the first page');
  for (const theme of ['light', 'dark', 'sepia']) {
    await page.eval(`localStorage.setItem('alhashor.settings', JSON.stringify({ theme: '${theme}' }))`);
    for (const [sizeName, width, height] of sizes) {
      await page.resize(width, height);
      for (const [name, route] of routes) {
        await page.goto(`${base}${route}`);
        await page.waitFor(`document.body.innerText.length > 100`, name);
        await new Promise((resolve) => setTimeout(resolve, 900)); // let the results and hadis text arrive
        const overflow = await page.eval('document.documentElement.scrollWidth - window.innerWidth');
        const applied = await page.eval(`document.documentElement.getAttribute('data-theme')`);
        const ok = overflow <= 0 && applied === theme;
        if (!ok) failed = true;
        console.log(`${ok ? 'ok  ' : 'FAIL'} ${theme}/${sizeName}/${name}${overflow > 0 ? ` (sideways overflow ${overflow}px)` : ''}`);
        await page.screenshot(`${out}/${theme}-${sizeName}-${name}.png`);
      }
    }
  }
} finally {
  await page.close();
}
process.exit(failed ? 1 : 0);
