// "Did you mean": pure helpers that turn a word with few or no hadis into spellings worth trying.
// Nothing here fetches anything. The caller checks each candidate against the data files and keeps
// only the ones that return hadis (see rankSuggestions and searchIndex's suggest).
//
// Three sources of candidates, best first:
//   synonym  a hand-made list of real pairs (src/data/searchSynonyms.js)
//   variant  the word with commonly confused letters swapped (ি/ী, শ/ষ/স, জ/য, ...). This is the
//            only source that can fix a mistake in the first two letters, which decide the data
//            file a word is looked up in
//   close    a word in the data file the typed word lives in that is one edit away (a missing,
//            extra, wrong or swapped letter)
// Spelling forms the data already writes two ways (য় as one character or two, ো, joiners) are not
// handled here: the search already matches those (see normalizeBengali).

import { normalizeBengali } from '../Helpers/bengali';
import { SYNONYM_GROUPS } from '../data/searchSynonyms';

const LETTER = /[অ-হড়-য়]/;
const NUKTA = '়';
const MAX_VARIANTS = 60;
const MAX_SUGGESTIONS = 3;
const KIND_ORDER = ['synonym', 'variant', 'close'];

// Letters people mix up in Bengali spelling. Each pair works both ways.
const CONFUSED_PAIRS = [
  ['ি', 'ী'], ['ু', 'ূ'], ['ই', 'ঈ'], ['উ', 'ঊ'],
  ['শ', 'ষ'], ['শ', 'স'], ['ষ', 'স'], ['স', 'ছ'],
  ['ন', 'ণ'], ['জ', 'য'], ['ত', 'ট'], ['থ', 'ঠ'], ['দ', 'ড'], ['ধ', 'ঢ'],
  ['র', 'ড়'], ['য়', 'য'],
  ['ও', 'উ'], ['ো', 'ু'], ['ো', 'ও'],
];

const SWAPS = new Map();
for (const [a, b] of CONFUSED_PAIRS) {
  const [x, y] = [normalizeBengali(a), normalizeBengali(b)];
  SWAPS.set(x, [...(SWAPS.get(x) || []), y]);
  SWAPS.set(y, [...(SWAPS.get(y) || []), x]);
}

export function hasBengali(word) {
  return LETTER.test(word);
}

// A letter with its dot (য়, ড়, ঢ়) is one unit, so a swap never leaves a stray dot behind.
function units(word) {
  const out = [];
  for (const char of Array.from(normalizeBengali(word))) {
    if (char === NUKTA && out.length > 0) out[out.length - 1] += char;
    else out.push(char);
  }
  return out;
}

// Spellings reached by swapping one confused letter, then (while room is left) two. Never the word
// itself, never a repeat, at most MAX_VARIANTS.
export function confusionVariants(word) {
  const parts = units(word);
  const original = parts.join('');
  const seen = new Set([original]);
  const found = [];
  const add = (candidate) => {
    if (found.length >= MAX_VARIANTS || seen.has(candidate)) return;
    seen.add(candidate);
    found.push(candidate);
  };

  const swapsAt = (index) => SWAPS.get(parts[index]) || [];
  for (let i = 0; i < parts.length; i++) {
    for (const swap of swapsAt(i)) add([...parts.slice(0, i), swap, ...parts.slice(i + 1)].join(''));
  }
  for (let i = 0; i < parts.length; i++) {
    for (let j = i + 1; j < parts.length; j++) {
      for (const first of swapsAt(i)) {
        for (const second of swapsAt(j)) {
          add([...parts.slice(0, i), first, ...parts.slice(i + 1, j), second, ...parts.slice(j + 1)].join(''));
        }
      }
    }
  }
  return found;
}

export function synonymsOf(word, groups = SYNONYM_GROUPS) {
  const normalized = normalizeBengali(word);
  const group = groups.find((members) => members.includes(normalized));
  return group ? group.filter((member) => member !== normalized) : [];
}

// Exactly one insertion, deletion, replacement or swap of neighbouring letters apart.
export function withinOneEdit(a, b) {
  if (a === b) return false;
  const x = Array.from(a);
  const y = Array.from(b);
  if (Math.abs(x.length - y.length) > 1) return false;
  let i = 0;
  while (i < x.length && i < y.length && x[i] === y[i]) i++;
  if (x.length === y.length) {
    if (x.slice(i + 1).join('') === y.slice(i + 1).join('')) return true; // one letter replaced
    return x[i] === y[i + 1] && x[i + 1] === y[i] && x.slice(i + 2).join('') === y.slice(i + 2).join('');
  }
  const [long, short] = x.length > y.length ? [x, y] : [y, x];
  return long.slice(i + 1).join('') === short.slice(i).join('');
}

// [word, count] pairs of the vocabulary (a Map or any iterable of pairs) one edit from the word,
// the most frequent first.
export function closeWords(word, vocabulary) {
  const target = normalizeBengali(word);
  const close = [];
  for (const [candidate, count] of vocabulary) {
    if (withinOneEdit(target, candidate)) close.push([candidate, count]);
  }
  return close.sort((a, b) => b[1] - a[1]);
}

// Every candidate for a word, [{ word, kind }], best kinds first, each spelling once.
export function candidatesFor(word, vocabulary) {
  const own = normalizeBengali(word);
  const seen = new Set([own]);
  const candidates = [];
  const add = (candidate, kind) => {
    if (seen.has(candidate)) return;
    seen.add(candidate);
    candidates.push({ word: candidate, kind });
  };
  synonymsOf(own).forEach((candidate) => add(candidate, 'synonym'));
  confusionVariants(own).forEach((candidate) => add(candidate, 'variant'));
  closeWords(own, vocabulary).forEach(([candidate]) => add(candidate, 'close'));
  return candidates;
}

// From candidates checked against the data ([{ word, kind, hits }], hits = how many hadis the
// spelling returns), the ones worth offering: it must return hadis, and clearly more than the
// word the visitor typed (`originalHits`). Synonyms first, then swaps, then close words; inside a
// kind the one with most hadis first.
export function rankSuggestions(originalHits, checked, max = MAX_SUGGESTIONS) {
  const needed = Math.max(1, originalHits * 2 + 1);
  return checked
    .filter((candidate) => candidate.hits >= needed)
    .sort((a, b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind) || b.hits - a.hits)
    .slice(0, max);
}
