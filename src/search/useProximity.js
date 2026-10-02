'use client';

import { useEffect, useState } from 'react';
import { PROXIMITY_LIMIT, countNear, reorderTags } from '../lib/proximity';
import { loadHadisText } from '../lib/useHadisText';

// How many texts are asked for at a time. Small batches keep the progress honest, let the page
// answer taps in between, and let a changed search stop the rest.
export const PROXIMITY_BATCH = 10;

const OFF = { status: 'off', loaded: 0, total: 0, ordered: null, nearCount: 0, looked: 0 };
const WORKING = { ...OFF, status: 'working' };

// Re-ranks the best PROXIMITY_LIMIT of `tags` by how close the searched `words` are to each other
// in the text, once `enabled`. The texts come from the shared text cache (loadHadisText), so the
// results on the page do not fetch twice. A new list of tags, other words or switching off stops the
// batches still to come (a request already sent finishes into the cache).
//
// Returns { status: 'off' | 'working' | 'done', loaded, total, ordered, nearCount, looked }:
// `ordered` is the whole list in the new order once done, `looked` how many were examined.
export function useProximity({ tags, words, enabled }) {
  const [state, setState] = useState(OFF);
  const active = enabled && words.length >= 2 && tags.length >= 2;

  useEffect(() => {
    if (!active) {
      setState(OFF);
      return undefined;
    }
    let cancelled = false;
    const head = tags.slice(0, PROXIMITY_LIMIT);
    const texts = new Map();
    setState({ tags, words, status: 'working', loaded: 0, total: head.length, ordered: null, nearCount: 0, looked: head.length });

    (async () => {
      for (let start = 0; start < head.length; start += PROXIMITY_BATCH) {
        const batch = head.slice(start, start + PROXIMITY_BATCH);
        const results = await Promise.all(batch.map((tag) => loadHadisText(tag)));
        if (cancelled) return;
        results.forEach((result, i) => {
          if (result.status === 'ok') texts.set(batch[i], result.text);
        });
        const loaded = start + batch.length;
        setState((current) => ({ ...current, loaded }));
      }
      setState({
        tags,
        words,
        status: 'done',
        loaded: head.length,
        total: head.length,
        ordered: reorderTags(tags, texts, words),
        nearCount: countNear(tags, texts, words),
        looked: head.length,
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [active, tags, words]);

  if (!active) return OFF;
  // right after the tags or words change, until the effect has started on them, nothing is known yet
  return state.tags === tags && state.words === words ? state : WORKING;
}
