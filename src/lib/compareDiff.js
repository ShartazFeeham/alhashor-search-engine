import { splitHadis } from './hadisText';

// The words-difference behind the compare page. Each text is cut into words; a word is "marked"
// when no other column has it, and "matched" otherwise. Words are compared by a plain set of
// normalised spellings, with no alignment, so the same report in two books lights up wherever
// the wording really differs and a spelling variant counts as a different word.

// Punctuation, quotation marks, the danda, the visarga that ends "বলেছেনঃ" and a dangling hasanta
// are only trimmed from a word's ends, so a visarga inside a word (দুঃখ) is kept.
const EDGE = /^[\p{P}\p{S}ঃ্]+|[\p{P}\p{S}ঃ্]+$/gu;
const JOINERS = /[‌‍]/g;

// The comparison key of a word. NFD makes "য়" the same whether it is typed as one character or two.
export function normalizeWord(word) {
  return word.normalize('NFD').replace(JOINERS, '').replace(EDGE, '');
}

// The words of a text with the spacing in front of each, so the text can be rebuilt exactly. A
// hyphen ends a word ("(রাঃ)-কে" is "(রাঃ)-" and "কে"), and a word with no key (a run of dots)
// is shown but not counted.
export function tokenize(text) {
  const tokens = [];
  let end = 0;
  for (const match of text.matchAll(/\S+/g)) {
    let gap = text.slice(end, match.index);
    end = match.index + match[0].length;
    for (const piece of match[0].match(/[^-–—]+[-–—]*|[-–—]+/g)) {
      const key = normalizeWord(piece);
      tokens.push({ gap, text: piece, key, counted: key !== '' });
      gap = '';
    }
  }
  return tokens;
}

// The text that is compared: the saying alone, or the narrator chain too. The number in front is never part of it.
export function textFor(raw, { chain = false } = {}) {
  const parts = splitHadis(raw);
  return chain && parts.chain ? `${parts.chain} ${parts.body}` : parts.body;
}

// Below this share of matched words (over all columns), the texts are treated as unrelated and no
// word is marked: two hadis about different things still share function words (এবং, না, আল্লাহ), and
// marking everything else says nothing. Measured on real hadis, same-report pairs share 31% to 70% of
// their words (Bukhari 1 and Muslim 4774 31%, with Ibn Majah 4227 70%; Bukhari 23 and Tirmidhi 2616
// 59%) while unrelated pairs mostly share 5% to 20% (Bukhari 1 and Abu Dawud 2000 13%).
export const LOW_OVERLAP = 0.2;
// Fewer counted words than this and a share means little (a short text always looks unrelated).
const MIN_WORDS_TO_JUDGE = 12;

// One result per text: its words with `marked` set, how many words it has (`total`) and how many
// of those another column also has (`matched`). With fewer than two texts nothing is marked. When
// the matched share is below LOW_OVERLAP (`unrelated` is then true on every result) nothing is
// marked either, though `matched` still reports the real count.
export function compareTexts(texts) {
  const columns = texts.map(tokenize);
  const holders = new Map(); // key -> how many columns have the word
  for (const tokens of columns) {
    for (const key of new Set(tokens.filter((token) => token.counted).map((token) => token.key))) {
      holders.set(key, (holders.get(key) ?? 0) + 1);
    }
  }
  const results = columns.map((tokens) => {
    const marked = tokens.map((token) => ({
      ...token,
      marked: columns.length > 1 && token.counted && holders.get(token.key) === 1,
    }));
    const counted = marked.filter((token) => token.counted);
    const matched = columns.length > 1 ? counted.filter((token) => !token.marked).length : 0;
    return { tokens: marked, total: counted.length, matched };
  });
  const total = results.reduce((sum, result) => sum + result.total, 0);
  const matched = results.reduce((sum, result) => sum + result.matched, 0);
  const unrelated = columns.length > 1 && total >= MIN_WORDS_TO_JUDGE && matched / total < LOW_OVERLAP;
  return results.map((result) => ({
    ...result,
    unrelated,
    tokens: unrelated ? result.tokens.map((token) => ({ ...token, marked: false })) : result.tokens,
  }));
}

// A column's words as runs: plain text and marked text, so a page renders a few pieces instead of
// one element per word. Spacing always sits in a plain run, so a mark never underlines a space.
export function toSegments(tokens) {
  const segments = [];
  for (const token of tokens) {
    const marked = Boolean(token.marked);
    const last = segments[segments.length - 1];
    if (last && last.marked === marked) {
      last.text += token.gap + token.text;
    } else if (marked) {
      if (last) last.text += token.gap;
      else if (token.gap) segments.push({ text: token.gap, marked: false });
      segments.push({ text: token.text, marked: true });
    } else {
      segments.push({ text: token.gap + token.text, marked: false });
    }
  }
  return segments;
}
