import { createSearchIndex, normalizeQuery } from './searchIndex';

// Fake data server: url -> parsed JSON. Anything else fails like a 404.
function fakeServer(shards, { delay = 0 } = {}) {
  const calls = [];
  let inFlight = 0;
  let maxInFlight = 0;
  const fetchJson = async (url) => {
    calls.push(url);
    inFlight++;
    maxInFlight = Math.max(maxInFlight, inFlight);
    if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
    inFlight--;
    if (!(url in shards)) throw new Error(`404 ${url}`);
    return shards[url];
  };
  return { fetchJson, calls, maxInFlight: () => maxInFlight };
}

describe('normalizeQuery', () => {
  test('removes punctuation, collapses spaces and splits into words', () => {
    expect(normalizeQuery('  রোজা,   নামায।  ')).toEqual(['রোজা', 'নামায']);
  });

  test('returns no words for empty, blank or punctuation-only input', () => {
    expect(normalizeQuery('')).toEqual([]);
    expect(normalizeQuery('   ')).toEqual([]);
    expect(normalizeQuery(' ,.। ')).toEqual([]);
    expect(normalizeQuery(undefined)).toEqual([]);
  });
});

describe('searchTags', () => {
  test('finds the hadis that contain a word', async () => {
    const { fetchJson } = fakeServer({
      '/json/tags/fa.json': { fast: ['BUK-1', 'MUS-2'] },
    });
    const { searchTags } = createSearchIndex(fetchJson);
    expect(await searchTags(['fast'])).toEqual(['BUK-1', 'MUS-2']);
  });

  test('also finds hadis containing longer words that include the word', async () => {
    const { fetchJson } = fakeServer({
      '/json/tags/fa.json': { fast: ['BUK-1'], fasting: ['BUK-2'] },
      '/json/substring/fa.json': { fast: ['fasting'] },
    });
    const { searchTags } = createSearchIndex(fetchJson);
    expect(await searchTags(['fast'])).toEqual(['BUK-1', 'BUK-2']);
  });

  test('ranks hadis matching more of the words first', async () => {
    const { fetchJson } = fakeServer({
      '/json/tags/fa.json': { fast: ['BUK-1', 'BUK-2'] },
      '/json/tags/pr.json': { prayer: ['BUK-2', 'BUK-3'] },
    });
    const { searchTags } = createSearchIndex(fetchJson);
    expect(await searchTags(['fast', 'prayer'])).toEqual(['BUK-2', 'BUK-1', 'BUK-3']);
  });

  test('requireAll keeps only hadis matching every word', async () => {
    const { fetchJson } = fakeServer({
      '/json/tags/fa.json': { fast: ['BUK-1', 'BUK-2'] },
      '/json/tags/pr.json': { prayer: ['BUK-2', 'BUK-3'] },
    });
    const { searchTags } = createSearchIndex(fetchJson);
    expect(await searchTags(['fast', 'prayer'], { requireAll: true })).toEqual(['BUK-2']);
  });

  test('skips the longer-word lookup for queries of eight or more words', async () => {
    const words = ['aa', 'bb', 'cc', 'dd', 'ee', 'ff', 'gg', 'hh'];
    const { fetchJson, calls } = fakeServer({});
    const { searchTags } = createSearchIndex(fetchJson);
    await searchTags(words);
    expect(calls.some((url) => url.includes('/substring/'))).toBe(false);
  });

  test('downloads each data file only once, even across searches and at the same time', async () => {
    const { fetchJson, calls } = fakeServer({
      '/json/tags/fa.json': { fast: ['BUK-1'] },
      '/json/substring/fa.json': {},
    });
    const { searchTags } = createSearchIndex(fetchJson);
    await Promise.all([searchTags(['fast']), searchTags(['fast'])]);
    await searchTags(['fast']);
    expect(calls.filter((url) => url === '/json/tags/fa.json')).toHaveLength(1);
    expect(calls.filter((url) => url === '/json/substring/fa.json')).toHaveLength(1);
  });

  test('downloads the data files for different words at the same time', async () => {
    const server = fakeServer(
      {
        '/json/tags/aa.json': { aa: ['BUK-1'] },
        '/json/tags/bb.json': { bb: ['BUK-2'] },
        '/json/tags/cc.json': { cc: ['BUK-3'] },
      },
      { delay: 5 }
    );
    const { searchTags } = createSearchIndex(server.fetchJson);
    await searchTags(['aa', 'bb', 'cc']);
    expect(server.maxInFlight()).toBeGreaterThan(2);
  });

  test('a missing data file means no hadis for that word, not a failed search', async () => {
    const { fetchJson } = fakeServer({
      '/json/tags/fa.json': { fast: ['BUK-1'] },
    });
    const { searchTags } = createSearchIndex(fetchJson);
    expect(await searchTags(['zz'])).toEqual([]);
    expect(await searchTags(['fast', 'zz'])).toEqual(['BUK-1']);
  });

  test('a data file that fails once is fetched again on the next search', async () => {
    let attempts = 0;
    const fetchJson = async (url) => {
      if (url === '/json/tags/fa.json') {
        attempts++;
        if (attempts === 1) throw new Error('network');
        return { fast: ['BUK-1'] };
      }
      throw new Error('404');
    };
    const { searchTags } = createSearchIndex(fetchJson);
    expect(await searchTags(['fast'])).toEqual([]);
    expect(await searchTags(['fast'])).toEqual(['BUK-1']);
  });

  test('ignores a data file that is not a JSON object', async () => {
    const { fetchJson } = fakeServer({
      '/json/tags/fa.json': '<html>not json</html>',
    });
    const { searchTags } = createSearchIndex(fetchJson);
    expect(await searchTags(['fast'])).toEqual([]);
  });

  test('words named like built-in object properties do not break the search', async () => {
    const { fetchJson } = fakeServer({
      '/json/tags/co.json': {},
      '/json/substring/co.json': {},
    });
    const { searchTags } = createSearchIndex(fetchJson);
    expect(await searchTags(['constructor'])).toEqual([]);
    expect(await searchTags(['toString'])).toEqual([]);
  });

  test('returns nothing for an empty word list', async () => {
    const { fetchJson } = fakeServer({});
    const { searchTags } = createSearchIndex(fetchJson);
    expect(await searchTags([])).toEqual([]);
  });
});
