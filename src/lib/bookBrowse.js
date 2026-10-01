import { HADIS_PER_PAGE } from '../Helpers/paging';
import { BOOKS, hasHadis } from './books';
import { toEnglishDigits } from './digits';

const RANGE_SIZE = 100;

export function pageCount(book) {
  const hadis = book.total - book.missing.reduce((sum, [first, last]) => sum + (last - first + 1), 0);
  return Math.ceil(hadis / HADIS_PER_PAGE);
}

// Pages are 20 hadis that exist, so a gap in the numbers never leaves a short or empty page.
// The hadis number at a 0-based position among the hadis that exist.
function numberAt(book, index) {
  let number = index + 1;
  for (const [first, last] of book.missing) {
    if (number < first) break;
    number += last - first + 1;
  }
  return number;
}

// The 0-based position of a number among the hadis that exist; for a number with no file, the
// position of the next hadis after it.
function positionOf(book, number) {
  let before = 0;
  for (const [first, last] of book.missing) {
    if (first >= number) break;
    before += Math.min(last, number - 1) - first + 1;
  }
  return number - 1 - before;
}

export function pageNumbers(book, page) {
  const numbers = [];
  let number = numberAt(book, page * HADIS_PER_PAGE);
  while (numbers.length < HADIS_PER_PAGE && number <= book.total) {
    if (hasHadis(book, number)) numbers.push(number);
    number++;
  }
  return numbers;
}

export function pageOfNumber(book, number) {
  return Math.floor(positionOf(book, number) / HADIS_PER_PAGE);
}

// Ranges of a hundred numbers, each with the page of its first hadis (null when the whole
// range has none).
export function rangeGrid(book) {
  const grid = [];
  for (let from = 1; from <= book.total; from += RANGE_SIZE) {
    const to = Math.min(from + RANGE_SIZE - 1, book.total);
    let first = from;
    for (const [gapFirst, gapLast] of book.missing) {
      if (first >= gapFirst && first <= gapLast) first = gapLast + 1;
    }
    grid.push({ from, to, page: first <= to ? pageOfNumber(book, first) : null });
  }
  return grid;
}

// Spellings a visitor may type for each book. Names are compared without spaces, case, apostrophe
// styles and the words "শরীফ", "সুনান", "sahih" and so on.
const EXTRA_NAMES = {
  bukhari: ['bukhari', 'বুখারি'],
  muslim: ['muslim'],
  tirmidhi: ['tirmidhi', 'tirmizi', 'tirmiji', 'তিরমিজি'],
  abudawud: ['abudawud', 'abu dawud', 'abu daud', 'আবূ দাউদ'],
  ibnmajah: ['ibnmajah', 'ibn majah', 'ibn maja', 'ইবনে মাজাহ', 'ইবনু মাজাহ'],
  nasai: ['nasai', "nasa'i", 'nasae', 'নাসায়ী'],
};

const plain = (text) =>
  text
    .toLowerCase()
    .replace(/[’‘ʼ`]/g, "'")
    .replace(/শরীফ|সুনানু|সুনান|সহীহ|নং|\b(?:sharif|sahih|sunan|no)\b/g, ' ')
    .replace(/[\s\-_,:.#]+/g, '');

const NAMES = BOOKS.flatMap((book) =>
  [book.name, book.full, book.legacyName, book.cite, ...EXTRA_NAMES[book.id]].map((name) => [plain(name), book])
);

// "বুখারী ১২৩৪", "bukhari 1234" or just "১২৩৪" (with `fallback`, the book already open). A trailing
// "নং", "#" and thousands commas are fine; a leading minus is not a number.
export function parseJump(text, fallback = null) {
  const cleaned = toEnglishDigits(text.trim()).replace(/(\d),(?=\d)/g, '$1').replace(/\s*(?:নং|no\.?)\s*$/i, '');
  if (cleaned.startsWith('-')) return null;
  const match = /^(.*?)[\s\-_,:.#]*(\d+)\s*$/.exec(cleaned);
  if (!match) return null;
  const name = plain(match[1]);
  const book = name === '' ? fallback : NAMES.find(([known]) => known === name)?.[1];
  return book ? { book, number: Number(match[2]) } : null;
}

export function checkJump(book, number) {
  if (number < 1 || number > book.total) return { ok: false, reason: 'range', max: book.total };
  if (!hasHadis(book, number)) return { ok: false, reason: 'gap' };
  return { ok: true };
}

// The id a hadis gets on its book page.
export const hadisAnchor = (number) => `h${number}`;

// The address of a book's page (0-based `page`; the first page has no "?page=") and, optionally,
// of a hadis on it to mark and scroll to (?hadis=64).
export function bookHref(book, page = 0, number = null) {
  const query = [page > 0 && `page=${page + 1}`, number !== null && `hadis=${number}`].filter(Boolean).join('&');
  return `/books/${book.slug}${query ? `?${query}` : ''}`;
}
