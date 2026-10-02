import {
  capFromSearch,
  capOrDefault,
  containingCap,
  folderFor,
  getContainingCap,
  getSubstringPrefix,
  getTagsPrefix,
  prefixFromSearch,
  prefixOrDefault,
  resetPrefixesForTests,
  setContainingCapForTests,
  setSubstringPrefixForTests,
  setTagsPrefixForTests,
  switchParams,
  substringPrefix,
  tagsPrefix,
} from './searchConfig';

// setupTests.js starts every test with the tags and substring prefixes pinned to 2 and the cap off; these tests look at the real defaults
beforeEach(resetPrefixesForTests);
afterEach(() => {
  window.history.replaceState(null, '', '/');
  resetPrefixesForTests();
});

describe('the defaults', () => {
  test('the tags and the substring files are cut at 3 letters, and a key opens at most 50 containing words', () => {
    expect(tagsPrefix).toBe(3);
    expect(substringPrefix).toBe(3);
    expect(containingCap).toBe(50);
  });

  test('without any override the constants are used', () => {
    expect(getTagsPrefix()).toBe(3);
    expect(getSubstringPrefix()).toBe(3);
    expect(getContainingCap()).toBe(50);
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

  test('sub=2 and sub=3 choose the substring prefix, with the same rules as idx', () => {
    expect(prefixFromSearch('substring', '?sub=2')).toBe(2);
    expect(prefixFromSearch('substring', '?sub=3')).toBe(3);
    expect(prefixFromSearch('substring', '?q=x&sub=2&idx=3')).toBe(2);
    expect(prefixFromSearch('tags', '?q=x&sub=2&idx=3')).toBe(3); // each reads its own parameter
    for (const search of ['', '?sub=9', '?sub=', '?sub=03', '?sub=two', '?sub=-3', '?xsub=2']) {
      expect(prefixFromSearch('substring', search), search).toBeNull();
    }
    expect(prefixFromSearch('substring', '?sub=3&sub=2')).toBe(3);
    expect(prefixFromSearch('substring', '?sub=9&sub=2')).toBeNull();
  });
});

describe('capFromSearch: the ?cap override', () => {
  test('cap=0 switches the cap off, cap=1 to cap=500 sets it', () => {
    expect(capFromSearch('?cap=0')).toBe(0);
    expect(capFromSearch('?cap=1')).toBe(1);
    expect(capFromSearch('?cap=50')).toBe(50);
    expect(capFromSearch('?cap=500')).toBe(500);
    expect(capFromSearch('?q=x&cap=20&sub=3')).toBe(20);
    expect(capFromSearch('cap=7')).toBe(7);
  });

  test('anything else is ignored', () => {
    for (const search of ['', '?', '?cap=501', '?cap=1000', '?cap=', '?cap=-1', '?cap=1.5', '?cap=00', '?cap=050', '?cap=ten', '?cap=%2050', '?cap=5e1', '?xcap=5', '?q=cap=5']) {
      expect(capFromSearch(search), search).toBeNull();
    }
    expect(capFromSearch(undefined)).toBeNull();
    expect(capFromSearch(null)).toBeNull();
  });

  test('with cap given twice the first one counts', () => {
    expect(capFromSearch('?cap=9&cap=700')).toBe(9);
    expect(capFromSearch('?cap=700&cap=9')).toBeNull();
  });
});

describe('switchParams: the switches an address carries', () => {
  test('lists the valid ones as strings, to keep them in the address', () => {
    expect(switchParams('?q=x&idx=2&sub=3&cap=20')).toEqual({ idx: '2', sub: '3', cap: '20' });
    expect(switchParams('?cap=0')).toEqual({ cap: '0' });
    expect(switchParams('?q=x&idx=9&sub=&cap=999')).toEqual({});
    expect(switchParams('')).toEqual({});
    expect(switchParams(undefined)).toEqual({});
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

describe('getSubstringPrefix and getContainingCap', () => {
  test('read sub and cap from the address of the page', () => {
    window.history.replaceState(null, '', '/search?q=x&sub=2&cap=0');
    expect(getSubstringPrefix()).toBe(2);
    expect(getContainingCap()).toBe(0);
    window.history.replaceState(null, '', '/search?q=x&sub=3&cap=120');
    expect(getSubstringPrefix()).toBe(3);
    expect(getContainingCap()).toBe(120);
  });

  test('fall back to the constants for a missing or invalid value', () => {
    window.history.replaceState(null, '', '/search?q=x&sub=9&cap=501');
    expect(getSubstringPrefix()).toBe(3);
    expect(getContainingCap()).toBe(50);
  });

  test('a value set for a test wins over the address; reset removes it; cap 0 is a value too', () => {
    window.history.replaceState(null, '', '/search?sub=3&cap=20');
    setSubstringPrefixForTests(2);
    setContainingCapForTests(0);
    expect(getSubstringPrefix()).toBe(2);
    expect(getContainingCap()).toBe(0);
    resetPrefixesForTests();
    expect(getSubstringPrefix()).toBe(3);
    expect(getContainingCap()).toBe(20);
    setContainingCapForTests(null);
    expect(getContainingCap()).toBe(20);
  });

  test('refuse a test value that is not a layout or a cap', () => {
    expect(() => setSubstringPrefixForTests(4)).toThrow();
    expect(() => setContainingCapForTests(-1)).toThrow();
    expect(() => setContainingCapForTests(501)).toThrow();
    expect(() => setContainingCapForTests(1.5)).toThrow();
  });

  test('without a window (server, worker) they are the constants', () => {
    vi.stubGlobal('window', undefined);
    try {
      expect(getSubstringPrefix()).toBe(3);
      expect(getContainingCap()).toBe(50);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

describe('the cap with the 2-letter substring files: the four modes that are compared', () => {
  const modes = [
    ['?idx=2&sub=2&cap=0', { idx: 2, sub: 2, cap: 0 }],
    ['?idx=2&sub=2&cap=50', { idx: 2, sub: 2, cap: 50 }],
    ['?idx=3&sub=3&cap=0', { idx: 3, sub: 3, cap: 0 }],
    ['?idx=3&sub=3&cap=50', { idx: 3, sub: 3, cap: 50 }],
  ];

  test.each(modes)('%s is read as it is written, whatever the substring prefix', (search, expected) => {
    expect(prefixFromSearch('tags', search)).toBe(expected.idx);
    expect(prefixFromSearch('substring', search)).toBe(expected.sub);
    expect(capFromSearch(search)).toBe(expected.cap);
    expect(switchParams(search)).toEqual({ idx: String(expected.idx), sub: String(expected.sub), cap: String(expected.cap) });
    window.history.replaceState(null, '', `/search${search}&q=x`);
    expect([getTagsPrefix(), getSubstringPrefix(), getContainingCap()]).toEqual([expected.idx, expected.sub, expected.cap]);
  });

  test('with sub=2 a cap is a cap: it is not dropped by the config, the request value reaches the search as given', () => {
    window.history.replaceState(null, '', '/search?q=x&sub=2&cap=7');
    expect(getSubstringPrefix()).toBe(2);
    expect(getContainingCap()).toBe(7);
    expect(capOrDefault(7)).toBe(7);
    expect(capOrDefault(0)).toBe(0);
    expect(capOrDefault(501)).toBe(7); // not a cap: the address one
  });

  test('with sub=2 and no cap the default cap (50) applies, cap=0 switches it off, an invalid cap is ignored', () => {
    window.history.replaceState(null, '', '/search?q=x&sub=2');
    expect(getContainingCap()).toBe(50);
    window.history.replaceState(null, '', '/search?q=x&sub=2&cap=0');
    expect(getContainingCap()).toBe(0);
    window.history.replaceState(null, '', '/search?q=x&sub=2&cap=501');
    expect(getContainingCap()).toBe(50);
  });
});

describe('a value given with a request', () => {
  test('prefixOrDefault trusts a layout that exists and falls back otherwise', () => {
    expect(prefixOrDefault('substring', 2)).toBe(2);
    expect(prefixOrDefault('substring', 3)).toBe(3);
    setSubstringPrefixForTests(2);
    expect(prefixOrDefault('substring', 9)).toBe(2);
    expect(prefixOrDefault('substring', undefined)).toBe(2);
    expect(prefixOrDefault('substring', '3')).toBe(2);
  });

  test('capOrDefault trusts an integer from 0 to 500 and falls back otherwise', () => {
    expect(capOrDefault(0)).toBe(0);
    expect(capOrDefault(7)).toBe(7);
    expect(capOrDefault(500)).toBe(500);
    for (const bad of [501, -1, 1.5, '20', null, undefined, NaN]) expect(capOrDefault(bad), String(bad)).toBe(50);
    setContainingCapForTests(0);
    expect(capOrDefault(undefined)).toBe(0);
  });
});

describe('folderFor', () => {
  test('names the folder of each layout', () => {
    expect(folderFor('tags', 2)).toBe('tags');
    expect(folderFor('tags', 3)).toBe('tags3');
    expect(folderFor('substring', 2)).toBe('substring');
    expect(folderFor('substring', 3)).toBe('substring3');
  });

  test('knows no folder for a layout that does not exist', () => {
    expect(() => folderFor('tags', 4)).toThrow();
    expect(() => folderFor('substring', 4)).toThrow();
  });
});
