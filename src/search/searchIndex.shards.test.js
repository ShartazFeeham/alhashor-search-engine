import { createSearchIndex } from './searchIndex';
import { setTagsPrefixForTests } from './searchConfig';

// The same lookups as searchIndex.test.js, on the 3-letter layout: tags3/<3 letters>.json for the
// word files, substring/<2 letters>.json unchanged. (setupTests.js starts each test on 2 letters.)

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

const tags = (n, book = 'BUK') => Array.from({ length: n }, (_, i) => `${book}-${i + 1}`);
const O = 'ো'; // ো as one character
const O_LONG = 'ো'; // ো as ে + া
const YA_NUKTA = 'য়'; // য় as য + ়
const YA_ONE = 'য়'; // য় as one character

describe('the 3-letter layout', () => {
  beforeEach(() => setTagsPrefixForTests(3));

  test('looks words up in tags3/<first three letters> and longer words in substring/<first two>', async () => {
    const { fetchJson, calls } = server({
      '/json/tags3/নাম.json': { নামায: ['BUK-1'], নামাযের: ['BUK-2'] },
      '/json/substring/না.json': { নামায: ['নামাযের'] },
    });
    const { searchTags } = createSearchIndex(fetchJson);
    expect(await searchTags(['নামায'])).toEqual(['BUK-1', 'BUK-2']);
    expect(calls.sort()).toEqual(['/json/substring/না.json', '/json/tags3/নাম.json']);
  });

  test('a word shorter than three letters has its own file, with an underscore', async () => {
    const { fetchJson, calls } = server({ '/json/tags3/কে_.json': { কে: ['BUK-1'] } });
    const { searchTags } = createSearchIndex(fetchJson);
    expect(await searchTags(['কে'], {})).toEqual(['BUK-1']);
    expect(calls).toContain('/json/tags3/কে_.json');
  });

  test('a prefix given with the request wins over the configured one, in both directions', async () => {
    const files = {
      '/json/tags/না.json': { নামায: ['BUK-2'] },
      '/json/tags3/নাম.json': { নামায: ['BUK-3'] },
    };
    const two = server(files);
    expect(await createSearchIndex(two.fetchJson).searchTags(['নামায'], { tagsPrefix: 2 })).toEqual(['BUK-2']);
    expect(two.calls).not.toContain('/json/tags3/নাম.json');

    setTagsPrefixForTests(2);
    const three = server(files);
    expect(await createSearchIndex(three.fetchJson).searchTags(['নামায'], { tagsPrefix: 3 })).toEqual(['BUK-3']);
    expect(three.calls).not.toContain('/json/tags/না.json');
  });

  test('the configured prefix is read at each search, so it can change at any moment', async () => {
    const { fetchJson } = server({
      '/json/tags/না.json': { নামায: ['BUK-2'] },
      '/json/tags3/নাম.json': { নামায: ['BUK-3'] },
    });
    const { searchTags } = createSearchIndex(fetchJson);
    expect(await searchTags(['নামায'])).toEqual(['BUK-3']);
    setTagsPrefixForTests(2);
    expect(await searchTags(['নামায'])).toEqual(['BUK-2']);
    setTagsPrefixForTests(3);
    expect(await searchTags(['নামায'])).toEqual(['BUK-3']);
  });

  test('a word filed under either spelling of য় is found, whichever file it is in', async () => {
    const word = `হ${YA_NUKTA}েছে`; // হয়েছে as the search spells it
    const { fetchJson, calls } = server({
      [`/json/tags3/হ${YA_NUKTA}.json`]: { [word]: ['BUK-1'] },
      [`/json/tags3/হ${YA_ONE}ে.json`]: { [`হ${YA_ONE}েছে`]: ['BUK-2'] },
    });
    const { searchTags } = createSearchIndex(fetchJson);
    expect((await searchTags([word])).sort()).toEqual(['BUK-1', 'BUK-2']);
    expect(calls).toEqual(expect.arrayContaining([`/json/tags3/হ${YA_NUKTA}.json`, `/json/tags3/হ${YA_ONE}ে.json`]));
  });

  test('a word with ো: the one-character spelling and ে + া are both looked up', async () => {
    const word = `র${O}জা`;
    const { fetchJson } = server({
      [`/json/tags3/র${O}জ.json`]: { [word]: ['BUK-1'] },
      [`/json/tags3/র${O_LONG}.json`]: { [`র${O_LONG}জা`]: ['BUK-2'] },
    });
    const { searchTags } = createSearchIndex(fetchJson);
    expect((await searchTags([word])).sort()).toEqual(['BUK-1', 'BUK-2']);
  });
});

describe('a data file that does not exist', () => {
  beforeEach(() => setTagsPrefixForTests(3));

  test('is an empty result, not an error, and is not asked for again', async () => {
    const { fetchJson, calls } = server({ '/json/tags3/নাম.json': { নামায: ['BUK-1'] } });
    const { searchTags } = createSearchIndex(fetchJson);
    expect(await searchTags(['zzzz'])).toEqual([]);
    expect(await searchTags(['zzzz', 'নামায'])).toEqual(['BUK-1']);
    expect(calls.filter((url) => url === '/json/tags3/zzz.json')).toHaveLength(1);
  });

  test('a failure that is not a 404 is still tried again on the next search', async () => {
    let attempts = 0;
    const fetchJson = async (url) => {
      if (url === '/json/tags3/নাম.json') {
        attempts++;
        if (attempts === 1) throw new Error('network');
        return { নামায: ['BUK-1'] };
      }
      throw notFound(url);
    };
    const { searchTags } = createSearchIndex(fetchJson);
    expect(await searchTags(['নামায'])).toEqual([]);
    expect(await searchTags(['নামায'])).toEqual(['BUK-1']);
  });

  test('with the real loader, a 404 from the server gives the same: empty, and fetched once', async () => {
    global.fetch = vi.fn(() => Promise.resolve({ ok: false, status: 404 }));
    const { searchTags } = createSearchIndex();
    expect(await searchTags(['qqqq'])).toEqual([]);
    expect(await searchTags(['qqqq'])).toEqual([]);
    expect(global.fetch).toHaveBeenCalledTimes(2); // tags3/qqq and substring/qq, once each
  });

  test('a word that would need an unsafe file name asks for no file at all', async () => {
    const { fetchJson, calls } = server({});
    const { searchTags } = createSearchIndex(fetchJson);
    expect(await searchTags(['a\\b', '%x', 'a/b'])).toEqual([]);
    expect(calls.filter((url) => url.includes('/tags3/'))).toEqual([]);
  });
});

describe('did you mean on the 3-letter layout', () => {
  beforeEach(() => setTagsPrefixForTests(3));

  test('a typo in the first letters is swapped for the confused letter and found in its own file', async () => {
    // ণামায has no file; নামায has one
    const { fetchJson } = server({ '/json/tags3/নাম.json': { নামায: tags(2921) } });
    const { suggest } = createSearchIndex(fetchJson);
    expect(await suggest(['ণামায'], { resultCount: 0 })).toEqual([
      { query: 'নামায', changed: [{ from: 'ণামায', to: 'নামায' }], kind: 'variant', hits: 2921 },
    ]);
  });

  test('offers a close word from the file the typed word belongs to', async () => {
    const { fetchJson } = server({ '/json/tags3/নাম.json': { নামায: tags(40), নামাজ: tags(9) } });
    const { suggest } = createSearchIndex(fetchJson);
    const result = await suggest(['নামা'], { resultCount: 0 });
    expect(result.map((s) => s.query)).toEqual(['নামায', 'নামাজ']);
    expect(result[0].kind).toBe('close');
  });

  test('loads only a few extra data files however many spellings it tries', async () => {
    const { fetchJson, calls } = server({});
    const { suggest } = createSearchIndex(fetchJson);
    await suggest(['শিশুদেরকে'], { resultCount: 0 });
    const tagFiles = new Set(calls.filter((url) => url.startsWith('/json/tags3/')));
    expect(tagFiles.size).toBeLessThanOrEqual(7);
    expect(calls.some((url) => url.startsWith('/json/tags/'))).toBe(false);
  });

  test('the extra-file budget holds even when every spelling has two files', async () => {
    // words starting with য়/ো have two candidate files each; the budget counts files, not words
    const { fetchJson, calls } = server({});
    const { suggest } = createSearchIndex(fetchJson);
    await suggest([`র${O}${YA_NUKTA}াল`], { resultCount: 0 });
    const tagFiles = new Set(calls.filter((url) => url.startsWith('/json/tags3/')));
    // the typed word's own files (up to 3 spellings) plus at most 6 extra
    expect(tagFiles.size).toBeLessThanOrEqual(3 + 6);
  });
});
