'use client';

import { getDailyPool, pickFromPool } from '../lib/dailyPool';

// { status: 'loading' | 'ok' | 'error', pick } for the home page's daily card. The hadis comes
// from the featured top-picks sets (nothing is fetched), so it is known as soon as the date is.
// An empty pool gives 'error' (the card then shows nothing).
export function useHomePick(today) {
  if (!today) return { status: 'loading', pick: null };
  const pick = pickFromPool(getDailyPool(), today);
  return pick ? { status: 'ok', pick } : { status: 'error', pick: null };
}
