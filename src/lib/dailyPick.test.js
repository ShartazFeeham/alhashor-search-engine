import { readFileSync } from 'node:fs';
import path from 'node:path';
import { dayNumber, pickDaily, recentPicks } from './dailyPick';

// The real list of hadis of 60 words or fewer (built by scripts/build-short-hadis.mjs).
const LIST = JSON.parse(readFileSync(path.resolve(process.cwd(), 'public/json/short-hadis.json'), 'utf8'));
const key = (pick) => `${pick.book.id}-${pick.number}`;
const addDays = (date, days) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + days, 12);
const START = new Date(2026, 9, 2, 12);

describe('dayNumber', () => {
  test('counts local calendar days, whatever the time of day', () => {
    expect(dayNumber(new Date(2026, 9, 2, 0, 0, 1))).toBe(dayNumber(new Date(2026, 9, 2, 23, 59, 59)));
    expect(dayNumber(new Date(1970, 0, 1))).toBe(0);
    expect(dayNumber(new Date(1970, 0, 2))).toBe(1);
  });

  test('goes up by exactly one every day, across clock changes, leap days and years', () => {
    let previous = dayNumber(new Date(2023, 0, 1, 12));
    for (let i = 1; i <= 1500; i++) {
      const current = dayNumber(addDays(new Date(2023, 0, 1, 12), i));
      expect(current - previous).toBe(1);
      previous = current;
    }
  });
});

describe('pickDaily', () => {
  test('the same date gives the same hadis, at any time of day', () => {
    const morning = pickDaily(LIST, new Date(2026, 9, 2, 0, 5));
    const night = pickDaily(LIST, new Date(2026, 9, 2, 23, 55));
    expect(key(morning)).toBe(key(night));
    expect(key(pickDaily(LIST, START))).toBe(key(pickDaily(LIST, START)));
  });

  test('is a hadis from the list, as a book and a number', () => {
    const pick = pickDaily(LIST, START);
    expect(pick.book.id).toMatch(/^(bukhari|muslim|tirmidhi|abudawud|ibnmajah|nasai)$/);
    expect(LIST[pick.book.code]).toContain(pick.number);
  });

  test('consecutive dates give different hadis, for three years running', () => {
    let previous = key(pickDaily(LIST, START));
    for (let i = 1; i <= 1100; i++) {
      const current = key(pickDaily(LIST, addDays(START, i)));
      expect(current).not.toBe(previous);
      previous = current;
    }
  });

  test('every run of six days visits all six books', () => {
    for (let i = 0; i < 400; i += 7) {
      const books = new Set();
      for (let d = 0; d < 6; d++) books.add(pickDaily(LIST, addDays(START, i + d)).book.id);
      expect(books.size).toBe(6);
    }
  });

  test('a whole year has no repeated hadis and uses every book about equally', () => {
    const seen = new Set();
    const perBook = {};
    for (let i = 0; i < 365; i++) {
      const pick = pickDaily(LIST, addDays(START, i));
      seen.add(key(pick));
      perBook[pick.book.id] = (perBook[pick.book.id] || 0) + 1;
    }
    expect(seen.size).toBe(365);
    for (const count of Object.values(perBook)) expect(count).toBeGreaterThanOrEqual(60);
  });

  test('is not just walking the list in order (neighbouring days are far apart in a book)', () => {
    const first = pickDaily(LIST, START);
    const sixDaysLater = pickDaily(LIST, addDays(START, 6));
    expect(sixDaysLater.book.id).toBe(first.book.id);
    const list = LIST[first.book.code];
    expect(Math.abs(list.indexOf(first.number) - list.indexOf(sixDaysLater.number))).toBeGreaterThan(list.length / 10);
  });

  test('works for any year, including long ago, far ahead and the leap day', () => {
    for (const date of [new Date(1901, 0, 1), new Date(1969, 11, 31), new Date(2028, 1, 29), new Date(2100, 5, 15), new Date(3000, 0, 1)]) {
      const pick = pickDaily(LIST, date);
      expect(LIST[pick.book.code]).toContain(pick.number);
    }
  });

  test('never uses chance', () => {
    const random = vi.spyOn(Math, 'random');
    pickDaily(LIST, START);
    recentPicks(LIST, START);
    expect(random).not.toHaveBeenCalled();
    random.mockRestore();
  });

  test('skips books with no short hadis and copes with a one-book or empty list', () => {
    expect(pickDaily({ BUK: [], MUS: [5, 9, 12] }, START).book.id).toBe('muslim');
    expect(pickDaily({ MUS: [7] }, addDays(START, 3))).toMatchObject({ number: 7 });
    expect(pickDaily({ BUK: [], MUS: [] }, START)).toBeNull();
    expect(pickDaily({}, START)).toBeNull();
    expect(pickDaily(null, START)).toBeNull();
  });

  test('ignores unknown book codes', () => {
    expect(pickDaily({ XXX: [1, 2, 3], TIR: [4] }, START).book.id).toBe('tirmidhi');
  });
});

describe('recentPicks', () => {
  test('is the pick of each of the seven days before, newest first', () => {
    const recent = recentPicks(LIST, START);
    expect(recent).toHaveLength(7);
    recent.forEach((entry, index) => {
      const date = addDays(START, -(index + 1));
      expect(dayNumber(entry.date)).toBe(dayNumber(date));
      expect(key(entry.pick)).toBe(key(pickDaily(LIST, date)));
    });
  });

  test('does not include today, and can be asked for another count', () => {
    expect(recentPicks(LIST, START).map((e) => dayNumber(e.date))).not.toContain(dayNumber(START));
    expect(recentPicks(LIST, START, 3)).toHaveLength(3);
  });

  test('is empty when there is nothing to pick from', () => {
    expect(recentPicks({}, START)).toEqual([]);
  });
});
