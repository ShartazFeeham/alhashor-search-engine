'use client';

import { useEffect, useMemo, useState } from 'react';
import { tagFromId } from '../lib/compareList';
import { loadHadisText } from '../lib/useHadisText';

const LOADING = { status: 'loading', text: '' };

// The texts of the chosen hadis, each as { status: 'loading' | 'ok' | 'missing' | 'error', text },
// by id. They load side by side (the same cached loader as useHadisText, which takes one hadis and
// so cannot be called for a list that grows and shrinks), and each shows up as soon as it arrives.
export function useCompareTexts(ids) {
  const [results, setResults] = useState({});
  const [attempt, setAttempt] = useState(0);
  // A caller's array is a new object on most renders; its text is what counts.
  const key = ids.join(',');
  const list = useMemo(() => (key ? key.split(',') : []), [key]);

  useEffect(() => {
    let cancelled = false;
    for (const id of list) {
      loadHadisText(tagFromId(id)).then((result) => {
        if (!cancelled) setResults((all) => ({ ...all, [id]: { status: result.status, text: result.text || '' } }));
      });
    }
    return () => {
      cancelled = true;
    };
  }, [list, attempt]);

  const retry = () => {
    setResults((all) => Object.fromEntries(Object.entries(all).filter(([, result]) => result.status !== 'error')));
    setAttempt((n) => n + 1);
  };

  const texts = useMemo(() => Object.fromEntries(list.map((id) => [id, results[id] ?? LOADING])), [list, results]);
  return { texts, retry };
}
