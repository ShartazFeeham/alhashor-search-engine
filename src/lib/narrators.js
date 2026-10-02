import { BASE_PATH } from '../Helpers/basePath';
import { normalizeBengali } from '../Helpers/bengali';
import { BOOKS, bookById } from './books';
import { foldKey } from './narratorName';

/*
    The narrator index built by scripts/build-narrators.mjs:
      /json/narrators/index.json   [[id, name, count, <one count per book, in BOOKS order>], ...]
      /json/narrators/<id>.json    [[bookIndex, number], ...] ascending
    Nothing here is computed in the browser except the filter and the choice of a page.
*/

export const NARRATORS_PATH = '/narrators';

export const indexUrl = () => `${BASE_PATH}/json/narrators/index.json`;
export const narratorUrl = (id) => `${BASE_PATH}/json/narrators/${encodeURIComponent(id)}.json`;

// The sorts of the narrators menu: by hadis count (most first is the default) or by name. The old
// "?sort=desc" and "?sort=asc" links mean the name sorts. Anything else is the default.
export const NARRATOR_SORTS = ['count-desc', 'count-asc', 'name-asc', 'name-desc'];
export const DEFAULT_SORT = 'count-desc';
export function narratorSortFrom(param) {
  if (param === 'desc') return 'name-desc';
  if (param === 'asc') return 'name-asc';
  return NARRATOR_SORTS.includes(param) ? param : DEFAULT_SORT;
}

// The address of a narrator's page (0-based `page`; the first page has no "?page="), optionally
// narrowed to one book ('all' or a book id); `sort` only orders the menu (see narratorSortFrom;
// the default, most hadis first, is left out). No id is the list of narrators.
export function narratorHref(id, page = 0, book = 'all', sort = DEFAULT_SORT) {
  const params = new URLSearchParams();
  if (id) params.set('name', id);
  if (id && page > 0) params.set('page', String(page + 1));
  if (id && bookById(book) && book !== 'all') params.set('book', book);
  const order = narratorSortFrom(sort);
  if (order !== DEFAULT_SORT) params.set('sort', order);
  const query = params.toString();
  return query ? `${NARRATORS_PATH}?${query}` : NARRATORS_PATH;
}

// The book of a "?book=" value: a book id, or 'all' for anything else.
export function bookFromParam(param) {
  return bookById(param) ? param : 'all';
}

// One stored row [id, name, count, ...perBook] as { id, name, count, perBook: { <bookId>: n }, key }.
// `key` is the name in its folded spelling, for the filter. A row that cannot be read gives null.
export function parseRow(row) {
  if (!Array.isArray(row)) return null;
  const [id, name, count, ...perBook] = row;
  if (typeof id !== 'string' || id === '' || typeof name !== 'string' || !Number.isInteger(count) || count < 1) return null;
  return {
    id,
    name,
    count,
    perBook: Object.fromEntries(BOOKS.map((book, i) => [book.id, Number.isInteger(perBook[i]) ? perBook[i] : 0])),
    key: foldKey(normalizeBengali(name)),
  };
}

export const parseIndex = (rows) => (Array.isArray(rows) ? rows.flatMap((row) => parseRow(row) ?? []) : []);

// The narrators whose name contains the typed text, in the list's order. Letters are compared by
// their normalized spelling, and also in the folded spelling the index groups by (so "হুরাইরা" finds
// "আবূ হুরায়রা", and "আবু" finds "আবূ").
export function filterNarrators(narrators, text) {
  const typed = normalizeBengali(text).trim();
  if (typed === '') return narrators;
  const folded = foldKey(typed);
  return narrators.filter(
    (narrator) => normalizeBengali(narrator.name).includes(typed) || (folded !== '' && narrator.key.includes(folded))
  );
}

// [[bookIndex, number], ...] as [{ bookId, number }, ...], only the books asked for ('all' for every
// book). A pair that is not one is skipped.
export function pairsToHadis(pairs, book = 'all') {
  if (!Array.isArray(pairs)) return [];
  return pairs.flatMap((pair) => {
    const [bookIndex, number] = Array.isArray(pair) ? pair : [];
    const found = BOOKS[bookIndex];
    if (!found || !Number.isInteger(number) || number < 1) return [];
    return book === 'all' || book === found.id ? [{ bookId: found.id, number }] : [];
  });
}

const cache = new Map(); // url -> Promise of a settled result ({ status: 'ok', json } or { status: 'missing' })

// Forgets every remembered file (tests use this so one test's data never leaks into the next).
export function clearNarratorCache() {
  cache.clear();
}

// One of the narrator files. A 404 is 'missing'; any other failure (a server error, no network) is
// 'error'. Only 'ok' and 'missing' are remembered, so an error is tried again on the next request.
function load(url) {
  if (cache.has(url)) return cache.get(url);
  const request = fetch(url)
    .then(async (response) => {
      if (response.ok) return { status: 'ok', json: await response.json() };
      if (response.status === 404) return { status: 'missing' };
      throw new Error(`HTTP ${response.status}`);
    })
    .catch(() => {
      cache.delete(url);
      return { status: 'error' };
    });
  cache.set(url, request);
  return request;
}

// { status: 'ok' | 'missing' | 'error', narrators }
export async function loadIndex() {
  const result = await load(indexUrl());
  return { status: result.status, narrators: result.status === 'ok' ? parseIndex(result.json) : [] };
}

// { status: 'ok' | 'missing' | 'error', hadis: [{ bookId, number }] } for one narrator, in book
// order then number order, narrowed to `book` ('all' or a book id).
export async function loadNarratorHadis(id, book = 'all') {
  const result = await load(narratorUrl(id));
  return { status: result.status, hadis: result.status === 'ok' ? pairsToHadis(result.json, book) : [] };
}
