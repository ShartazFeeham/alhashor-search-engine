import {
  folderFor,
  getSubstringPrefix,
  getTagsPrefix,
  prefixFromSearch,
  resetPrefixesForTests,
  setTagsPrefixForTests,
  substringPrefix,
  tagsPrefix,
} from './searchConfig';

// setupTests.js starts every test with the tags prefix pinned to 2; these tests look at the real default
beforeEach(resetPrefixesForTests);
afterEach(() => {
  window.history.replaceState(null, '', '/');
  resetPrefixesForTests();
});

describe('the defaults', () => {
  test('the tags files are cut at 3 letters, the substring files at 2', () => {
    expect(tagsPrefix).toBe(3);
    expect(substringPrefix).toBe(2);
  });

  test('without any override the constants are used', () => {
    expect(getTagsPrefix()).toBe(3);
    expect(getSubstringPrefix()).toBe(2);
  });
});

describe('prefixFromSearch: the address override', () => {
  test('idx=2 and idx=3 choose the tags prefix', () => {
    expect(prefixFromSearch('tags', '?idx=2')).toBe(2);
    expect(prefixFromSearch('tags', '?idx=3')).toBe(3);
    expect(prefixFromSearch('tags', '?q=x&idx=2&page=3')).toBe(2);
    expect(prefixFromSearch('tags', 'idx=3')).toBe(3);
  });

  test('anything else is ignored', () => {
    for (const search of ['', '?', '?idx=9', '?idx=', '?idx=03', '?idx=2.0', '?idx=two', '?idx=%202', '?idx=-2', '?q=idx=2', '?xidx=2']) {
      expect(prefixFromSearch('tags', search)).toBeNull();
    }
    expect(prefixFromSearch('tags', undefined)).toBeNull();
    expect(prefixFromSearch('tags', null)).toBeNull();
  });

  test('with idx given twice the first one counts', () => {
    expect(prefixFromSearch('tags', '?idx=9&idx=2')).toBeNull();
    expect(prefixFromSearch('tags', '?idx=3&idx=2')).toBe(3);
  });

  test('sub is not a switch yet: there is no 3-letter substring folder', () => {
    expect(prefixFromSearch('substring', '?sub=3')).toBeNull();
    expect(prefixFromSearch('substring', '?sub=2')).toBe(2);
  });
});

describe('getTagsPrefix', () => {
  test('reads idx from the address of the page', () => {
    window.history.replaceState(null, '', '/search?q=x&idx=2');
    expect(getTagsPrefix()).toBe(2);
    window.history.replaceState(null, '', '/search?q=x&idx=3');
    expect(getTagsPrefix()).toBe(3);
  });

  test('falls back to the constant for a missing or unknown idx', () => {
    window.history.replaceState(null, '', '/search?q=x&idx=9');
    expect(getTagsPrefix()).toBe(3);
    window.history.replaceState(null, '', '/search?q=x');
    expect(getTagsPrefix()).toBe(3);
  });

  test('a value set for a test wins over the address; reset removes it', () => {
    window.history.replaceState(null, '', '/search?idx=3');
    setTagsPrefixForTests(2);
    expect(getTagsPrefix()).toBe(2);
    resetPrefixesForTests();
    expect(getTagsPrefix()).toBe(3);
  });

  test('refuses a test value that is not 2 or 3', () => {
    expect(() => setTagsPrefixForTests(4)).toThrow();
  });

  test('without a window (server, worker) it is the constant', () => {
    vi.stubGlobal('window', undefined);
    try {
      expect(getTagsPrefix()).toBe(3);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

describe('folderFor', () => {
  test('names the folder of each layout', () => {
    expect(folderFor('tags', 2)).toBe('tags');
    expect(folderFor('tags', 3)).toBe('tags3');
    expect(folderFor('substring', 2)).toBe('substring');
  });

  test('knows no folder for a layout that does not exist', () => {
    expect(() => folderFor('tags', 4)).toThrow();
    expect(() => folderFor('substring', 3)).toThrow();
  });
});
