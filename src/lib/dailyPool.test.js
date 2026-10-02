import { dayNumber } from './dailyPick';
import { MIN_POOL, dailyPool, getDailyPool, pickDay, pickFromPool, poolIsEnough, recentDays } from './dailyPool';
import { feedEntries } from './rss';
import { ALL_SETS, FEATURED_SET_NUMBERS, featuredSets } from './topPicks';

// Twelve synthetic sets of real hadis (bukhari 1.., five more in each next set), numbered 1 to 12.
const made = (count) =>
  Array.from({ length: 12 }, (_, index) => ({
    id: `s${index + 1}`,
    number: index + 1,
    title: `সেট ${index + 1}`,
    description: '',
    days: Array.from({ length: count }, (__, k) => ({ book: 'bukhari', number: 100 * (index + 1) + k + 1 })),
  }));
const SETS = made(6);
const keyOf = (entry) => `${entry.book.id}:${entry.number}`;
const poolOf = (sets) => dailyPool(featuredSets(sets));

describe('which sets feed the daily hadis', () => {
  test('one constant: sets 1 to 6 and 12', () => {
    expect(FEATURED_SET_NUMBERS).toEqual([1, 2, 3, 4, 5, 6, 12]);
    expect(featuredSets(SETS).map((set) => set.number)).toEqual([1, 2, 3, 4, 5, 6, 12]);
  });

  test('the pool holds only hadis of those sets, none of sets 7 to 11', () => {
    const pool = poolOf(SETS);
    const allowed = new Set(SETS.filter((set) => FEATURED_SET_NUMBERS.includes(set.number)).flatMap((set) => set.days.map((day) => `${day.book}:${day.number}`)));
    const forbidden = new Set(SETS.filter((set) => [7, 8, 9, 10, 11].includes(set.number)).flatMap((set) => set.days.map((day) => `${day.book}:${day.number}`)));
    expect(pool).toHaveLength(7 * 6);
    for (const entry of pool) {
      expect(allowed.has(keyOf(entry))).toBe(true);
      expect(forbidden.has(keyOf(entry))).toBe(false);
    }
  });

  test('is in set order, then item order, without duplicates', () => {
    const shared = [{ id: 'a', number: 1, days: [{ book: 'muslim', number: 5 }, { book: 'bukhari', number: 7 }] }, { id: 'b', number: 2, days: [{ book: 'bukhari', number: 7 }, { book: 'tirmidhi', number: 9 }] }];
    expect(dailyPool(featuredSets(shared)).map(keyOf)).toEqual(['muslim:5', 'bukhari:7', 'tirmidhi:9']);
  });

  test('a set with no hadis adds nothing', () => {
    expect(poolOf([{ id: 'a', number: 1, days: [] }])).toEqual([]);
  });

  test('the real pool reads the loader: only hadis of the real featured sets', () => {
    const allowed = new Set(ALL_SETS.filter((set) => FEATURED_SET_NUMBERS.includes(set.number)).flatMap((set) => set.days.map((day) => `${day.book}:${day.number}`)));
    for (const entry of getDailyPool()) expect(allowed.has(keyOf(entry))).toBe(true);
  });
});

describe('the pick', () => {
  const pool = poolOf(SETS);
  const DATE = new Date(2026, 9, 3, 9, 0);

  test('today and the seven days before are all different, and the same for the same date', () => {
    const days = [{ date: DATE, pick: pickFromPool(pool, DATE) }, ...recentDays(DATE, { pool })];
    expect(days).toHaveLength(8);
    expect(new Set(days.map((day) => keyOf(day.pick))).size).toBe(8);
    expect(keyOf(pickFromPool(pool, new Date(2026, 9, 3, 23, 59)))).toBe(keyOf(pickFromPool(pool, new Date(2026, 9, 3, 0, 1))));
    expect(keyOf(pickDay(DATE, { pool }))).toBe(keyOf(pickDay(new Date(2026, 9, 3, 18, 0), { pool })));
  });

  test('the day rolls over at midnight: the next date has the next pick', () => {
    const today = pickFromPool(pool, new Date(2026, 9, 3, 23, 59));
    const tomorrow = pickFromPool(pool, new Date(2026, 9, 4, 0, 0));
    expect(keyOf(today)).not.toBe(keyOf(tomorrow));
    expect(dayNumber(new Date(2026, 9, 4)) - dayNumber(new Date(2026, 9, 3))).toBe(1);
    // and across a month and a year end
    expect(keyOf(pickFromPool(pool, new Date(2026, 11, 31)))).not.toBe(keyOf(pickFromPool(pool, new Date(2027, 0, 1))));
  });

  test('the whole pool is used once before any hadis comes back', () => {
    const seen = [];
    for (let back = 0; back < pool.length; back++) seen.push(keyOf(pickFromPool(pool, new Date(2026, 9, 3 + back, 12))));
    expect(new Set(seen).size).toBe(pool.length);
    expect(keyOf(pickFromPool(pool, new Date(2026, 9, 3 + pool.length, 12)))).toBe(seen[0]);
  });

  test('any pool of 8 or more keeps eight days apart', () => {
    for (const size of [8, 9, 10, 16, 31, 100]) {
      const small = Array.from({ length: size }, (_, i) => ({ book: { id: 'bukhari' }, number: i + 1 }));
      const days = Array.from({ length: 8 }, (_, back) => keyOf(pickFromPool(small, new Date(2026, 9, 3 - back, 12))));
      expect(new Set(days).size, `pool of ${size}`).toBe(8);
    }
  });
});

describe('the fallback', () => {
  const list = { BUK: [1, 2, 3], MUS: [4, 5, 6] };
  const date = new Date(2026, 9, 3, 12);

  test('applies only below eight hadis', () => {
    expect(MIN_POOL).toBe(8);
    const seven = poolOf(made(1)).slice(0, 7);
    expect(poolIsEnough(seven)).toBe(false);
    expect(poolIsEnough(poolOf(made(2)).slice(0, 8))).toBe(true);
    const fallback = pickDay(date, { pool: seven, list });
    expect(['BUK', 'MUS']).toContain(fallback.book.code);
    expect(list[fallback.book.code]).toContain(fallback.number);
    const eight = poolOf(made(2)).slice(0, 8);
    expect(keyOf(pickDay(date, { pool: eight, list }))).toBe(keyOf(pickFromPool(eight, date)));
  });

  test('with no pool and no list there is no pick (the page shows its own message)', () => {
    expect(pickDay(date, { pool: [], list: null })).toBeNull();
    expect(recentDays(date, { pool: [], list: null })).toEqual([]);
  });
});

describe('the feed uses the same pool', () => {
  const pool = poolOf(SETS);
  const NOW = new Date(Date.UTC(2026, 9, 2, 10, 0));

  test('each day of the feed is that day\'s pick from the pool', () => {
    const entries = feedEntries(null, NOW, 14, pool);
    expect(entries).toHaveLength(14);
    for (const entry of entries) expect(keyOf(entry)).toBe(keyOf(pickFromPool(pool, entry.date)));
    expect(new Set(entries.map(keyOf)).size).toBe(14);
  });
});
