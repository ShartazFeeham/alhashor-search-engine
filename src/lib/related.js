import { BASE_PATH } from '../Helpers/basePath';
import { bookByCode } from './books';

const PER_SHARD = 100;
const REASONS = { s: 'sameReport', w: 'sharedWords' };

const cache = new Map(); // shard key -> Promise of { status: 'ok', shard } or { status: 'error' }

// Forgets every remembered shard (tests use this so one test's data never leaks into the next).
export function clearRelatedCache() {
  cache.clear();
}

// The shard a hadis is in: 100 numbers to a shard, so numbers 1 to 100 are "BUK-0".
export function shardKey(book, number) {
  return `${book.code}-${Math.floor((number - 1) / PER_SHARD)}`;
}

export function relatedUrl(book, number) {
  return `${BASE_PATH}/json/related/${shardKey(book, number)}.json`;
}

// One stored entry [CODE, number, 's' | 'w', "word word"] as { book (id), number, reason, words }.
// An entry that cannot be read gives null, so it is left out rather than shown wrong.
export function parseRelated(entry) {
  if (!Array.isArray(entry)) return null;
  const [code, number, reasonCode, words] = entry;
  const book = bookByCode(code);
  const reason = REASONS[reasonCode];
  if (!book || !reason || !Number.isInteger(number) || number < 1) return null;
  return {
    book: book.id,
    number,
    reason,
    words: typeof words === 'string' ? words.split(' ').filter(Boolean) : [],
  };
}

function loadShard(book, number) {
  const key = shardKey(book, number);
  if (cache.has(key)) return cache.get(key);
  const request = fetch(relatedUrl(book, number))
    .then(async (response) => {
      // No shard file means none of its hadis has a related one.
      if (!response.ok) return { status: 'ok', shard: {} };
      return { status: 'ok', shard: await response.json() };
    })
    .catch(() => {
      cache.delete(key); // a network failure is not remembered, so the next request tries again
      return { status: 'error' };
    });
  cache.set(key, request);
  return request;
}

// { status: 'ok' | 'error', items }. A hadis with nothing related, or with no shard, is 'ok' with no items.
export async function loadRelated(book, number) {
  const result = await loadShard(book, number);
  if (result.status !== 'ok') return { status: 'error', items: [] };
  const entries = result.shard?.[number];
  const items = Array.isArray(entries) ? entries.map(parseRelated).filter(Boolean) : [];
  return { status: 'ok', items };
}
