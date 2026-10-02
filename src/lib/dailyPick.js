import { BOOKS } from './books';

const DAY = 86400000;
const GOLDEN = 0.6180339887;

// Days since 1970-01-01 of the *local* calendar date. The clock time and clock changes do not
// matter, so the whole day (in the visitor's own time zone) has one number.
export function dayNumber(date) {
  return Math.round(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / DAY);
}

const mod = (value, size) => ((value % size) + size) % size;

function gcd(a, b) {
  return b === 0 ? a : gcd(b, a % b);
}

// A step through a list of `size` that visits every place before repeating (it shares no factor
// with the size) and lands far from the last one, so neighbouring days are never neighbours in
// the list.
function strideFor(size) {
  if (size <= 2) return 1;
  let stride = Math.max(1, Math.round(size * GOLDEN));
  while (gcd(stride, size) !== 1) stride++;
  return stride;
}

// The hadis of the day: { book, number } from `list` ({ BUK: [numbers], ... }, the hadis short
// enough to show), or null when the list has nothing. The books take turns, one per day, and
// within a book the day's turn moves through its list by a fixed large step. There is no chance
// in it, so the same date gives the same hadis for everyone, in any year, and a hadis does not
// come back until its whole book list has been used.
export function pickDaily(list, date) {
  if (!list) return null;
  const books = BOOKS.filter((book) => Array.isArray(list[book.code]) && list[book.code].length > 0);
  if (books.length === 0) return null;
  const day = dayNumber(date);
  const book = books[mod(day, books.length)];
  const numbers = list[book.code];
  const turn = Math.floor(day / books.length);
  return { book, number: numbers[mod(turn * strideFor(numbers.length), numbers.length)] };
}

// The picks for the `count` days before `date` (not including it), newest first.
export function recentPicks(list, date, count = 7) {
  const entries = [];
  for (let back = 1; back <= count; back++) {
    const day = new Date(date.getFullYear(), date.getMonth(), date.getDate() - back, 12);
    const pick = pickDaily(list, day);
    if (pick) entries.push({ date: day, pick });
  }
  return entries;
}

// The same pick, read from the small precomputed file ({ from: day number of the first date,
// picks: ["BUK:1234", ...] }, built by scripts/build-daily-picks.mjs with pickDaily itself), so
// the home page need not load the whole list. Null when the date is outside the file or the file
// or entry is unusable: the caller then picks from the full list.
export function pickPrecomputed(file, date) {
  if (!file || !Number.isInteger(file.from) || !Array.isArray(file.picks)) return null;
  const entry = file.picks[dayNumber(date) - file.from];
  if (typeof entry !== 'string') return null;
  const [code, digits] = entry.split(':');
  const book = BOOKS.find((candidate) => candidate.code === code);
  const number = Number(digits);
  if (!book || !/^\d+$/.test(digits ?? '') || number < 1) return null;
  return { book, number };
}

// True while the precomputed file covers the date and `marginDays` days after it. The build uses
// this to refresh the file only when it is running low (scripts/build-daily-picks.mjs --if-stale).
export function picksCover(file, date, marginDays) {
  if (!file || !Number.isInteger(file.from) || !Array.isArray(file.picks) || file.picks.length === 0) return false;
  const today = dayNumber(date);
  return today >= file.from && today + marginDays <= file.from + file.picks.length - 1;
}
