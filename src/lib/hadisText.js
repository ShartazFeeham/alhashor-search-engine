import { formatNumber } from './digits';

const NUMBER_PREFIX = /^\s*((?:[০-৯]+\/)?[০-৯]+)\s*[।.]\s*/;
const CHAIN_END = /(?:থেকে|হতে)\s+বর্ণিত(?:\s+আছে\s+যে)?(?:,|।|:|ঃ)?/;
const SEARCH_WINDOW = 400;
// Text before "থেকে বর্ণিত" is a chain of names only when it is short and has no sentence in it;
// otherwise it is part of the saying (a chapter heading, a statement, a verse).
const MAX_CHAIN_LENGTH = 200;

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
  const names = end ? rest.slice(0, end.index) : '';
  const chainEnd = end ? end.index + end[0].length : 0;
  if (!end || names.length > MAX_CHAIN_LENGTH || names.includes('।') || rest.slice(chainEnd).trim() === '') {
    return { number, chain: '', body: rest.trim(), summary: '' };
  }
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
