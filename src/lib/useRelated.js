'use client';

import { useEffect, useState } from 'react';
import { bookById } from './books';
import { loadRelated } from './related';

// { status: 'loading' | 'ok' | 'error', items } for the hadis. Moving to another hadis starts at 'loading'.
export function useRelated(bookId, number) {
  const key = `${bookId}-${number}`;
  const [state, setState] = useState({ key, status: 'loading', items: [] });

  useEffect(() => {
    let cancelled = false;
    const book = bookById(bookId);
    if (!book) return undefined;
    loadRelated(book, number).then((result) => {
      if (!cancelled) setState({ key, status: result.status, items: result.items });
    });
    return () => {
      cancelled = true;
    };
  }, [bookId, number, key]);

  const current = state.key === key ? state : { key, status: 'loading', items: [] };
  return { status: current.status, items: current.items };
}
