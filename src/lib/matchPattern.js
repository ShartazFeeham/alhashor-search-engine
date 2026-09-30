import { normalizeBengali } from '../Helpers/bengali';

const JOINER = '[\\u200c\\u200d]*';
const escape = (char) => char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Normalized unit (what normalizeBengali produces) -> pattern accepting every way the data spells it.
const UNITS = [
  ['য়', '(?:\\u09af\\u09bc|\\u09df)'], // য়
  ['ড়', '(?:\\u09a1\\u09bc|\\u09dc)'], // ড়
  ['ঢ়', '(?:\\u09a2\\u09bc|\\u09dd)'], // ঢ়
  ['ো', '(?:\\u09cb|\\u09c7\\u09be)'], // ো
  ['ৌ', '(?:\\u09cc|\\u09c7\\u09d7)'], // ৌ
];

function wordPattern(word) {
  const normalized = normalizeBengali(word);
  const pieces = [];
  for (let i = 0; i < normalized.length;) {
    const unit = UNITS.find(([canonical]) => normalized.startsWith(canonical, i));
    if (unit) {
      pieces.push(unit[1]);
      i += unit[0].length;
    } else {
      pieces.push(escape(normalized[i]));
      i += 1;
    }
  }
  return pieces.join(JOINER);
}

export function buildMatcher(words) {
  const patterns = words.map((w) => w.trim()).filter(Boolean).map(wordPattern);
  return patterns.length ? new RegExp(patterns.join('|'), 'gi') : null;
}

export function highlightParts(text, matcher) {
  if (!matcher) return [{ text, match: false }];
  const parts = [];
  let last = 0;
  for (const match of text.matchAll(matcher)) {
    if (match[0] === '') continue;
    if (match.index > last) parts.push({ text: text.slice(last, match.index), match: false });
    parts.push({ text: match[0], match: true });
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push({ text: text.slice(last), match: false });
  return parts.length ? parts : [{ text, match: false }];
}

export function makeSnippet(text, matcher, { before = 70, after = 95 } = {}) {
  const limit = before + after + 40;
  if (text.length <= limit) return { text, cutStart: false, cutEnd: false };
  const first = matcher ? new RegExp(matcher.source, 'i').exec(text) : null;
  if (!first) {
    const end = text.lastIndexOf(' ', before + after);
    return { text: text.slice(0, end > 0 ? end : before + after), cutStart: false, cutEnd: true };
  }
  let start = Math.max(0, first.index - before);
  let end = Math.min(text.length, first.index + first[0].length + after);
  if (start > 0) {
    const space = text.indexOf(' ', start);
    if (space !== -1 && space < first.index) start = space + 1;
  }
  if (end < text.length) {
    const space = text.lastIndexOf(' ', end);
    if (space > first.index + first[0].length) end = space;
  }
  return { text: text.slice(start, end).trim(), cutStart: start > 0, cutEnd: end < text.length };
}
