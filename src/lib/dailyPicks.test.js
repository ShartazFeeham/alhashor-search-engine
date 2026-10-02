import { readFileSync } from 'node:fs';
import path from 'node:path';
import { dayNumber, pickDaily, picksCover, pickPrecomputed } from './dailyPick';

const read = (name) => JSON.parse(readFileSync(path.resolve(process.cwd(), 'public/json', name), 'utf8'));
const LIST = read('short-hadis.json');
const FILE = read('daily-picks.json');
const dateOf = (index) => {
  // The date whose day number is FILE.from + index (local noon of that calendar day).
  const utc = new Date((FILE.from + index) * 86400000);
  return new Date(utc.getUTCFullYear(), utc.getUTCMonth(), utc.getUTCDate(), 12);
};

test('the precomputed file is small', () => {
  expect(readFileSync(path.resolve(process.cwd(), 'public/json/daily-picks.json')).length).toBeLessThan(8000);
});

test('it covers at least a year and starts no later than today', () => {
  expect(FILE.picks.length).toBeGreaterThanOrEqual(366);
  expect(FILE.from).toBeLessThanOrEqual(dayNumber(new Date()));
});

describe('picksCover (the build refreshes the file only when it runs low)', () => {
  const file = { from: dayNumber(new Date(2026, 9, 1, 12)), picks: new Array(10).fill('BUK:1') }; // 1 to 10 October 2026
  const day = (d) => new Date(2026, 9, d, 12);

  test('is true while the date and the margin after it are inside the file', () => {
    expect(picksCover(file, day(1), 0)).toBe(true);
    expect(picksCover(file, day(10), 0)).toBe(true);
    expect(picksCover(file, day(5), 5)).toBe(true);
  });

  test('is false once the margin runs past the end of the file', () => {
    expect(picksCover(file, day(6), 5)).toBe(false);
    expect(picksCover(file, day(11), 0)).toBe(false);
  });

  test('is false before the file starts', () => {
    expect(picksCover(file, new Date(2026, 8, 30, 12), 0)).toBe(false);
  });

  test('is false for a missing or empty file', () => {
    expect(picksCover(null, day(5), 0)).toBe(false);
    expect(picksCover({ from: file.from, picks: [] }, day(1), 0)).toBe(false);
  });
});

test('every date in the file gives exactly the hadis pickDaily gives from the full list (/daily agrees)', () => {
  for (let i = 0; i < FILE.picks.length; i++) {
    const date = dateOf(i);
    const expected = pickDaily(LIST, date);
    const got = pickPrecomputed(FILE, date);
    expect(dayNumber(date)).toBe(FILE.from + i);
    expect(got && { code: got.book.code, number: got.number }).toEqual({ code: expected.book.code, number: expected.number });
  }
});

describe('pickPrecomputed', () => {
  test('gives the same hadis at any time of the day', () => {
    const a = pickPrecomputed(FILE, new Date(2026, 9, 2, 0, 1));
    const b = pickPrecomputed(FILE, new Date(2026, 9, 2, 23, 58));
    expect(a.number).toBe(b.number);
    expect(a.book.id).toBe(b.book.id);
  });

  test('is null before the first date and after the last, so the caller falls back to the full list', () => {
    expect(pickPrecomputed(FILE, dateOf(-1))).toBeNull();
    expect(pickPrecomputed(FILE, dateOf(FILE.picks.length))).toBeNull();
    expect(pickPrecomputed(FILE, dateOf(FILE.picks.length - 1))).not.toBeNull();
  });

  test.each([null, undefined, {}, { from: 1 }, { from: 'x', picks: [] }, { from: 20800, picks: 'BUK:1' }, []])('is null for an unusable file %j', (file) => {
    expect(pickPrecomputed(file, new Date(2026, 9, 2, 12))).toBeNull();
  });

  test('is null for an entry that is not a known book and a whole number', () => {
    const date = dateOf(0);
    for (const bad of ['XXX:12', 'BUK:abc', 'BUK:0', 'BUK', '', 5, null]) {
      expect(pickPrecomputed({ from: FILE.from, picks: [bad] }, date)).toBeNull();
    }
  });
});
