'use client';

import { useEffect, useState } from 'react';
import { BASE_PATH } from '../Helpers/basePath';
import { pickDaily, pickPrecomputed } from '../lib/dailyPick';
import { useShortList } from './useShortList';

const PICKS_URL = `${BASE_PATH}/json/daily-picks.json`;

let request = null; // Promise of a settled result; only a success is kept

// Forgets the loaded file (tests use this so one test's data never leaks into the next).
export function clearDailyPicksCache() {
  request = null;
}

// The small file of precomputed picks (about 5 KB). A failure is not an error for the page: the
// home card then picks from the full list, exactly as the daily page does.
export function loadDailyPicks() {
  if (request) return request;
  const current = (async () => {
    try {
      const response = await fetch(PICKS_URL);
      if (!response.ok) throw new Error('not found');
      const file = await response.json();
      if (!file || typeof file !== 'object' || !Array.isArray(file.picks)) throw new Error('unreadable');
      return { status: 'ok', file };
    } catch {
      if (request === current) request = null;
      return { status: 'error', file: null };
    }
  })();
  request = current;
  return current;
}

// { status: 'loading' | 'ok' | 'error', pick } for the home page's daily card. The 5 KB picks file
// is requested as soon as the card mounts, and gives the same hadis as the daily page (a test
// compares them). The 88 KB full list is only loaded when the file cannot answer (a date beyond
// its range, or the file is missing).
export function useHomePick(today) {
  const [picks, setPicks] = useState({ status: 'loading', file: null });

  useEffect(() => {
    let cancelled = false;
    loadDailyPicks().then((result) => {
      if (!cancelled) setPicks(result);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const fast = today && picks.status !== 'loading' ? pickPrecomputed(picks.file, today) : null;
  const needsList = Boolean(today) && picks.status !== 'loading' && !fast;
  const short = useShortList(needsList);

  if (fast) return { status: 'ok', pick: fast };
  if (!needsList) return { status: 'loading', pick: null };
  if (short.status === 'loading') return { status: 'loading', pick: null };
  const pick = short.status === 'ok' ? pickDaily(short.list, today) : null;
  return pick ? { status: 'ok', pick } : { status: 'error', pick: null };
}
