// Word proximity: how close together the searched words are inside a hadis text. Pure functions;
// the texts themselves are fetched by the caller (see src/search/useProximity.js).
//
// A text word counts for a searched word when it contains it (so ইফতারের counts for ইফতার, as in
// the search itself). One text word counts for one searched word only: when it holds several
// (রাসূল inside রাসূলুল্লাহ) it counts for the longest, so two searched words are never "found"
// in the same place.

import { normalizeBengali } from '../Helpers/bengali';

// "Near" means every searched word is within this many words of the others.
export const NEAR_WORDS = 5;
// Only this many of the best results are re-ranked: each needs its text fetched.
export const PROXIMITY_LIMIT = 300;

// Spaces, and the slashes, brackets and marks the translations use to join spellings and set
// off phrases ("সালাত (নামায/নামাজ)").
const SEPARATORS = /[\s/()[\]{},;:।!?"“”…]+/;
const HAS_LETTER = /[\p{L}\p{N}]/u;

export function tokenize(text) {
  if (typeof text !== 'string') return [];
  return normalizeBengali(text).split(SEPARATORS).filter((token) => HAS_LETTER.test(token));
}

// { found, total, span }: how many of the distinct searched words are in the text, out of how
// many, and the narrowest stretch that holds all the found ones (the number of words from the
// first to the last: 1 for next to each other; 0 when only one is found; null when none is).
export function proximityOf(text, words) {
  const query = [...new Set(words.map(normalizeBengali).filter(Boolean))];
  const total = query.length;
  const tokens = tokenize(text);
  const events = []; // [position, searched word index], in text order
  tokens.forEach((token, position) => {
    let best = -1;
    query.forEach((word, index) => {
      if (token.includes(word) && (best === -1 || word.length > query[best].length)) best = index;
    });
    if (best !== -1) events.push([position, best]);
  });

  const found = new Set(events.map(([, index]) => index)).size;
  if (found === 0) return { found: 0, total, span: null };
  if (found === 1) return { found: 1, total, span: 0 };

  // Narrowest window of the event list holding every found word.
  const counts = new Map();
  let have = 0;
  let left = 0;
  let span = Infinity;
  events.forEach(([position, index]) => {
    counts.set(index, (counts.get(index) || 0) + 1);
    if (counts.get(index) === 1) have++;
    while (have === found) {
      span = Math.min(span, position - events[left][0]);
      const leftIndex = events[left][1];
      counts.set(leftIndex, counts.get(leftIndex) - 1);
      if (counts.get(leftIndex) === 0) have--;
      left++;
    }
  });
  return { found, total, span };
}

export function isNear({ found, total, span }) {
  return total >= 2 && found === total && span <= NEAR_WORDS;
}

// Tags, best first: the hadis with every word near each other (the closest first), then those with
// every word (the closest first), then the rest (the most words first). Ties keep the search's
// order. `items` is [{ tag, text }] in that order; a missing text counts as no word found.
export function rankByProximity(items, words) {
  return items
    .map(({ tag, text }, order) => {
      const proximity = proximityOf(text, words);
      const complete = proximity.found === proximity.total && proximity.total > 0;
      const tier = isNear(proximity) ? 0 : complete ? 1 : 2;
      return { tag, order, tier, found: proximity.found, span: proximity.span ?? 0 };
    })
    .sort((a, b) => a.tier - b.tier
      || (a.tier === 2 ? b.found - a.found : a.span - b.span)
      || a.order - b.order)
    .map(({ tag }) => tag);
}

// How many of the first `limit` tags have every searched word within NEAR_WORDS of each other.
export function countNear(tags, texts, words, limit = PROXIMITY_LIMIT) {
  return tags.slice(0, limit).filter((tag) => isNear(proximityOf(texts.get(tag), words))).length;
}

// The whole result list with its first `limit` tags re-ranked by proximity (`texts` is a Map of
// tag -> text) and the rest left where they were, after them.
export function reorderTags(tags, texts, words, limit = PROXIMITY_LIMIT) {
  const head = tags.slice(0, limit).map((tag) => ({ tag, text: texts.get(tag) }));
  return [...rankByProximity(head, words), ...tags.slice(limit)];
}
