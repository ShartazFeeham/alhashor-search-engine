'use client';

import { useEffect, useState } from 'react';
import { BASE_PATH } from '../Helpers/basePath';

const SHORT_URL = `${BASE_PATH}/json/short-hadis.json`;

let request = null; // Promise of a settled result; only a success is kept

// Forgets the loaded list (tests use this so one test's data never leaks into the next).
export function clearShortListCache() {
  request = null;
}

// The list of hadis short enough for the daily pick: { BUK: [numbers], MUS: [...], ... }.
export function loadShortList() {
  if (request) return request;
  const current = (async () => {
    try {
      const response = await fetch(SHORT_URL);
      if (!response.ok) throw new Error('not found');
      const list = await response.json();
      if (!list || typeof list !== 'object' || Array.isArray(list)) throw new Error('unreadable');
      return { status: 'ok', list };
    } catch {
      if (request === current) request = null;
      return { status: 'error', list: null };
    }
  })();
  request = current;
  return current;
}

// { status: 'loading' | 'ok' | 'error', list, retry }. With `enabled` false nothing is requested
// (the status stays 'loading') until it becomes true.
export function useShortList(enabled = true) {
  const [state, setState] = useState({ status: 'loading', list: null });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!enabled) return undefined;
    let cancelled = false;
    loadShortList().then((result) => {
      if (!cancelled) setState(result);
    });
    return () => {
      cancelled = true;
    };
  }, [attempt, enabled]);

  return {
    ...state,
    retry: () => {
      setState({ status: 'loading', list: null });
      setAttempt((n) => n + 1);
    },
  };
}
