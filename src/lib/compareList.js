import { bookById, hasHadis } from './books';
import { parseTag, tagOf } from './hadisRoute';
import { readWithLegacy } from './legacyStorage';

// The hadis chosen for comparison, as ids like "bukhari-1234" (the book id, a dash, a plain
// number). The same text is the address (?ids=bukhari-1234,muslim-5) and the copy kept for this
// visit. Anything that is not a real hadis, or is a repeat, is dropped, and at most four are kept,
// so a hand-edited address or stale storage cannot break the page.
export const MAX_COMPARE = 4;
export const STORAGE_KEY = 'alhashor.compare';
export const LEGACY_KEY = 'boikotha.compare'; // the key before the site was renamed; read once, then copied

const ID = /^([a-z]+)-([1-9]\d*)$/;

export const idOf = (bookId, number) => `${bookId}-${number}`;

// { book, number } for a real hadis id, otherwise null.
export function splitId(id) {
  const match = ID.exec(String(id ?? ''));
  const book = match && bookById(match[1]);
  if (!book) return null;
  const number = Number(match[2]);
  return hasHadis(book, number) ? { book, number } : null;
}

// The tag the hadis text loader takes ("BUK-1234"), or null if the id is not a real hadis.
export function tagFromId(id) {
  const parts = splitId(id);
  return parts ? tagOf(parts.book.id, parts.number) : null;
}

export function idFromTag(tag) {
  const parts = parseTag(tag);
  return parts ? idOf(parts.book.id, parts.number) : null;
}

export function parseIds(text) {
  if (!text) return [];
  const ids = [];
  for (const part of String(text).split(',')) {
    const id = part.trim();
    if (!splitId(id) || ids.includes(id)) continue;
    ids.push(id);
    if (ids.length === MAX_COMPARE) break;
  }
  return ids;
}

export const serializeIds = (ids) => ids.join(',');

// The address of the compare page. `chain` keeps the narrator-chain switch in the link.
export function compareHref(ids, { chain = false } = {}) {
  const query = [ids.length > 0 && `ids=${serializeIds(ids)}`, chain && 'chain=1'].filter(Boolean).join('&');
  return `/compare${query ? `?${query}` : ''}`;
}

// { ids, status } with status 'added', 'duplicate', 'full' or 'invalid'; `ids` is the same array
// when nothing was added.
export function addId(ids, id) {
  if (!splitId(id)) return { ids, status: 'invalid' };
  if (ids.includes(id)) return { ids, status: 'duplicate' };
  if (ids.length >= MAX_COMPARE) return { ids, status: 'full' };
  return { ids: [...ids, id], status: 'added' };
}

export const removeId = (ids, id) => (ids.includes(id) ? ids.filter((existing) => existing !== id) : ids);

// Adds a hadis that is not chosen, removes one that is. status: 'added', 'removed', 'full' or 'invalid'.
export function toggleId(ids, id) {
  if (ids.includes(id)) return { ids: removeId(ids, id), status: 'removed' };
  return addId(ids, id);
}

// Merely looking up window.sessionStorage throws when the visitor blocks site data.
function defaultStorage() {
  try {
    return globalThis.sessionStorage;
  } catch {
    return null;
  }
}

export function loadSelection(storage = defaultStorage()) {
  try {
    return parseIds(readWithLegacy(storage, STORAGE_KEY, LEGACY_KEY));
  } catch {
    return [];
  }
}

export function saveSelection(ids, storage = defaultStorage()) {
  try {
    storage.setItem(STORAGE_KEY, serializeIds(ids));
  } catch {
    // Storage can be blocked or full (private mode); the choice then lasts only until the page is reloaded.
  }
}
