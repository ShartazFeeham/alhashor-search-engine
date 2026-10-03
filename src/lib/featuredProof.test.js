import { renderHook } from '@testing-library/react';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { useHomePick } from '../daily/useHomePick';
import { FEATURED_SET_NUMBERS as FEATURED_FILE } from './featuredSets';
import { dayNumber } from './dailyPick';
import { MIN_POOL, getDailyPool, pickDay, pickFromPool, poolIsEnough, recentDays } from './dailyPool';
import { createHadisReader } from './hadisServer';
import { feedEntries } from './rss';
import { ALL_SETS, FEATURED_SET_NUMBERS, featuredSets, randomSets } from './topPicks';

// Proof, in plain Node, that the featured sets (display positions 1, 2, 4, 5, 7 of the list =
// set files 05, 01, 04, 06, 02) are the only source of the Home picks and of আজকের হাদীস.

const root = process.cwd();
const keyOf = (entry) => `${entry.book.id}:${entry.number}`;
const read = (file) => readFileSync(path.join(root, file), 'utf8');
const DATES = 400;
const START = new Date(2026, 9, 3, 12);
const dateAt = (offset) => new Date(START.getFullYear(), START.getMonth(), START.getDate() + offset, 12);

const union = (() => {
  const keys = [];
  for (const number of FEATURED_FILE) {
    const file = JSON.parse(read(`src/data/topPicks/set-${String(number).padStart(2, '0')}.json`));
    for (const item of file.items) {
      const key = `${item.book}:${item.number}`;
      if (!keys.includes(key)) keys.push(key);
    }
  }
  return keys;
})();
const UNION = new Set(union);
const NOT_FEATURED = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].filter((n) => !FEATURED_FILE.includes(n));

describe('the rule', () => {
  test('one shared constant: sets 5, 1, 4, 6, 2', () => {
    expect(FEATURED_FILE).toEqual([5, 1, 4, 6, 2]);
    expect(FEATURED_SET_NUMBERS).toBe(FEATURED_FILE);
    expect(featuredSets().map((set) => set.number)).toEqual([5, 1, 4, 6, 2]);
  });

  test('the pool is the de-duplicated union, in set order then item order, and big enough for no fallback', () => {
    const pool = getDailyPool();
    expect(pool.map(keyOf)).toEqual(union);
    expect(pool.length).toBeGreaterThanOrEqual(MIN_POOL);
    expect(poolIsEnough(pool)).toBe(true);
  });

  test('every item of the five sets has a known book and a number that exists, and a hadis text file', async () => {
    const reader = createHadisReader({ shardDir: path.join(root, '.no-such-shards'), publicDir: path.join(root, 'public') });
    for (const number of FEATURED_FILE) {
      const set = ALL_SETS.find((entry) => entry.number === number);
      const file = JSON.parse(read(`src/data/topPicks/set-${String(number).padStart(2, '0')}.json`));
      expect(set.days.length, `set ${number}: no item was skipped as invalid`).toBe(file.items.length);
    }
    for (const key of union) {
      const [book, num] = key.split(':');
      const text = await reader.read(book, Number(num));
      expect(typeof text === 'string' && text.length > 0, `text of ${key}`).toBe(true);
    }
  });
});

describe('every date in the next 400 days, through the exact functions of each surface', () => {
  test('Home card, /daily today and earlier 7 days, and the RSS feed all stay in the union with 8 distinct hadis', () => {
    const pool = getDailyPool();
    let picks = 0;
    for (let offset = 0; offset < DATES; offset++) {
      const today = dateAt(offset);
      // /daily: the page calls pickDay and recentDays with the pool and the (unused) short list
      const context = { pool, list: null };
      const daily = [pickDay(today, context), ...recentDays(today, context).map((entry) => entry.pick)];
      expect(recentDays(today, context)).toHaveLength(7);
      // Home card: the hook, which has no fetch when the pool is enough
      const { result } = renderHook(() => useHomePick(today));
      expect(result.current.status).toBe('ok');
      expect(keyOf(result.current.pick)).toBe(keyOf(daily[0]));
      expect(keyOf(pickFromPool(pool, today))).toBe(keyOf(daily[0]));
      // RSS: noon UTC of the date is the same Dhaka date; the feed lists 14 days, newest first
      const now = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate(), 6, 0));
      const feed = feedEntries(null, now);
      expect(feed).toHaveLength(14);
      expect(feed.slice(0, 8).map(keyOf)).toEqual(daily.map(keyOf));
      for (const entry of feed) expect(UNION.has(keyOf(entry)), `rss ${keyOf(entry)}`).toBe(true);
      // the 8 days are all different and all from the union
      const keys = daily.map(keyOf);
      expect(new Set(keys).size).toBe(8);
      for (const key of keys) expect(UNION.has(key), key).toBe(true);
      expect(new Set(feed.slice(0, 8).map(keyOf)).size).toBe(8);
      picks += daily.length + feed.length + 1;
    }
    expect(picks).toBe(DATES * 23);
  });

  test('deterministic by date: the same date gives the same hadis, and the pool cycles without repeats', () => {
    const pool = getDailyPool();
    expect(keyOf(pickFromPool(pool, new Date(2027, 0, 5, 1)))).toBe(keyOf(pickFromPool(pool, new Date(2027, 0, 5, 23))));
    const cycle = Array.from({ length: pool.length }, (_, i) => keyOf(pickFromPool(pool, dateAt(i))));
    expect(new Set(cycle).size).toBe(pool.length);
    expect(dayNumber(dateAt(1)) - dayNumber(dateAt(0))).toBe(1);
  });
});

describe('Home top list random 3', () => {
  test('over 500 random seeds: 3 distinct sets, only from set 5, 1, 4, 6, 2', () => {
    let state = 12345;
    const next = () => {
      state = (state * 1664525 + 1013904223) % 4294967296; // a small seeded generator
      return state / 4294967296;
    };
    const seen = new Set();
    for (let seed = 0; seed < 500; seed++) {
      const chosen = randomSets(featuredSets(), 3, next);
      expect(chosen).toHaveLength(3);
      expect(new Set(chosen.map((set) => set.number)).size).toBe(3);
      for (const set of chosen) {
        expect(FEATURED_FILE).toContain(set.number);
        expect(NOT_FEATURED).not.toContain(set.number);
        seen.add(set.number);
      }
    }
    expect([...seen].sort()).toEqual([1, 2, 4, 5, 6]);
  });
});

describe('no other source of the daily hadis', () => {
  const sources = (dir) =>
    readdirSync(path.join(root, dir), { recursive: true, withFileTypes: true })
      .filter((entry) => entry.isFile() && /\.(js|jsx|mjs)$/.test(entry.name) && !/\.test\./.test(entry.name))
      .map((entry) => path.join(entry.parentPath ?? entry.path, entry.name));

  test('the old rule (sets 1 to 6 and 12) is nowhere in the source, scripts or docs', () => {
    const files = [...sources('src'), ...sources('scripts'), path.join(root, 'README.md'), path.join(root, 'docs/redesign-plan.md')];
    for (const file of files) {
      const text = readFileSync(file, 'utf8');
      expect(text, file).not.toMatch(/\[\s*1,\s*2,\s*3,\s*4,\s*5,\s*6,\s*12\s*\]/);
      expect(text, file).not.toMatch(/sets 1\D{1,12}6 and 12/i);
    }
  });

  test('FEATURED_SET_NUMBERS is defined once, in featuredSets.js', () => {
    const definitions = sources('src').filter((file) => /export const FEATURED_SET_NUMBERS\s*=/.test(readFileSync(file, 'utf8')));
    expect(definitions.map((file) => path.relative(root, file))).toEqual(['src/lib/featuredSets.js']);
  });

  test('the sitemap and the RSS helper do not read daily lists, topics or the short list', () => {
    const sitemap = read('src/lib/sitemap.js');
    expect(sitemap).not.toMatch(/dailyPool|dailyPick|short-hadis|daily-picks|rss/);
    const rss = read('src/lib/rss.js');
    expect(rss).not.toMatch(/short-hadis|daily-picks|topics/);
    expect(rss).toMatch(/from '\.\/dailyPool'/);
  });

  test('the daily code never reads curated topic lists, and the old short list is only the pool-too-small fallback', () => {
    for (const file of ['src/lib/dailyPool.js', 'src/daily/TodaySection.jsx', 'src/daily/useHomePick.js', 'src/lib/rss.js']) {
      expect(read(file), file).not.toMatch(/topics|curated/i);
    }
    // the fallback is guarded by the pool size, and the real pool is never below it
    expect(read('src/daily/TodaySection.jsx')).toMatch(/useShortList\(!fromPool\)/);
    expect(read('src/daily/useHomePick.js')).toMatch(/if \(fromPool\) return undefined/);
    expect(getDailyPool().length).toBeGreaterThanOrEqual(MIN_POOL);
  });
});
