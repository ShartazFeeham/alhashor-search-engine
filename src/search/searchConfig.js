// The switches of the search, in one place. Today: how long the start of a word is in the names
// of the data files, for the two folders of word files:
//   tags       word -> hadis tags that contain it       tags/<2 letters>.json  or  tags3/<3 letters>.json
//   substring  word -> longer words that contain it     substring/<2 letters>.json  (only 2 so far)
// The default of each is set here and can be overridden on a page address with ?idx=2 or ?idx=3
// (tags) and, once substring has a 3-letter folder, ?sub=2 or ?sub=3. This is a developer switch
// for comparing the two layouts: nothing in the settings page, and a value that is not one of the
// layouts that exist is ignored. To add a layout: add its folder to LAYOUTS below.
// The page's Web Worker has no address of its own: the page reads the value (getTagsPrefix) and
// sends it in each request (see searchClient.js and searchWorkerCore.js).
// How the files are named: src/lib/indexShards.js.

export const tagsPrefix = 3; // the default for tags: 3-letter files (public/json/tags3)
export const substringPrefix = 2; // the default for substring

const LAYOUTS = {
  tags: { param: 'idx', fallback: tagsPrefix, folders: { 2: 'tags', 3: 'tags3' } },
  substring: { param: 'sub', fallback: substringPrefix, folders: { 2: 'substring' } },
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

const forTests = {}; // kind -> prefix, set by tests only

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

// The folder under /json for a kind of file at a prefix length.
export function folderFor(kind, prefix) {
  const folder = layoutOf(kind).folders[prefix];
  if (!folder) throw new Error(`no ${kind} folder with ${prefix}-letter files`);
  return folder;
}

// Tests only: pins the tags prefix. null removes the pin.
export function setTagsPrefixForTests(prefix) {
  if (prefix === null) delete forTests.tags;
  else {
    folderFor('tags', prefix); // refuses a layout that does not exist
    forTests.tags = prefix;
  }
}

export function resetPrefixesForTests() {
  for (const kind of Object.keys(forTests)) delete forTests[kind];
}
