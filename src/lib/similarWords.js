import stopwordList from '../data/stopwords.json';
import { normalizeBengali, normalizeQuery } from '../search/searchIndex';

// The search for similar hadis opens one data file per word, so a long hadis keeps only its 25
// longest distinct words (long words are rarer on average, so they narrow the search most).
export const MAX_SIMILAR_WORDS = 25;

// The common words (scripts/build-stopwords.mjs: the words that are in more than 750 hadis).
const STOPWORDS = new Set(stopwordList.map(normalizeBengali));

const EDGE_MARKS = /^[‘’“”«»]+|[‘’“”«»]+$/g;
// A hyphen joins a word to its suffix ("ওয়াসাল্লাম-কে"), so each part is judged on its own.
const HYPHENS = /[-–—]+/;
const DIGIT = /[0-9০-৯]/;
// Letters with their vowel signs: "তিনি" is 4 characters.
const length = (word) => (word.match(/[\p{L}\p{M}]/gu) || []).length;

// The words of a hadis text worth searching with: common words, words of one or two letters and
// words with digits are removed, each word is kept once (in its normalised spelling), and at most
// `max` remain, the longest first.
export function similarWords(text, { stopwords = STOPWORDS, max = MAX_SIMILAR_WORDS } = {}) {
  const skip = stopwords === STOPWORDS ? stopwords : new Set([...stopwords].map(normalizeBengali));
  const kept = new Set();
  for (const raw of normalizeQuery(text).flatMap((part) => part.split(HYPHENS))) {
    const word = normalizeBengali(raw).replace(EDGE_MARKS, '');
    if (length(word) > 2 && !DIGIT.test(word) && !skip.has(word)) kept.add(word);
  }
  return [...kept].sort((a, b) => length(b) - length(a)).slice(0, max);
}

// How many of the searched words a hadis text contains (inside a longer word too, as the search does).
export function sharedWordCount(text, words) {
  const haystack = normalizeBengali(text);
  return words.filter((word) => haystack.includes(word)).length;
}
