'use client';

import { useEffect, useState } from 'react';
import { loadIndex, loadNarratorHadis } from '../lib/narrators';

export const LOADING = 'loading';
export const DONE = 'ok';
export const MISSING = 'missing';
export const FAILED = 'error';

// The index of narrators: { status, narrators, retry }. 'missing' means the index file is not on
// the site; 'error' is a network failure, tried again by `retry`.
export function useNarratorIndex() {
  const [state, setState] = useState({ status: LOADING, narrators: [] });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    loadIndex().then((result) => {
      if (!cancelled) setState(result);
    });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const retry = () => {
    setState({ status: LOADING, narrators: [] });
    setAttempt((n) => n + 1);
  };
  return { ...state, retry };
}

// One narrator's hadis, narrowed to a book ('all' or a book id): { status, hadis, retry }. An
// answer that arrives after the narrator or the book has changed (or the page was left) is ignored.
// With no id nothing is loaded.
export function useNarratorHadis(id, book) {
  const [state, setState] = useState({ key: null, status: LOADING, hadis: [] });
  const [attempt, setAttempt] = useState(0);
  const key = `${id}|${book}|${attempt}`;

  useEffect(() => {
    if (id === '') return undefined;
    let cancelled = false;
    loadNarratorHadis(id, book).then((result) => {
      if (!cancelled) setState({ key, status: result.status, hadis: result.hadis });
    });
    return () => {
      cancelled = true;
    };
  }, [id, book, key]);

  const retry = () => setAttempt((n) => n + 1);
  if (id === '') return { status: LOADING, hadis: [], retry };
  if (state.key !== key) return { status: LOADING, hadis: [], retry };
  return { status: state.status, hadis: state.hadis, retry };
}
