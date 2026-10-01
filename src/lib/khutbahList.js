import { BOOKS, bookById, hasHadis } from './books';

// The khutbah list lives in the address: ?ids=bukhari-1234,muslim-5. These helpers read and
// write that text. Every id has one spelling (book id, a dash, a plain number), and anything
// that is not a real hadis, or is a repeat, is dropped, so a hand-edited address cannot break the page.
export const MAX_ITEMS = 30;

const ID = /^([a-z]+)-([1-9]\d*)$/;

export const idOf = (item) => `${item.bookId}-${item.number}`;

export function isValid(item) {
  const book = bookById(item?.bookId);
  return Boolean(book) && hasHadis(book, item.number);
}

export function parseIds(text) {
  if (!text) return [];
  const items = [];
  const seen = new Set();
  for (const part of String(text).split(',')) {
    const match = ID.exec(part.trim());
    if (!match || !BOOKS.some((book) => book.id === match[1])) continue;
    const item = { bookId: match[1], number: Number(match[2]) };
    if (!isValid(item) || seen.has(idOf(item))) continue;
    seen.add(idOf(item));
    items.push(item);
    if (items.length === MAX_ITEMS) break;
  }
  return items;
}

export const serializeIds = (items) => items.map(idOf).join(',');

// { items, status } with status 'added', 'duplicate', 'full' or 'invalid'; `items` is the same
// array when nothing was added.
export function addItem(items, item) {
  if (!isValid(item)) return { items, status: 'invalid' };
  if (items.some((existing) => idOf(existing) === idOf(item))) return { items, status: 'duplicate' };
  if (items.length >= MAX_ITEMS) return { items, status: 'full' };
  return { items: [...items, { bookId: item.bookId, number: item.number }], status: 'added' };
}

export function removeAt(items, index) {
  return index >= 0 && index < items.length ? items.filter((_, i) => i !== index) : items;
}

export function moveItem(items, index, delta) {
  const target = index + delta;
  if (index < 0 || index >= items.length || target < 0 || target >= items.length) return items;
  const next = [...items];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}
