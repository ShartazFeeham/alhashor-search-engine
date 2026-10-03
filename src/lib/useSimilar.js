'use client';

import { useEffect, useState } from 'react';
import { searchClient } from '../search/searchClient';
import { parseTag, tagOf } from './hadisRoute';
import { orderSimilar } from './similarOrder';
import { sharedWordCount, similarWords } from './similarWords';
import { loadHadisText } from './useHadisText';

// The hadis kept loaded for the list: the top of the search, the page itself left out.
export const KEEP_SIMILAR = 20;

// Similar hadis by a live search with the meaningful words of the whole text (the saying and the
// chain), ranked as on the search page (the most words matched first), and among hadis with the same
// number of matched words the shortest first (similarOrder.js). The texts of the kept hadis are loaded
// for that (they are shown anyway, and the load is shared with the cards). { status, tags, words }:
// status is 'loading', 'ok' or 'error'; tags are at most KEEP_SIMILAR hadis tags.
export function useSimilar(bookId, number, text) {
  const tag = tagOf(bookId, number);
  const key = `${tag}|${text}`;
  const [state, setState] = useState({ key: null, status: 'loading', tags: [], words: [] });

  useEffect(() => {
    let cancelled = false;
    const words = similarWords(text);
    const request = words.length > 0 ? searchClient.search(words) : { promise: Promise.resolve([]), cancel() {} };
    request.promise.then(
      (found) => {
        if (cancelled || !Array.isArray(found)) return;
        // which hadis are kept is decided by the search order alone; only their order changes below
        const kept = found.filter((other) => other !== tag && parseTag(other) !== null).slice(0, KEEP_SIMILAR);
        Promise.all(kept.map((other) => loadHadisText(other))).then((loaded) => {
          if (cancelled) return;
          const entries = kept.map((other, index) => {
            const text = loaded[index].status === 'ok' ? loaded[index].text : null;
            return { tag: other, text, matched: text === null ? 0 : sharedWordCount(text, words) };
          });
          setState({ key, status: 'ok', tags: orderSimilar(entries).map((entry) => entry.tag), words });
        });
      },
      () => {
        if (!cancelled) setState({ key, status: 'error', tags: [], words });
      }
    );
    return () => {
      cancelled = true;
      request.cancel();
    };
  }, [key, tag, text]);

  return state.key === key ? state : { key, status: 'loading', tags: [], words: [] };
}
