import { formatNumber } from './digits';

// The hadis number: "৬৬২৮।", "৯৮৭.", "২৫/২০১।" (Ibn Majah: book/number), also "২৪৭৯," and a few
// books that put only a space after it ("১২৫২ হাসান ..."), and a stray ASCII digit ("8/১৭৫।").
const NUMBER_PREFIX = /^\s*((?:[০-৯0-9]+\s*\/\s*)?[০-৯0-9]+)(?:\s*[।.,]\s*|\s+(?=[^০-৯0-9\s]))/;
// "... থেকে বর্ণিত", "... হতে বর্ণিত", "... সূত্রে বর্ণিত" (also the typos "খেকে", "থকে", "সুত্রে" and "বৰ্ণিত"),
// optionally followed by "আছে" and/or "যে" and a mark. They belong to the chain, not to the saying.
const CHAIN_END = /(?:থেকে|হতে|সূত্রে|সুত্রে|খেকে|থকে)\s+(?:বর্ণিত|বৰ্ণিত)(?:\s+আছে(?![\u0980-\u09FF]))?(?:\s+যে(?![\u0980-\u09FF]))?(?:,|।|:|ঃ)?/;
const ARABIC = /[\u0600-\u06FF]/;
const SEARCH_WINDOW = 400;
// Text before "থেকে বর্ণিত" is a chain of names only when it is short and has no sentence in it;
// otherwise it is part of the saying (a chapter heading, a statement, a verse, an Arabic quotation).
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
  const number = numberMatch ? numberMatch[1].replace(/\s+/g, '') : '';
  const rest = numberMatch ? text.slice(numberMatch[0].length) : text;
  const end = CHAIN_END.exec(rest.slice(0, SEARCH_WINDOW));
  const names = end ? rest.slice(0, end.index) : '';
  const chainEnd = end ? end.index + end[0].length : 0;
  if (!end || names.length > MAX_CHAIN_LENGTH || names.includes('।') || ARABIC.test(names) || rest.slice(chainEnd).trim() === '') {
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
