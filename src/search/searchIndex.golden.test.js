import { createSearchIndex, normalizeQuery } from './searchIndex';
import { serveRealData } from '../test/publicJson';
import { QUERIES, countingIndex, rareWords, readFile } from '../test/realIndex';
import { setTagsPrefixForTests } from './searchConfig';

// GOLDEN TEST: the 2-letter layout (public/json/tags) and the 3-letter one (public/json/tags3)
// must give the same answers. Both run the real search over the real data files; only the folder
// differs. Each layout has its own index (its own file cache) and its own list of what it fetched.

vi.setConfig({ testTimeout: 180000 });

function layout(prefix) {
  return { prefix, ...countingIndex() };
}

const sorted = (list) => [...list].sort();
const rankingDifferences = [];

describe('golden: searchTags with 2-letter and with 3-letter files', () => {
  const two = layout(2);
  const three = layout(3);
  const queries = [...QUERIES];

  test('the sample covers at least 40 queries, with 8 rare words from the data', () => {
    queries.push(...rareWords());
    expect(queries.length).toBeGreaterThanOrEqual(50);
    expect(new Set(queries).size).toBe(queries.length);
  });

  test('every query returns the same hadis in both layouts (the common words fetch most of the data)', async () => {
    for (const query of queries) {
      const words = normalizeQuery(query);
      for (const requireAll of [false, true]) {
        const a = await two.index.searchTags(words, { tagsPrefix: 2, requireAll });
        const b = await three.index.searchTags(words, { tagsPrefix: 3, requireAll });
        expect(sorted(b), `${query} (requireAll ${requireAll})`).toEqual(sorted(a));
        if (JSON.stringify(a) !== JSON.stringify(b)) rankingDifferences.push(`${query} ${requireAll}`);
      }
    }
  });

  test('the queries are not all empty: the real data answered, and common words have thousands of hadis', async () => {
    const nonEmpty = [];
    for (const query of queries) if ((await two.index.searchTags(normalizeQuery(query), { tagsPrefix: 2 })).length > 0) nonEmpty.push(query);
    expect(nonEmpty.length).toBeGreaterThanOrEqual(queries.length - 12);
    expect((await two.index.searchTags(['নামায'], { tagsPrefix: 2 })).length).toBeGreaterThan(2000);
    expect((await two.index.searchTags(['qqqq'], { tagsPrefix: 2 })).length).toBe(0);
  });

  test('the order of the results is the same too', () => {
    expect(rankingDifferences).toEqual([]);
  });

  test('each layout read only its own folder for the words', () => {
    expect(two.fetched.some((url) => url.includes('/json/tags3/'))).toBe(false);
    expect(three.fetched.some((url) => url.startsWith('/json/tags/'))).toBe(false);
    expect(two.fetched.some((url) => url.startsWith('/json/tags/'))).toBe(true);
    expect(three.fetched.some((url) => url.includes('/json/tags3/'))).toBe(true);
    // the substring files are the same 2-letter ones in both
    expect(three.fetched.some((url) => url.startsWith('/json/substring/'))).toBe(true);
    expect(three.fetched.every((url) => /^\/json\/(tags3|substring)\//.test(url))).toBe(true);
  });
});

describe('golden: the switch itself, with the real fetch', () => {
  afterEach(() => {
    delete global.fetch;
  });

  test('the configured prefix decides which folder a search reads, at each search', async () => {
    serveRealData();
    const { searchTags } = createSearchIndex();
    setTagsPrefixForTests(2);
    const a = await searchTags(['রোজা']);
    expect(global.fetch.mock.calls.map(([url]) => decodeURIComponent(url)).some((url) => url.startsWith('/json/tags/'))).toBe(true);
    global.fetch.mockClear();
    setTagsPrefixForTests(3);
    const b = await searchTags(['রোজা']);
    const urls = global.fetch.mock.calls.map(([url]) => decodeURIComponent(url));
    expect(urls.some((url) => url.startsWith('/json/tags3/'))).toBe(true);
    expect(urls.some((url) => url.startsWith('/json/tags/'))).toBe(false);
    expect(sorted(b)).toEqual(sorted(a));
    expect(a.length).toBeGreaterThan(100);
  });
});

// "Did you mean". The suggestions come from spellings of the typed word (letter swaps, synonyms)
// and from words one edit away in the data file the typed word lives in. The first two are the
// same in both layouts. The third is not by nature: a 3-letter file holds fewer words than the
// 2-letter file it was cut from, so a typo in the third letter reaches fewer words (the known risk
// of the decision in docs/decision-subsequence-mapping.md, which the word list of stage 2 is meant
// to fix). The tests below pin both facts.
describe('golden: suggest with 2-letter and with 3-letter files', () => {
  const two = layout(2);
  const three = layout(3);
  const suggested = async (prefix, words, resultCount = 0) => {
    const { index } = prefix === 2 ? two : three;
    return (await index.suggest(words, { resultCount, tagsPrefix: prefix })).map((choice) => choice.query);
  };

  // each: a misspelling and what it should be
  const MISSPELLINGS = [
    ['সয়তান', 'শয়তান'], // শ/স, first letter
    ['মুসলীম', 'মুসলিম'], // ী for ি
    ['তাকোয়া', 'তাকওয়া'], // ো for ও
    ['কিয়ামাত', 'কিয়ামত'], // extra letter
    ['পবিত্রত', 'পবিত্রতা'], // dropped letter at the end
    ['জাহান্নম', 'জাহান্নাম'], // dropped letter
    ['মসজীদ', 'মসজিদ'],
    ['মুমীন', 'মুমিন'],
    ['সালামম', 'সালাম'], // doubled letter
    ['মোনাফেক', 'মোনাফিক'],
    ['হিজরাত', 'হিজরত'],
    ['দোআ', 'দুআ'],
  ];

  test.each(MISSPELLINGS)('%s: the same words are suggested, and %s is one of them', async (typed, expected) => {
    const a = await suggested(2, [typed]);
    const b = await suggested(3, [typed]);
    expect(a).toContain(expected);
    expect(sorted(b)).toEqual(sorted(a));
  });

  test('also with a result count of 1, with two words, and with the layout chosen by the switch', async () => {
    expect(sorted(await suggested(3, ['সয়তান'], 1))).toEqual(sorted(await suggested(2, ['সয়তান'], 1)));
    const a = await suggested(2, ['সয়তান', 'মসজীদ']);
    const b = await suggested(3, ['সয়তান', 'মসজীদ']);
    expect(a.length).toBeGreaterThan(0);
    expect(sorted(b)).toEqual(sorted(a));

    serveRealData();
    const { suggest } = createSearchIndex();
    setTagsPrefixForTests(3);
    expect((await suggest(['মসজীদ'], { resultCount: 0 })).map((choice) => choice.query)).toEqual(['মসজিদ']);
    expect(global.fetch.mock.calls.some(([url]) => decodeURIComponent(url).startsWith('/json/tags3/'))).toBe(true);
    delete global.fetch;
  });

  test('nothing is suggested in either layout for a word that is fine or has no spelling to offer', async () => {
    for (const word of ['নামাজ', 'রোযা', 'আযান', 'ফজর', 'qqqq', '১২৩']) {
      expect(await suggested(3, [word]), word).toEqual(await suggested(2, [word]));
    }
  });

  test('a typo in the real correction\'s third letter is the known gap: the 3-letter files cannot reach it', async () => {
    const GAP = [['হজজ', 'হজ্জ'], ['ঈমন', 'ঈমান'], ['নাযায', 'নামায']];
    for (const [typed, expected] of GAP) {
      expect(await suggested(2, [typed]), typed).toContain(expected);
      expect(await suggested(3, [typed]), typed).not.toContain(expected);
    }
  });

  test('where the sets differ the real correction is still offered when it is a swap, and only extra "close" words are lost', async () => {
    for (const [typed, expected] of [['জাকাত', 'যাকাত'], ['জান্নত', 'জান্নাত'], ['যাকত', 'যাকাত'], ['কুরআণ', 'কুরআন'], ['দূআ', 'দুআ']]) {
      expect(await suggested(2, [typed]), typed).toContain(expected);
      expect(await suggested(3, [typed]), typed).toContain(expected);
    }
  });

  test('the extra-file budget holds in both layouts for real words', async () => {
    for (const [prefix, folder] of [[2, '/json/tags/'], [3, '/json/tags3/']]) {
      const fetched = [];
      const index = createSearchIndex(async (url) => {
        fetched.push(url);
        const data = readFile(url);
        if (data === null) throw Object.assign(new Error('404'), { status: 404 });
        return data;
      });
      await index.suggest(['শিশুদেরকে'], { resultCount: 0, tagsPrefix: prefix });
      const files = new Set(fetched.filter((url) => url.startsWith(folder)));
      expect(files.size, `${folder}`).toBeLessThanOrEqual(7);
    }
  });
});
