'use client';

import { useEffect, useState } from 'react';
import { hadisUrl } from '../Helpers/hadisPath';

const cache = new Map(); // tag -> Promise of a settled result ('ok' or 'missing')

// Forgets every remembered text (tests use this so one test's data never leaks into the next).
export function clearHadisTextCache() {
  cache.clear();
}

// Loads one hadis text. A number with no data file is 'missing'; a network failure is 'error'
// and is tried again on the next request (only 'ok' and 'missing' are remembered).
export function loadHadisText(tag) {
  if (cache.has(tag)) return cache.get(tag);
  const url = hadisUrl(tag);
  if (url === null) return Promise.resolve({ status: 'missing' });

  const request = fetch(url)
    .then(async (response) => {
      if (!response.ok) return { status: 'missing' };
      return { status: 'ok', text: await response.json() };
    })
    .catch(() => {
      cache.delete(tag);
      return { status: 'error' };
    });
  cache.set(tag, request);
  return request;
}

// { status: 'loading' | 'ok' | 'missing' | 'error', text }. `retry` loads again after an error.
// `initialText` is what a server-rendered page already knows: a string is the text (status 'ok',
// nothing is fetched), null says the hadis has no file (status 'missing', nothing is fetched),
// and undefined means the text must be fetched.
export function useHadisText(tag, initialText) {
  const handedIn = initialText !== undefined;
  const [state, setState] = useState({ tag, status: 'loading', text: '' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (handedIn) return undefined;
    let cancelled = false;
    loadHadisText(tag).then((result) => {
      if (!cancelled) setState({ tag, status: result.status, text: result.text || '' });
    });
    return () => {
      cancelled = true;
    };
  }, [tag, attempt, handedIn]);

  const retry = () => setAttempt((n) => n + 1);
  if (handedIn) {
    return initialText === null ? { status: 'missing', text: '', retry } : { status: 'ok', text: initialText, retry };
  }
  const current = state.tag === tag ? state : { tag, status: 'loading', text: '' };
  return { status: current.status, text: current.text, retry };
}
