import { bookById } from './books';
import { dayNumber, pickDaily, strideFor } from './dailyPick';
import { featuredSets } from './topPicks';

// আজকের হাদীস always comes from the owner's featured top-picks sets (FEATURED_SET_NUMBERS in
// featuredSets.js): the pool is the de-duplicated union of their hadis, in set order, then item order.
// It is read from the loader, so the picks follow the owner's sets as they grow.
//
// FALLBACK: only while the pool has fewer than MIN_POOL hadis (the sets are still being filled in)
// the day's hadis comes from the old short-hadis list (pickDaily), so the site never breaks.

export const MIN_POOL = 8;

const mod = (value, size) => ((value % size) + size) % size;

export function dailyPool(sets = featuredSets()) {
  const seen = new Set();
  const pool = [];
  for (const set of sets) {
    for (const day of set.days) {
      const key = `${day.book}:${day.number}`;
      const book = bookById(day.book);
      if (!book || seen.has(key)) continue;
      seen.add(key);
      pool.push({ book, number: day.number });
    }
  }
  return pool;
}

let cached = null;
// The pool of the real sets, built once.
export function getDailyPool() {
  cached ??= dailyPool();
  return cached;
}

export const poolIsEnough = (pool) => pool.length >= MIN_POOL;

// The hadis of the day from the pool: the same for everyone on the same date. A large fixed step
// (one that shares no factor with the pool size) walks the pool, so neighbouring days are far
// apart in the owner's order, and every hadis comes once before any comes back.
export function pickFromPool(pool, date) {
  if (pool.length === 0) return null;
  return pool[mod(dayNumber(date) * strideFor(pool.length), pool.length)];
}

// { book, number } for the date: from the pool, or (pool too small) from the old list, or null.
export function pickDay(date, { pool = getDailyPool(), list = null } = {}) {
  return poolIsEnough(pool) ? pickFromPool(pool, date) : pickDaily(list, date);
}

// The picks for the `count` days before `date` (not including it), newest first.
export function recentDays(date, context, count = 7) {
  const entries = [];
  for (let back = 1; back <= count; back++) {
    const day = new Date(date.getFullYear(), date.getMonth(), date.getDate() - back, 12);
    const pick = pickDay(day, context);
    if (pick) entries.push({ date: day, pick });
  }
  return entries;
}
