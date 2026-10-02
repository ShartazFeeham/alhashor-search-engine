// The switches of the search, in one place.
//
// 1. How long the start of a word is in the names of the data files, for the two folders of word
//    files:
//      tags       word -> hadis tags that contain it       tags/<2 letters>.json       or  tags3/<3 letters>.json
//      substring  key  -> longer words containing it       substring/<2 letters>.json  or  substring3/<3 letters>.json
//    The default of each is set here and can be overridden on a page address with ?idx=2 or ?idx=3
//    (tags) and ?sub=2 or ?sub=3 (substring).
// 2. `containingCap`: how many of the longer words that contain a query word have their tags files
//    loaded (each one is a download). the lists of both substring folders are sorted by hadis count, the most first, so
//    the cap takes the first N of a list: 50 keeps 99% of the hadis for about a quarter of the
//    requests. It works with both substring folders, because the lists of substring/ were sorted the
//    same way (scripts/sort-substring-2.mjs). ?cap=0 switches it off, ?cap=1 to ?cap=500 sets it.
//    So the four modes to compare are ?idx=2&sub=2&cap=0, ?idx=2&sub=2&cap=50, ?idx=3&sub=3&cap=0 and
//    ?idx=3&sub=3&cap=50.
//
// This is a developer switch for comparing the layouts: nothing in the settings page, and a value
// that is not one of the layouts that exist (or a cap outside 0 to 500) is ignored. To add a layout:
// add its folder to LAYOUTS below.
// The page's Web Worker has no address of its own: the page reads the values (getTagsPrefix,
// getSubstringPrefix, getContainingCap) and sends them in each request (see searchClient.js and
// searchWorkerCore.js).
// How the files are named: src/lib/indexShards.js.

export const tagsPrefix = 3; // the default for tags: 3-letter files (public/json/tags3)
export const substringPrefix = 3; // the default for substring: 3-letter files (public/json/substring3)
export const containingCap = 50; // the default cap: 0 is off
export const MAX_CAP = 500;

const LAYOUTS = {
  tags: { param: 'idx', fallback: tagsPrefix, folders: { 2: 'tags', 3: 'tags3' } },
  substring: { param: 'sub', fallback: substringPrefix, folders: { 2: 'substring', 3: 'substring3' } },
};

function layoutOf(kind) {
  const layout = LAYOUTS[kind];
  if (!layout) throw new Error(`unknown index kind: ${kind}`);
  return layout;
}

// The prefix length a query string asks for (exactly "2" or "3" and only if that folder exists),
// or null. The first value counts when the parameter is given more than once.
export function prefixFromSearch(kind, search) {
  const { param, folders } = layoutOf(kind);
  if (typeof search !== 'string') return null;
  const value = new URLSearchParams(search).get(param);
  return value !== null && /^[0-9]$/.test(value) && Object.hasOwn(folders, value) ? Number(value) : null;
}

// The cap a query string asks for: 0 (off) or 1 to MAX_CAP written as a plain integer, or null.
// The first value counts when the parameter is given more than once.
export function capFromSearch(search) {
  if (typeof search !== 'string') return null;
  const value = new URLSearchParams(search).get('cap');
  if (value === null || !/^(0|[1-9][0-9]{0,2})$/.test(value)) return null;
  return Number(value) <= MAX_CAP ? Number(value) : null;
}

// The valid switches of a query string, as they are written in an address: { idx, sub, cap }, only
// the ones given. The search page keeps them in the address when the visitor searches again.
export function switchParams(search) {
  const found = {};
  for (const kind of Object.keys(LAYOUTS)) {
    const prefix = prefixFromSearch(kind, search);
    if (prefix !== null) found[LAYOUTS[kind].param] = String(prefix);
  }
  const cap = capFromSearch(search);
  if (cap !== null) found.cap = String(cap);
  return found;
}

const forTests = {}; // kind -> prefix, set by tests only
let capForTests; // set by tests only; undefined is not set (0 is a value)

function getPrefix(kind) {
  const layout = layoutOf(kind);
  if (forTests[kind]) return forTests[kind];
  // on the server, in tests and in a worker there is no page address: the default
  if (typeof window !== 'undefined' && window.location) {
    const fromAddress = prefixFromSearch(kind, window.location.search);
    if (fromAddress !== null) return fromAddress;
  }
  return layout.fallback;
}

// A prefix length given with a request (from the page to the worker) if it is a layout that
// exists, else the configured one.
export function prefixOrDefault(kind, value) {
  return Number.isInteger(value) && Object.hasOwn(layoutOf(kind).folders, value) ? value : getPrefix(kind);
}

export const getTagsPrefix = () => getPrefix('tags');
export const getSubstringPrefix = () => getPrefix('substring');

export function getContainingCap() {
  if (capForTests !== undefined) return capForTests;
  if (typeof window !== 'undefined' && window.location) {
    const fromAddress = capFromSearch(window.location.search);
    if (fromAddress !== null) return fromAddress;
  }
  return containingCap;
}

// A cap given with a request (from the page to the worker) if it is a whole number from 0 to
// MAX_CAP, else the configured one.
export function capOrDefault(value) {
  return Number.isInteger(value) && value >= 0 && value <= MAX_CAP ? value : getContainingCap();
}

// The folder under /json for a kind of file at a prefix length.
export function folderFor(kind, prefix) {
  const folder = layoutOf(kind).folders[prefix];
  if (!folder) throw new Error(`no ${kind} folder with ${prefix}-letter files`);
  return folder;
}

// Tests only: pins the tags prefix. null removes the pin.
export function setTagsPrefixForTests(prefix) {
  setPrefixForTests('tags', prefix);
}

// Tests only: pins the substring prefix. null removes the pin.
export function setSubstringPrefixForTests(prefix) {
  setPrefixForTests('substring', prefix);
}

function setPrefixForTests(kind, prefix) {
  if (prefix === null) delete forTests[kind];
  else {
    folderFor(kind, prefix); // refuses a layout that does not exist
    forTests[kind] = prefix;
  }
}

// Tests only: pins the cap (0 is off). null removes the pin.
export function setContainingCapForTests(cap) {
  if (cap === null) capForTests = undefined;
  else if (!Number.isInteger(cap) || cap < 0 || cap > MAX_CAP) throw new Error(`no such cap: ${cap}`);
  else capForTests = cap;
}

export function resetPrefixesForTests() {
  for (const kind of Object.keys(forTests)) delete forTests[kind];
  capForTests = undefined;
}
