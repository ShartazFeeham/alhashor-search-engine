import { formatNumber } from './digits';

const NUMBER_PREFIX = /^\s*((?:[০-৯]+\/)?[০-৯]+)\s*[।.]\s*/;
const CHAIN_END = /(?:থেকে|হতে)\s+বর্ণিত(?:\s+আছে\s+যে)?(?:,|।|:|ঃ)?/;
const SEARCH_WINDOW = 400;

// Shows the first and last narrator, joined by an ellipsis, when the chain has several.
function summarise(names) {
  const parts = names.split(/\s*(?:\.{2,}|…)\s*/).map((part) => part.trim()).filter(Boolean);
  if (parts.length <= 1) return parts[0] || '';
  return `${parts[0]} ... ${parts[parts.length - 1]}`;
}

// A hadis text is usually: number, chain of narrators ("... থেকে বর্ণিত"), then the saying.
// When no chain is recognised the whole text (after the number) is the body, so nothing is lost.
export function splitHadis(text) {
  const numberMatch = NUMBER_PREFIX.exec(text);
  const number = numberMatch ? numberMatch[1] : '';
  const rest = numberMatch ? text.slice(numberMatch[0].length) : text;
  const end = CHAIN_END.exec(rest.slice(0, SEARCH_WINDOW));
  if (!end) return { number, chain: '', body: rest.trim(), summary: '' };
  const chainEnd = end.index + end[0].length;
  return {
    number,
    chain: rest.slice(0, chainEnd).trim(),
    body: rest.slice(chainEnd).trim(),
    summary: summarise(rest.slice(0, end.index)),
  };
}

export function wordCount(text) {
  return text.split(/\s+/).filter(Boolean).length;
}

export function readingTime(words) {
  if (words < 45) return 'আধা মিনিটেরও কম';
  return `প্রায় ${formatNumber(Math.ceil(words / 150), 'bn')} মিনিট`;
}
