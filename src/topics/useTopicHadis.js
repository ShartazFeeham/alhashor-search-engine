'use client';

import { useEffect, useState } from 'react';
import { loadTopicHadis } from '../lib/topics';

export const IDLE = 'idle';
export const LOADING = 'loading';
export const DONE = 'done';
export const FAILED = 'failed';

// Looks up a topic's hadis whenever the topic changes: { status, hadis, retry }. A lookup that
// finishes after the topic has changed (or the page was left) is ignored, so a slow earlier topic
// can never replace a later one. `search` is injectable for tests.
export function useTopicHadis(topic, search) {
  const [state, setState] = useState({ topic: null, status: IDLE, hadis: [] });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (topic === '') return undefined;
    let cancelled = false;
    loadTopicHadis(topic, search).then(
      (hadis) => {
        if (!cancelled) setState({ topic, status: DONE, hadis });
      },
      () => {
        if (!cancelled) setState({ topic, status: FAILED, hadis: [] });
      }
    );
    return () => {
      cancelled = true;
    };
  }, [topic, search, attempt]);

  const retry = () => {
    setState({ topic: null, status: IDLE, hadis: [] });
    setAttempt((n) => n + 1);
  };

  if (topic === '') return { status: IDLE, hadis: [], retry };
  if (state.topic !== topic) return { status: LOADING, hadis: [], retry };
  return { status: state.status, hadis: state.hadis, retry };
}
