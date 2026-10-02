// Script: writes the hadis of the day for a run of dates, so the home page need not load the whole
// short-hadis list (88 KB) just to pick one number.
// Run: node scripts/build-daily-picks.mjs   (writes public/json/daily-picks.json, 450 days from a week ago)
//      node scripts/build-daily-picks.mjs --if-stale   (does nothing while the file still covers the next
//      60 days; this is how `npm run build` runs it, so the file renews itself before it runs out)
//
// The picks are made by the very same pickDaily function the daily page uses (src/lib/dailyPick.js
// with src/lib/books.js, loaded read-only), from public/json/short-hadis.json, so a date gives the
// same hadis here as on /daily. A test (src/lib/dailyPicks.test.js) compares every entry with
// pickDaily, so it fails if the short list or the picking rule changes and this file is stale.
// Dates outside the run are not a problem: the home page then falls back to the full list.
//
// Format: { "from": <day number of the first date, as dayNumber() counts>, "picks": ["BUK:1234", ...] }
// where picks[i] is the hadis of the day number from + i.
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DAYS = 450;
const MARGIN_DAYS = 60; // --if-stale rebuilds when fewer than this many days are left
const OUT = path.join(root, 'public/json/daily-picks.json');
const now = new Date();
const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7, 12); // a week of slack for old links and time zones
const FIRST = [start.getFullYear(), start.getMonth(), start.getDate()];

// Joins books.js and dailyPick.js into one module (the second one's import of the first goes).
const books = await readFile(path.join(root, 'src/lib/books.js'), 'utf8');
const pick = (await readFile(path.join(root, 'src/lib/dailyPick.js'), 'utf8')).replace(/^import .*$/m, '');
const { dayNumber, pickDaily, picksCover } = await import(`data:text/javascript;base64,${Buffer.from(`${books}\n${pick}`).toString('base64')}`);

if (process.argv.includes('--if-stale')) {
  const existing = await readFile(OUT, 'utf8').then(JSON.parse, () => null);
  if (picksCover(existing, now, MARGIN_DAYS)) {
    console.log(`daily picks are fresh (${existing.picks.length} days from day ${existing.from}); not rewriting`);
    process.exit(0);
  }
}

const list = JSON.parse(await readFile(path.join(root, 'public/json/short-hadis.json'), 'utf8'));
const first = new Date(FIRST[0], FIRST[1], FIRST[2], 12);
const from = dayNumber(first);
const picks = [];
for (let i = 0; i < DAYS; i++) {
  const date = new Date(FIRST[0], FIRST[1], FIRST[2] + i, 12);
  if (dayNumber(date) !== from + i) throw new Error(`day numbers are not consecutive at ${i}`);
  const { book, number } = pickDaily(list, date);
  picks.push(`${book.code}:${number}`);
}
await writeFile(OUT, `${JSON.stringify({ from, picks })}\n`);
console.log(`wrote ${picks.length} picks from day ${from}`);
