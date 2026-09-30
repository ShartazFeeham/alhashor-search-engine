import { createSearchIndex, normalizeBengali, normalizeQuery } from './searchIndex';

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

// The data stores the same Bengali letter in different spellings, so words typed one
// way must match hadis indexed the other way.
const YA_PRECOMPOSED = '\u09df'; // য়
const YA_DECOMPOSED = '\u09af\u09bc'; // য + ়
const O_PRECOMPOSED = '\u09cb'; // ো
const O_DECOMPOSED = '\u09c7\u09be'; // ে + া

describe('normalizeBengali', () => {
  test('gives one spelling to letters the data writes in two ways', () => {
    expect(normalizeBengali(`ম${YA_PRECOMPOSED}লা`)).toBe(normalizeBengali(`ম${YA_DECOMPOSED}লা`));
    expect(normalizeBengali(`ক${O_PRECOMPOSED}ন`)).toBe(normalizeBengali(`ক${O_DECOMPOSED}ন`));
    expect(normalizeBengali('\u09dc')).toBe(normalizeBengali('\u09a1\u09bc')); // ড়
    expect(normalizeBengali('\u09dd')).toBe(normalizeBengali('\u09a2\u09bc')); // ঢ়
  });

  test('drops invisible joiner characters', () => {
    expect(normalizeBengali('কর\u200cা')).toBe('করা');
    expect(normalizeBengali('কর\u200dা')).toBe('করা');
  });

  test('leaves plain text alone', () => {
    expect(normalizeBengali('fast')).toBe('fast');
    expect(normalizeBengali('রোজা')).toBe(normalizeBengali('রোজা'));
  });
});

describe('searchTags with different spellings', () => {
  test('finds a word typed with one spelling of য় in a file that uses the other', async () => {
    const stored = `ম${YA_DECOMPOSED}লা`;
    const { fetchJson } = fakeServer({
      [`/json/tags/${stored.substring(0, 2)}.json`]: { [stored]: ['BUK-1'] },
    });
    const { searchTags } = createSearchIndex(fetchJson);
    expect(await searchTags([`ম${YA_PRECOMPOSED}লা`])).toEqual(['BUK-1']);
  });

  test('and the other way round', async () => {
    const stored = `ম${YA_PRECOMPOSED}লা`;
    const { fetchJson } = fakeServer({
      [`/json/tags/${stored.substring(0, 2)}.json`]: { [stored]: ['BUK-2'] },
    });
    const { searchTags } = createSearchIndex(fetchJson);
    expect(await searchTags([`ম${YA_DECOMPOSED}লা`])).toEqual(['BUK-2']);
  });

  test('combines hadis indexed under both spellings of the same word', async () => {
    const precomposed = `ম${YA_PRECOMPOSED}লা`;
    const decomposed = `ম${YA_DECOMPOSED}লা`;
    const { fetchJson } = fakeServer({
      [`/json/tags/${precomposed.substring(0, 2)}.json`]: { [precomposed]: ['BUK-1'] },
      [`/json/tags/${decomposed.substring(0, 2)}.json`]: { [decomposed]: ['BUK-2'] },
    });
    const { searchTags } = createSearchIndex(fetchJson);
    expect((await searchTags([precomposed])).sort()).toEqual(['BUK-1', 'BUK-2']);
  });

  test('finds a word whose ো is stored in the other form, in either direction', async () => {
    const precomposed = `ক${O_PRECOMPOSED}ন`;
    const decomposed = `ক${O_DECOMPOSED}ন`;
    const server = fakeServer({
      [`/json/tags/${precomposed.substring(0, 2)}.json`]: { [precomposed]: ['BUK-1'] },
    });
    expect(await createSearchIndex(server.fetchJson).searchTags([decomposed])).toEqual(['BUK-1']);

    const other = fakeServer({
      [`/json/tags/${decomposed.substring(0, 2)}.json`]: { [decomposed]: ['BUK-2'] },
    });
    expect(await createSearchIndex(other.fetchJson).searchTags([precomposed])).toEqual(['BUK-2']);
  });

  test('a word typed without an invisible joiner matches the stored word that has one', async () => {
    const { fetchJson } = fakeServer({
      '/json/tags/কর.json': { 'কর\u200cা': ['BUK-3'] },
    });
    const { searchTags } = createSearchIndex(fetchJson);
    expect(await searchTags(['করা'])).toEqual(['BUK-3']);
  });

  test('also finds hadis through longer words stored under another spelling', async () => {
    const shortWord = `ম${YA_PRECOMPOSED}`;
    const longer = `ম${YA_DECOMPOSED}লা`;
    const { fetchJson } = fakeServer({
      [`/json/tags/${shortWord}.json`]: {},
      [`/json/substring/${shortWord}.json`]: { [shortWord]: [longer] },
      [`/json/tags/${longer.substring(0, 2)}.json`]: { [longer]: ['BUK-4'] },
    });
    const { searchTags } = createSearchIndex(fetchJson);
    expect(await searchTags([shortWord])).toEqual(['BUK-4']);
  });

  test('a word with no ambiguous letters still needs only one data file', async () => {
    const { fetchJson, calls } = fakeServer({
      '/json/tags/fa.json': { fast: ['BUK-1'] },
    });
    const { searchTags } = createSearchIndex(fetchJson);
    await searchTags(['fast']);
    expect(calls.filter((url) => url.includes('/tags/'))).toEqual(['/json/tags/fa.json']);
  });
});

describe('ranking', () => {
  test('among hadis matching the same number of words, exact matches come first', async () => {
    const { fetchJson } = fakeServer({
      '/json/tags/aa.json': { aa: ['T-mixed', 'T-exact', 'T-one'], aaa: ['T-longer'] },
      '/json/substring/aa.json': { aa: ['aaa'] },
      '/json/tags/bb.json': { bb: ['T-exact'], bbb: ['T-longer', 'T-mixed'] },
      '/json/substring/bb.json': { bb: ['bbb'] },
    });
    const { searchTags } = createSearchIndex(fetchJson);
    // T-exact: both words exactly; T-mixed: one exactly, one inside a longer word;
    // T-longer: both inside longer words; T-one matches only one word, so it is last.
    expect(await searchTags(['aa', 'bb'])).toEqual(['T-exact', 'T-mixed', 'T-longer', 'T-one']);
  });

  test('for a single word, exact matches come before matches inside longer words', async () => {
    const { fetchJson } = fakeServer({
      '/json/tags/fa.json': { fasting: ['BUK-1'], fast: ['BUK-2'] },
      '/json/substring/fa.json': { fast: ['fasting'] },
    });
    const { searchTags } = createSearchIndex(fetchJson);
    expect(await searchTags(['fast'])).toEqual(['BUK-2', 'BUK-1']);
  });

  test('requireAll still means every word matched, exactly or inside a longer word', async () => {
    const { fetchJson } = fakeServer({
      '/json/tags/aa.json': { aa: ['T-exact'], aaa: ['T-longer'] },
      '/json/substring/aa.json': { aa: ['aaa'] },
      '/json/tags/bb.json': { bb: ['T-exact'], bbb: ['T-longer', 'T-only-bb'] },
      '/json/substring/bb.json': { bb: ['bbb'] },
    });
    const { searchTags } = createSearchIndex(fetchJson);
    expect(await searchTags(['aa', 'bb'], { requireAll: true })).toEqual(['T-exact', 'T-longer']);
  });
});

describe('long queries', () => {
  const commonTags = Array.from({ length: 501 }, (_, i) => `BUK-${i + 1}`);
  const eightWords = ['cm', 'rr', 'w3', 'w4', 'w5', 'w6', 'w7', 'w8'];

  test('a short query looks inside longer words for every word, common or not', async () => {
    const { fetchJson, calls } = fakeServer({
      '/json/tags/cm.json': { cm: commonTags },
      '/json/substring/cm.json': { cm: [] },
    });
    const { searchTags } = createSearchIndex(fetchJson);
    await searchTags(['cm']);
    expect(calls).toContain('/json/substring/cm.json');
  });

  test('a long query skips longer words only for very common words', async () => {
    const { fetchJson, calls } = fakeServer({
      '/json/tags/cm.json': { cm: commonTags },
      '/json/substring/cm.json': { cm: [] },
      '/json/tags/rr.json': { rr: ['BUK-1'] },
      '/json/substring/rr.json': { rr: [] },
    });
    const { searchTags } = createSearchIndex(fetchJson);
    await searchTags(eightWords);
    expect(calls).not.toContain('/json/substring/cm.json');
    expect(calls).toContain('/json/substring/rr.json');
  });

  test('a rare word in a long query still finds hadis through longer words', async () => {
    const { fetchJson } = fakeServer({
      '/json/tags/rr.json': { rr: ['BUK-1'], rrr: ['BUK-2'] },
      '/json/substring/rr.json': { rr: ['rrr'] },
    });
    const { searchTags } = createSearchIndex(fetchJson);
    expect(await searchTags(['rr', 'w2', 'w3', 'w4', 'w5', 'w6', 'w7', 'w8'])).toEqual(['BUK-1', 'BUK-2']);
  });
});
