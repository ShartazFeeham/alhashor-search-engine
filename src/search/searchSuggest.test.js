import { createSearchIndex } from './searchIndex';

// Fake data server: url -> parsed JSON; anything else fails like a 404. Files are named by the
// first two characters of the word, as in the real data.
function server(files) {
  const calls = [];
  const fetchJson = async (url) => {
    calls.push(url);
    if (!(url in files)) throw new Error(`404 ${url}`);
    return files[url];
  };
  return { fetchJson, calls };
}

const file = (word, kind = 'tags') => `/json/${kind}/${word.substring(0, 2)}.json`;
const tags = (n, book = 'BUK') => Array.from({ length: n }, (_, i) => `${book}-${i + 1}`);

describe('suggest', () => {
  test('a typo in the first two letters: swaps a confused letter and finds the word in its own file', async () => {
    // ণামায has no file at all (ণা); নামায has one (না)
    const { fetchJson } = server({ [file('নামায')]: { নামায: tags(2921) } });
    const { suggest } = createSearchIndex(fetchJson);
    expect(await suggest(['ণামায'], { resultCount: 0 })).toEqual([
      { query: 'নামায', changed: [{ from: 'ণামায', to: 'নামায' }], kind: 'variant', hits: 2921 },
    ]);
  });

  test('offers a hand-made synonym that returns more hadis than the typed word', async () => {
    const { fetchJson } = server({
      [file('বেহেশত')]: { বেহেশত: tags(2) },
      [file('জান্নাত')]: { জান্নাত: tags(268) },
    });
    const { suggest } = createSearchIndex(fetchJson);
    const [first] = await suggest(['বেহেশত'], { resultCount: 2 });
    expect(first).toMatchObject({ query: 'জান্নাত', kind: 'synonym', hits: 268 });
  });

  test('offers a close word from the file the typed word belongs to', async () => {
    const { fetchJson } = server({ [file('নামায')]: { নামায: tags(40), নামাজ: tags(9) } });
    const { suggest } = createSearchIndex(fetchJson);
    const result = await suggest(['নামা'], { resultCount: 0 });
    expect(result.map((s) => s.query)).toEqual(['নামায', 'নামাজ']);
    expect(result[0].kind).toBe('close');
  });

  test('only offers words that really return hadis (no data file, no suggestion)', async () => {
    const { fetchJson } = server({});
    const { suggest } = createSearchIndex(fetchJson);
    expect(await suggest(['বেহেশত'], { resultCount: 0 })).toEqual([]);
  });

  test('does not offer a word that returns fewer hadis than the typed one', async () => {
    const { fetchJson } = server({
      [file('বেহেশত')]: { বেহেশত: tags(2) },
      [file('জান্নাত')]: { জান্নাত: tags(3) },
    });
    const { suggest } = createSearchIndex(fetchJson);
    expect(await suggest(['বেহেশত'], { resultCount: 2 })).toEqual([]);
  });

  test('offers nothing when the search found enough and every word matched something', async () => {
    const { fetchJson } = server({ [file('যাকাত')]: { যাকাত: tags(381) } });
    const { suggest } = createSearchIndex(fetchJson);
    expect(await suggest(['যাকাত'], { resultCount: 381 })).toEqual([]);
  });

  test('offers nothing for a word the search matched through longer words', async () => {
    const { fetchJson } = server({
      [file('নামা')]: { নামাযী: tags(30) },
      [file('নামা', 'substring')]: { নামা: ['নামাযী'] },
    });
    const { suggest } = createSearchIndex(fetchJson);
    expect(await suggest(['নামা'], { resultCount: 30 })).toEqual([]);
  });

  test('in a search with many results, a word that matched nothing at all still gets a suggestion', async () => {
    const { fetchJson } = server({
      [file('রোজা')]: { রোজা: tags(403) },
      [file('নামায')]: { নামায: tags(381, 'MUS') },
    });
    const { suggest } = createSearchIndex(fetchJson);
    const result = await suggest(['রোজা', 'ণামায'], { resultCount: 403 });
    expect(result).toEqual([
      { query: 'রোজা নামায', changed: [{ from: 'ণামায', to: 'নামায' }], kind: 'variant', hits: 381 },
    ]);
  });

  test('when two words are weak, every suggestion fixes both', async () => {
    const { fetchJson } = server({
      [file('যাকাত')]: { যাকাত: tags(381) },
      [file('নামায')]: { নামায: tags(2921, 'MUS') },
    });
    const { suggest } = createSearchIndex(fetchJson);
    const [first] = await suggest(['জাকাত', 'ণামায'], { resultCount: 0 });
    expect(first.query).toBe('যাকাত নামায');
    expect(first.kind).toBe('synonym');
    expect(first.changed).toEqual([
      { from: 'জাকাত', to: 'যাকাত' },
      { from: 'ণামায', to: 'নামায' },
    ]);
  });

  test('offers at most three suggestions, synonyms before close words, the most hadis first', async () => {
    const { fetchJson } = server({
      [file('রোজা')]: { রোজা: tags(1), রোযা: tags(751), রোজার: tags(300), রোজাদার: tags(5) },
      [file('সিয়াম')]: { সিয়াম: tags(604) },
    });
    const { suggest } = createSearchIndex(fetchJson);
    const result = await suggest(['রোজা'], { resultCount: 1 });
    expect(result.map((s) => s.query)).toEqual(['রোযা', 'সিয়াম', 'রোজার']);
    expect(result.map((s) => s.kind)).toEqual(['synonym', 'synonym', 'close']);
  });

  test('numbers and Latin words are left alone and fetch nothing', async () => {
    const { fetchJson, calls } = server({});
    const { suggest } = createSearchIndex(fetchJson);
    expect(await suggest(['১৫০', 'zakat'], { resultCount: 0 })).toEqual([]);
    expect(calls).toEqual([]);
  });

  test('loads only a few extra data files however many spellings it tries', async () => {
    const { fetchJson, calls } = server({});
    const { suggest } = createSearchIndex(fetchJson);
    await suggest(['শিশুদেরকে'], { resultCount: 0 });
    const tagFiles = new Set(calls.filter((url) => url.startsWith('/json/tags/')));
    expect(tagFiles.size).toBeLessThanOrEqual(7);
  });

  test('downloads a file it has already loaded for the search only once', async () => {
    const { fetchJson, calls } = server({ [file('নামায')]: { নামায: tags(40) } });
    const { searchTags, suggest } = createSearchIndex(fetchJson);
    await searchTags(['নামা']);
    await suggest(['নামা'], { resultCount: 0 });
    expect(calls.filter((url) => url === file('নামায'))).toHaveLength(1);
  });

  test('stops early when told the search is stale', async () => {
    const { fetchJson } = server({ [file('যাকাত')]: { যাকাত: tags(381) } });
    const { suggest } = createSearchIndex(fetchJson);
    expect(await suggest(['জাকাত'], { resultCount: 0, isCancelled: () => true })).toEqual([]);
  });
});
