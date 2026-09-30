import { BOOKS, bookByCode, bookById, hasHadis } from './books';

export function tagOf(bookId, number) {
  return `${bookById(bookId).code}-${number}`;
}

export function parseTag(tag) {
  const match = /^([A-Z]{3})-(\d+)$/.exec(tag);
  const book = match && bookByCode(match[1]);
  return book ? { book, number: Number(match[2]) } : null;
}

export function hadisHref(bookId, number) {
  return `/hadis/${bookId}/${number}`;
}

// The address parts /hadis/<book>/<number> as a book and a number, or null if they are not one.
export function parseHadisParams(bookSlug, numberText) {
  const book = BOOKS.find((b) => b.slug === bookSlug);
  if (!book || !/^\d+$/.test(numberText)) return null;
  const number = Number(numberText);
  return number >= 1 && number <= book.total ? { book, number } : null;
}

// The nearest existing hadis numbers before and after, in the same book.
export function neighbours(book, number) {
  let prev = number - 1;
  while (prev >= 1 && !hasHadis(book, prev)) prev--;
  let next = number + 1;
  while (next <= book.total && !hasHadis(book, next)) next++;
  return { prev: prev >= 1 ? prev : null, next: next <= book.total ? next : null };
}
