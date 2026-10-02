import { createSearchIndex } from './searchIndex';
import { setContainingCapForTests, setSubstringPrefixForTests, setTagsPrefixForTests } from './searchConfig';

// The substring folder (word -> longer words that contain it) in its 3-letter layout, and the cap on
// how many containing words have their tags files loaded. setupTests.js starts each test on the
// 2-letter layouts with the cap off; these tests pin what they need.

const notFound = (url) => Object.assign(new Error(`404 ${url}`), { status: 404 });

function server(files) {
  const calls = [];
  const fetchJson = async (url) => {
    calls.push(url);
    if (!(url in files)) throw notFound(url);
    return files[url];
  };
  return { fetchJson, calls };
}

const YA_NUKTA = 'য়'; // য় as য + ়
const YA_ONE = 'য়'; // য় as one character

const tagsFilesOf = (calls) => calls.filter((url) => url.includes('/json/tags'));

describe('the 3-letter substring layout', () => {
  beforeEach(() => {
    setTagsPrefixForTests(3);
    setSubstringPrefixForTests(3);
  });

  test('looks the longer words up in substring3/<first three letters of the word>', async () => {
    const { fetchJson, calls } = server({
      '/json/tags3/নাম.json': { নামায: ['BUK-1'], নামাযের: ['BUK-2'] },
      '/json/substring3/নাম.json': { নামায: ['নামাযের'] },
    });
    const { searchTags } = createSearchIndex(fetchJson);
    expect(await searchTags(['নামায'])).toEqual(['BUK-1', 'BUK-2']);
    expect(calls.sort()).toEqual(['/json/substring3/নাম.json', '/json/tags3/নাম.json']);
  });

  test('a word shorter than three letters has its own substring file, with an underscore', async () => {
    const { fetchJson, calls } = server({
      '/json/tags3/কে_.json': { কে: ['BUK-1'] },
      '/json/tags3/কেউ.json': { কেউ: ['BUK-2'] },
      '/json/substring3/কে_.json': { কে: ['কেউ'] },
    });
    const { searchTags } = createSearchIndex(fetchJson);
    expect(await searchTags(['কে'])).toEqual(['BUK-1', 'BUK-2']);
    expect(calls).toContain('/json/substring3/কে_.json');
    expect(calls.some((url) => url.startsWith('/json/substring/'))).toBe(false);
  });

  test('the 2-letter and the 3-letter tags layouts can each be paired with either substring layout', async () => {
    const files = {
      '/json/tags/না.json': { নামায: ['BUK-1'], নামাযের: ['BUK-2'] },
      '/json/tags3/নাম.json': { নামায: ['BUK-1'], নামাযের: ['BUK-2'] },
      '/json/substring/না.json': { নামায: ['নামাযের'] },
      '/json/substring3/নাম.json': { নামায: ['নামাযের'] },
    };
    for (const tagsPrefix of [2, 3]) {
      for (const substringPrefix of [2, 3]) {
        const { fetchJson, calls } = server(files);
        const result = await createSearchIndex(fetchJson).searchTags(['নামায'], { tagsPrefix, substringPrefix });
        expect(result, `${tagsPrefix}/${substringPrefix}`).toEqual(['BUK-1', 'BUK-2']);
        expect(calls.some((url) => url.startsWith(substringPrefix === 3 ? '/json/substring3/' : '/json/substring/'))).toBe(true);
        expect(calls.some((url) => url.startsWith(substringPrefix === 3 ? '/json/substring/' : '/json/substring3/'))).toBe(false);
      }
    }
  });

  test('a prefix given with the request wins over the configured one, in both directions', async () => {
    const files = {
      '/json/tags3/নাম.json': { নামায: ['BUK-1'], নামাযের: ['BUK-2'], নামাজ: ['BUK-3'] },
      '/json/substring/না.json': { নামায: ['নামাযের'] },
      '/json/substring3/নাম.json': { নামায: ['নামাজ'] },
    };
    const a = server(files);
    expect(await createSearchIndex(a.fetchJson).searchTags(['নামায'], { substringPrefix: 2 })).toEqual(['BUK-1', 'BUK-2']);
    setSubstringPrefixForTests(2);
    const b = server(files);
    expect(await createSearchIndex(b.fetchJson).searchTags(['নামায'], { substringPrefix: 3 })).toEqual(['BUK-1', 'BUK-3']);
  });

  test('the configured prefix is read at each search, so it can change at any moment', async () => {
    const { fetchJson } = server({
      '/json/tags3/নাম.json': { নামায: ['BUK-1'], নামাযের: ['BUK-2'], নামাজ: ['BUK-3'] },
      '/json/substring/না.json': { নামায: ['নামাযের'] },
      '/json/substring3/নাম.json': { নামায: ['নামাজ'] },
    });
    const { searchTags } = createSearchIndex(fetchJson);
    expect(await searchTags(['নামায'])).toEqual(['BUK-1', 'BUK-3']);
    setSubstringPrefixForTests(2);
    expect(await searchTags(['নামায'])).toEqual(['BUK-1', 'BUK-2']);
    setSubstringPrefixForTests(3);
    expect(await searchTags(['নামায'])).toEqual(['BUK-1', 'BUK-3']);
  });

  test('a key filed under either spelling of য় is found, whichever file it is in', async () => {
    const word = `হ${YA_NUKTA}েছে`;
    const longer = `${word}ন`;
    const { fetchJson, calls } = server({
      [`/json/substring3/হ${YA_NUKTA}.json`]: { [word]: [longer] },
      [`/json/substring3/হ${YA_ONE}ে.json`]: { [`হ${YA_ONE}েছে`]: ['other'] },
      [`/json/tags3/হ${YA_NUKTA}.json`]: { [longer]: ['BUK-1'] },
      '/json/tags3/oth.json': { other: ['BUK-2'] },
    });
    const { searchTags } = createSearchIndex(fetchJson);
    expect((await searchTags([word])).sort()).toEqual(['BUK-1', 'BUK-2']);
    expect(calls).toEqual(expect.arrayContaining([`/json/substring3/হ${YA_NUKTA}.json`, `/json/substring3/হ${YA_ONE}ে.json`]));
  });
});

describe('a substring file that does not exist', () => {
  beforeEach(() => {
    setTagsPrefixForTests(3);
    setSubstringPrefixForTests(3);
  });

  test('is an empty list, not an error, and is not asked for again', async () => {
    const { fetchJson, calls } = server({ '/json/tags3/নাম.json': { নামায: ['BUK-1'] } });
    const { searchTags } = createSearchIndex(fetchJson);
    expect(await searchTags(['নামায'])).toEqual(['BUK-1']);
    expect(await searchTags(['নামায'])).toEqual(['BUK-1']);
    expect(calls.filter((url) => url === '/json/substring3/নাম.json')).toHaveLength(1);
  });

  test('a failure that is not a 404 is still tried again on the next search', async () => {
    let attempts = 0;
    const fetchJson = async (url) => {
      if (url === '/json/substring3/নাম.json') {
        attempts++;
        if (attempts === 1) throw new Error('network');
        return { নামায: ['নামাযের'] };
      }
      if (url === '/json/tags3/নাম.json') return { নামায: ['BUK-1'], নামাযের: ['BUK-2'] };
      throw notFound(url);
    };
    const { searchTags } = createSearchIndex(fetchJson);
    expect(await searchTags(['নামায'])).toEqual(['BUK-1']);
    expect(await searchTags(['নামায'])).toEqual(['BUK-1', 'BUK-2']);
  });

  test('with the real loader, a 404 from the server gives the same: empty, and fetched once', async () => {
    global.fetch = vi.fn(() => Promise.resolve({ ok: false, status: 404 }));
    try {
      const { searchTags } = createSearchIndex();
      expect(await searchTags(['qqqq'])).toEqual([]);
      expect(await searchTags(['qqqq'])).toEqual([]);
      expect(global.fetch.mock.calls.map(([url]) => url).sort()).toEqual(['/json/substring3/qqq.json', '/json/tags3/qqq.json']);
    } finally {
      delete global.fetch;
    }
  });

  test('a word that would need an unsafe file name asks for no substring file at all', async () => {
    const { fetchJson, calls } = server({});
    const { searchTags } = createSearchIndex(fetchJson);
    expect(await searchTags(['a\\b', '%x', 'a/b'])).toEqual([]);
    expect(calls.filter((url) => url.includes('/substring3/'))).toEqual([]);
  });

  test('a file that holds something other than a table of lists is read as empty', async () => {
    const { fetchJson } = server({
      '/json/tags3/নাম.json': { নামায: ['BUK-1'] },
      '/json/substring3/নাম.json': { নামায: 'oops', অন্য: null },
    });
    expect(await createSearchIndex(fetchJson).searchTags(['নামায'])).toEqual(['BUK-1']);
  });
});

describe('the cap on the containing words (containingCap)', () => {
  beforeEach(() => {
    setTagsPrefixForTests(3);
    setSubstringPrefixForTests(3);
    setContainingCapForTests(0);
  });

  test('counts files: a word beyond the cap costs no download', async () => {
    const words = ['xa1', 'xb2', 'xc3', 'xd4', 'xe5'].map((w) => `${w}z`);
    const files = { '/json/substring3/key.json': { key: words }, '/json/tags3/key.json': { key: ['OWN-1'] } };
    words.forEach((word, i) => { files[`/json/tags3/${word.slice(0, 3)}.json`] = { [word]: [`BUK-${i + 1}`] }; });
    for (const [cap, expected] of [[2, 2], [3, 3], [5, 5], [50, 5], [0, 5]]) {
      const { fetchJson, calls } = server(files);
      const result = await createSearchIndex(fetchJson).searchTags(['key'], { containingCap: cap });
      expect(tagsFilesOf(calls).length, `cap ${cap}`).toBe(1 + expected);
      expect(result.length).toBe(1 + expected);
    }
  });

  test('the typed word\'s own hadis are always kept, even with a cap of 1, and come first', async () => {
    const words = ['xa1z', 'xb2z', 'xc3z'];
    const files = { '/json/substring3/key.json': { key: words }, '/json/tags3/key.json': { key: ['OWN-1', 'OWN-2'] } };
    words.forEach((word, i) => { files[`/json/tags3/${word.slice(0, 3)}.json`] = { [word]: [`BUK-${i + 1}`] }; });
    const { fetchJson } = server(files);
    expect(await createSearchIndex(fetchJson).searchTags(['key'], { containingCap: 1 })).toEqual(['OWN-1', 'OWN-2', 'BUK-1']);
  });

  test('a list shorter than the cap is not touched: a rare word gives the same answer with the cap on or off', async () => {
    const words = ['xa1z', 'xb2z', 'xc3z'];
    const files = { '/json/substring3/key.json': { key: words }, '/json/tags3/key.json': { key: ['OWN-1'] } };
    words.forEach((word, i) => { files[`/json/tags3/${word.slice(0, 3)}.json`] = { [word]: [`BUK-${i + 1}`] }; });
    const off = server(files);
    const on = server(files);
    const a = await createSearchIndex(off.fetchJson).searchTags(['key'], { containingCap: 0 });
    const b = await createSearchIndex(on.fetchJson).searchTags(['key'], { containingCap: 50 });
    expect(b).toEqual(a);
    expect(on.calls.sort()).toEqual(off.calls.sort());
  });

  test('the cap is per query word, applied after the word\'s own hadis are counted, so a two-word ranking keeps its meaning', async () => {
    const files = {
      '/json/substring3/one.json': { one: ['onea1', 'oneb2', 'onec3'] },
      '/json/substring3/two.json': { two: ['twoa1', 'twob2', 'twoc3'] },
      '/json/tags3/one.json': { one: ['H-1'], onea1: ['H-2'], oneb2: ['H-3'], onec3: ['H-9'] },
      '/json/tags3/two.json': { two: ['H-2'], twoa1: ['H-3'], twob2: ['H-1'], twoc3: ['H-9'] },
    };
    const { fetchJson } = server(files);
    const { searchTags } = createSearchIndex(fetchJson);
    // cap 2 keeps onea1, oneb2, twoa1, twob2: H-9 (only through the third word of each list) is lost
    expect((await searchTags(['one', 'two'], { containingCap: 2 })).sort()).toEqual(['H-1', 'H-2', 'H-3']);
    expect(await searchTags(['one', 'two'], { containingCap: 2, requireAll: true })).toHaveLength(3);
    expect((await searchTags(['one', 'two'], { containingCap: 0 })).sort()).toEqual(['H-1', 'H-2', 'H-3', 'H-9']);
  });

  test('the configured cap is used when the request gives none, and is read at each search', async () => {
    const words = ['xa1z', 'xb2z', 'xc3z', 'xd4z'];
    const files = { '/json/substring3/key.json': { key: words } };
    words.forEach((word, i) => { files[`/json/tags3/${word.slice(0, 3)}.json`] = { [word]: [`BUK-${i + 1}`] }; });
    const { searchTags } = createSearchIndex(server(files).fetchJson);
    expect(await searchTags(['key'])).toHaveLength(4); // off
    setContainingCapForTests(2);
    expect(await searchTags(['key'])).toEqual(['BUK-1', 'BUK-2']);
    setContainingCapForTests(0);
    expect(await searchTags(['key'])).toHaveLength(4);
  });

  test('a cap given with the request wins over the configured one, 0 switches it off', async () => {
    const words = ['xa1z', 'xb2z', 'xc3z', 'xd4z'];
    const files = { '/json/substring3/key.json': { key: words } };
    words.forEach((word, i) => { files[`/json/tags3/${word.slice(0, 3)}.json`] = { [word]: [`BUK-${i + 1}`] }; });
    setContainingCapForTests(1);
    const { searchTags } = createSearchIndex(server(files).fetchJson);
    expect(await searchTags(['key'])).toEqual(['BUK-1']);
    expect(await searchTags(['key'], { containingCap: 0 })).toHaveLength(4);
    expect(await searchTags(['key'], { containingCap: 3 })).toHaveLength(3);
    expect(await searchTags(['key'], { containingCap: 9999 })).toEqual(['BUK-1']); // not a cap: the configured one
  });

  test('the cap works in the 2-letter substring mode too: the first N of the key\'s list (sorted by hadis count as in substring3)', async () => {
    const words = ['xa1z', 'xb2z', 'xc3z', 'xd4z'];
    const files = { '/json/substring/ke.json': { key: words } };
    words.forEach((word, i) => { files[`/json/tags3/${word.slice(0, 3)}.json`] = { [word]: [`BUK-${i + 1}`] }; });
    const { fetchJson, calls } = server(files);
    const { searchTags } = createSearchIndex(fetchJson);
    expect(await searchTags(['key'], { substringPrefix: 2, containingCap: 1 })).toEqual(['BUK-1']);
    expect(await searchTags(['key'], { substringPrefix: 2, containingCap: 3 })).toHaveLength(3);
    expect(await searchTags(['key'], { substringPrefix: 2, containingCap: 0 })).toHaveLength(4); // 0 switches it off
    setSubstringPrefixForTests(2);
    setContainingCapForTests(2);
    expect(await searchTags(['key'])).toEqual(['BUK-1', 'BUK-2']);
    setContainingCapForTests(0);
    expect(await searchTags(['key'])).toHaveLength(4);
    expect(calls.some((url) => url.startsWith('/json/substring3/'))).toBe(false);
  });

  test('a key with fewer containing words than the cap is not changed by it, in the 2-letter mode', async () => {
    const words = ['xa1z', 'xb2z', 'xc3z'];
    const files = { '/json/substring/ke.json': { key: words } };
    words.forEach((word, i) => { files[`/json/tags/${word.slice(0, 2)}.json`] = { ...(files[`/json/tags/${word.slice(0, 2)}.json`] ?? {}), [word]: [`BUK-${i + 1}`] }; });
    const options = { tagsPrefix: 2, substringPrefix: 2 };
    const off = server(files);
    const on = server(files);
    const a = await createSearchIndex(off.fetchJson).searchTags(['key'], { ...options, containingCap: 0 });
    const b = await createSearchIndex(on.fetchJson).searchTags(['key'], { ...options, containingCap: 50 });
    expect(b).toEqual(a);
    expect(a).toHaveLength(3);
    expect(on.calls.sort()).toEqual(off.calls.sort());
  });

  test('the same list taken once: a word repeated in a list counts once towards the cap', async () => {
    const words = ['xa1z', 'xa1z', 'xb2z', 'xc3z'];
    const files = { '/json/substring3/key.json': { key: words } };
    ['xa1z', 'xb2z', 'xc3z'].forEach((word, i) => { files[`/json/tags3/${word.slice(0, 3)}.json`] = { [word]: [`BUK-${i + 1}`] }; });
    const { searchTags } = createSearchIndex(server(files).fetchJson);
    expect(await searchTags(['key'], { containingCap: 2 })).toEqual(['BUK-1', 'BUK-2']);
  });

  test('a key written in two spellings keeps the first N of each spelling\'s own list', async () => {
    const key = `হ${YA_NUKTA}`;
    const other = `হ${YA_ONE}`;
    // both files are for the 2-code-point key written the two ways: য় + ় is 3 code points, য় is 2
    const files = {
      [`/json/substring3/${key}.json`]: { [key]: ['aaa1', 'aaa2', 'aaa3'] },
      [`/json/substring3/${other}_.json`]: { [other]: ['bbb1', 'bbb2', 'bbb3'] },
      '/json/tags3/aaa.json': { aaa1: ['A-1'], aaa2: ['A-2'], aaa3: ['A-3'] },
      '/json/tags3/bbb.json': { bbb1: ['B-1'], bbb2: ['B-2'], bbb3: ['B-3'] },
    };
    const { searchTags } = createSearchIndex(server(files).fetchJson);
    expect((await searchTags([key], { containingCap: 2 })).sort()).toEqual(['A-1', 'A-2', 'B-1', 'B-2']);
  });
});

describe('did you mean with the 3-letter substring files', () => {
  beforeEach(() => {
    setTagsPrefixForTests(3);
    setSubstringPrefixForTests(3);
    setContainingCapForTests(0);
  });

  const tags = (n) => Array.from({ length: n }, (_, i) => `BUK-${i + 1}`);

  test('a typo in the first letters is still swapped for the confused letter and found', async () => {
    const { fetchJson } = server({ '/json/tags3/নাম.json': { নামায: tags(2921) } });
    const { suggest } = createSearchIndex(fetchJson);
    expect(await suggest(['ণামায'], { resultCount: 0 })).toEqual([
      { query: 'নামায', changed: [{ from: 'ণামায', to: 'নামায' }], kind: 'variant', hits: 2921 },
    ]);
  });

  test('a word that has no hadis of its own but is inside longer words is not weak: nothing is suggested, in both layouts', async () => {
    const files = {
      '/json/tags3/নাম.json': { নামাযের: tags(10), নামাযী: tags(5), নামায: tags(40) },
      '/json/substring3/নাম.json': { নামা: ['নামাযের', 'নামাযী', 'নামায'] },
      '/json/substring/না.json': { নামা: ['নামাযের', 'নামাযী', 'নামায'] },
    };
    for (const substringPrefix of [2, 3]) {
      const { fetchJson } = server(files);
      const { suggest } = createSearchIndex(fetchJson);
      expect(await suggest(['নামা'], { resultCount: 0, substringPrefix }), `sub ${substringPrefix}`).toEqual([]);
    }
  });

  test('the typed word\'s substring file is read from substring3 in the count of its hadis', async () => {
    const { fetchJson, calls } = server({ '/json/tags3/নাম.json': { নামায: tags(40) } });
    await createSearchIndex(fetchJson).suggest(['নামা'], { resultCount: 0 });
    expect(calls).toContain('/json/substring3/নাম.json');
    expect(calls.some((url) => url.startsWith('/json/substring/'))).toBe(false);
  });
});
