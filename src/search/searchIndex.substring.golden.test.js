import { normalizeBengali } from '../Helpers/bengali';
import { candidateShards } from '../lib/indexShards';
import { normalizeQuery } from './searchIndex';
import { QUERIES, countingIndex, rareWords, readFile } from '../test/realIndex';

// GOLDEN TEST for the 3-letter substring files (public/json/substring3) and the cap on the
// containing words (containingCap). The real search runs over the real data files; only the folders
// and the cap differ. Each combination has its own index (its own file cache) and its own list of
// what it fetched.

vi.setConfig({ testTimeout: 180000 });

const sorted = (list) => [...list].sort();
const sameOrder = (a, b) => JSON.stringify(a) === JSON.stringify(b);

function mode({ tags, substring, cap = 0 }) {
  return { options: { tagsPrefix: tags, substringPrefix: substring, containingCap: cap }, ...countingIndex() };
}

describe('golden: substring/ (2 letters) and substring3/ (3 letters) with the cap off', () => {
  const queries = [...QUERIES, ...rareWords()];
  const two = mode({ tags: 2, substring: 2 });
  const three = mode({ tags: 2, substring: 3 });

  test('the sample is at least 56 queries', () => {
    expect(queries.length).toBeGreaterThanOrEqual(56);
  });

  test('every query returns the same hadis, in the same order, with and without "all words"', async () => {
    const different = [];
    for (const query of queries) {
      const words = normalizeQuery(query);
      for (const requireAll of [false, true]) {
        const a = await two.index.searchTags(words, { ...two.options, requireAll });
        const b = await three.index.searchTags(words, { ...three.options, requireAll });
        expect(sorted(b), `${query} (requireAll ${requireAll})`).toEqual(sorted(a));
        if (!sameOrder(a, b)) different.push(`${query} ${requireAll}`);
      }
    }
    expect(different).toEqual([]);
  });

  test('the queries are not all empty: common words have thousands of hadis', async () => {
    expect((await two.index.searchTags(['নামায'], two.options)).length).toBeGreaterThan(2000);
    expect((await two.index.searchTags(['qqqq'], two.options)).length).toBe(0);
  });

  test('each mode read only its own substring folder', () => {
    const substringUrls = (list) => list.filter((url) => url.includes('/json/substring'));
    expect(substringUrls(two.fetched).length).toBeGreaterThan(50);
    expect(substringUrls(three.fetched).length).toBeGreaterThan(50);
    expect(substringUrls(two.fetched).every((url) => url.startsWith('/json/substring/'))).toBe(true);
    expect(substringUrls(three.fetched).every((url) => url.startsWith('/json/substring3/'))).toBe(true);
  });
});

describe('golden: the four combinations of tags and substring layouts agree', () => {
  // 24 queries: single common words, several words, spelling variants, short words, words with no file
  const queries = [
    'রাসূলুল্লাহ', 'নামায', 'রোজা', 'যাকাত', 'জান্নাত', 'কবর', 'সাল',
    'নামায রোজা', 'রাসূলুল্লাহ সালাত', 'আল্লাহ রাসূল ঈমান', 'জান্নাত জাহান্নাম কবর',
    '\u09B9\u09AF\u09BC\u09C7\u099B\u09C7', '\u09B9\u09DF\u09C7\u099B\u09C7', // হয়েছে as য + ় and as য়
    'পড়া', 'নৌকা', 'রোযা', 'সওয়াব', 'কে', 'রা', 'এই', 'ও', 'হয়', 'qqqq', 'ফফফ রোজা',
  ];
  const combinations = [[2, 2], [2, 3], [3, 2], [3, 3]].map(([tags, substring]) => ({ tags, substring, ...mode({ tags, substring }) }));

  test('each combination returns the same hadis, in the same order, as 2 and 2', async () => {
    expect(queries.length).toBeGreaterThanOrEqual(20);
    const [base, ...others] = combinations;
    for (const query of queries) {
      const words = normalizeQuery(query);
      const expected = await base.index.searchTags(words, base.options);
      for (const other of others) {
        const found = await other.index.searchTags(words, other.options);
        expect(found, `${query}: tags ${other.tags}, substring ${other.substring}`).toEqual(expected);
      }
    }
  });
});

// How many data files a search opens, per mode. A fresh index (no cache) for each word and mode, so
// every word pays for all its files. Only the tags files are counted: they are the ones the
// expansion opens one at a time.
describe('golden: what the cap saves, and what it costs', () => {
  const WORDS = [
    'কে', 'রাসূল', 'আল্লাহ', 'করে', 'বলে', 'সালাত', // the ones named in the task
    'রা', 'তে', 'এই', 'না', 'কি', 'হয়', 'সে', 'তিনি', 'আমি', 'নামায', 'রোজা', 'যাকাত', 'কবর', 'দিন',
  ];

  const tagFiles = (fetched) => new Set(fetched.filter((url) => /^\/json\/tags3?\//.test(url))).size;
  const p99 = (numbers) => [...numbers].sort((a, b) => a - b)[Math.ceil(0.99 * numbers.length) - 1];
  const sum = (numbers) => numbers.reduce((a, b) => a + b, 0);

  const measurements = {};
  beforeAll(async () => {
    const modes = {
      twoLetters: { tags: 2, substring: 2, cap: 0 },
      threeUncapped: { tags: 3, substring: 3, cap: 0 },
      threeCapped: { tags: 3, substring: 3, cap: 50 },
      twoCapped: { tags: 2, substring: 2, cap: 50 },
    };
    for (const [name, spec] of Object.entries(modes)) {
      measurements[name] = [];
      for (const word of WORDS) {
        const m = mode(spec);
        const found = await m.index.searchTags(normalizeQuery(word), m.options);
        measurements[name].push({ word, found, files: tagFiles(m.fetched), requests: m.fetched.length });
      }
    }
  });

  test('the sample has at least 15 words, including the common ones asked for', () => {
    expect(WORDS.length).toBeGreaterThanOrEqual(15);
    for (const word of ['কে', 'রাসূল', 'আল্লাহ', 'করে', 'বলে', 'সালাত']) expect(WORDS).toContain(word);
  });

  // Measured on the real data, these 20 words, a new index for each search; tags files opened
  // (the requests of a search are those plus the 1 or 2 substring files and 1 or 2 of the word's own):
  //   2 letters (tags/ + substring/)             total 2,068 files, p99 490 (কে), mean 103
  //   3 letters, no cap (tags3/ + substring3/)   total 4,913 files, p99 1,450 (কে), mean 246
  //   3 letters, cap 50                          total   361 files, p99    41 (কে), mean  18
  // With the cap a search is 14 times cheaper than uncapped 3-letter files and 5.7 times cheaper than
  // the 2-letter files. The capped result keeps on average 98.2% of the hadis of the uncapped one;
  // the worst words are the particles না (90.6%), তে (91.4%), সে (93.1%) and কি (93.9%); the words
  // asked for keep 99.9% or more, except কে (99.2%). The rare words are not touched at all (see below).
  test('the cap cuts the files a search opens by far: total and p99', () => {
    const counts = (name) => measurements[name].map(({ files }) => files);
    const two = sum(counts('twoLetters'));
    const uncapped = sum(counts('threeUncapped'));
    const capped = sum(counts('threeCapped'));
    expect(uncapped).toBeGreaterThan(two); // the problem the cap solves: 3-letter files open more
    expect(capped).toBeLessThan(uncapped / 10);
    expect(capped).toBeLessThan(two / 4);
    expect(p99(counts('threeCapped'))).toBeLessThan(p99(counts('threeUncapped')) / 10);
    expect(p99(counts('threeCapped'))).toBeLessThanOrEqual(60);
  });

  test('every word with a cap opens at most cap + a few files for tags (the cap, the word itself)', () => {
    for (const { word, files } of measurements.threeCapped) expect(files, word).toBeLessThanOrEqual(50 + 2);
  });

  test('the capped result is part of the uncapped one and keeps at least 97% of its hadis on average', () => {
    let kept = 0;
    measurements.threeUncapped.forEach(({ word, found: all }, i) => {
      const capped = measurements.threeCapped[i].found;
      const allSet = new Set(all);
      expect(capped.every((tag) => allSet.has(tag)), word).toBe(true);
      expect(all.length, word).toBeGreaterThan(0);
      kept += capped.length / all.length;
    });
    expect(kept / WORDS.length).toBeGreaterThanOrEqual(0.97);
  });

  test('the uncapped 3-letter result is the 2-letter result (nothing is lost but by the cap)', () => {
    measurements.twoLetters.forEach(({ word, found }, i) => {
      expect(measurements.threeUncapped[i].found, word).toEqual(found);
    });
  });

  test('a rare word, one with fewer than 50 containing words, is not changed by the cap', async () => {
    // the size of the longest list the data has for the word, in any of its spellings
    const containing = (word) => {
      const key = normalizeBengali(word);
      return Math.max(0, ...candidateShards(key, 3).map((shard) => {
        const data = readFile(`/json/substring3/${encodeURIComponent(shard)}.json`) ?? {};
        return Math.max(0, ...Object.keys(data).filter((raw) => normalizeBengali(raw) === key).map((raw) => data[raw].length));
      }));
    };
    const rare = [...QUERIES, ...rareWords(), 'ফিতরা', 'জাহান্নাম', 'কিয়ামত', 'রমজান', 'শয়তান', 'মসজিদ']
      .filter((word) => !word.includes(' '))
      .filter((word) => { const n = containing(word); return n >= 1 && n < 50; });
    expect(new Set(rare).size).toBeGreaterThanOrEqual(5);
    for (const word of new Set(rare)) {
      const off = mode({ tags: 3, substring: 3, cap: 0 });
      const on = mode({ tags: 3, substring: 3, cap: 50 });
      const a = await off.index.searchTags(normalizeQuery(word), off.options);
      const b = await on.index.searchTags(normalizeQuery(word), on.options);
      expect(b, word).toEqual(a);
      expect(sorted(on.fetched), word).toEqual(sorted(off.fetched));
    }
  });

  // The same words with the cap in 2-letter mode (the substring/ lists were reordered by hadis count
  // by scripts/sort-substring-2.mjs, contents identical). Measured on the real data, tags files opened:
  //   idx2/sub2, cap off   total 2,068 files, p99 490 (কে), mean 103   (the same as above)
  //   idx2/sub2, cap 50    total   269 files, p99  32 (কে), mean  13
  // 7.7 times fewer files in total and 15 times fewer at p99; the capped result keeps 98.2% of the
  // uncapped hadis on average (the same words and the same lists as with 3 letters, so the same 98.2%:
  // কে 99.2%, রা 99.1%, দিন 97.8%, কি 93.9%, সে 93.1%, তে 91.4%, না 90.6%, all others 99.9% or more).
  // The 3-letter modes need more files for the same words (cap off 4,913, cap 50 361), because a
  // 2-letter tags file is shared by more words, so the 2-letter mode with the cap is the cheapest.
  test('the cap works in the 2-letter substring mode: far fewer files, total and p99', () => {
    const counts = (name) => measurements[name].map(({ files }) => files);
    const off = sum(counts('twoLetters'));
    const on = sum(counts('twoCapped'));
    expect(on).toBeLessThan(off / 4);
    expect(p99(counts('twoCapped'))).toBeLessThan(p99(counts('twoLetters')) / 4);
    expect(p99(counts('twoCapped'))).toBeLessThanOrEqual(60);
    for (const { word, files } of measurements.twoCapped) expect(files, word).toBeLessThanOrEqual(50 + 2);
  });

  test('in the 2-letter mode the capped result is part of the uncapped one and keeps at least 97% of its hadis on average', () => {
    let kept = 0;
    measurements.twoLetters.forEach(({ word, found: all }, i) => {
      const capped = measurements.twoCapped[i].found;
      const allSet = new Set(all);
      expect(capped.every((tag) => allSet.has(tag)), word).toBe(true);
      kept += capped.length / all.length;
    });
    expect(kept / WORDS.length).toBeGreaterThanOrEqual(0.97);
  });

  test('capped, the 2-letter and the 3-letter modes return the same hadis in the same order (same first N of the same lists)', () => {
    measurements.twoCapped.forEach(({ word, found }, i) => {
      expect(measurements.threeCapped[i].found, word).toEqual(found);
    });
  });

  test('a rare word, one with fewer than 50 containing words, is not changed by the cap in the 2-letter mode either', async () => {
    const rare = ['ফিতরা', 'জাহান্নাম', 'কিয়ামত', 'রমজান', 'শয়তান', 'মসজিদ', ...rareWords()]
      .filter((word) => {
        const key = normalizeBengali(word);
        const lists = candidateShards(key, 2).flatMap((shard) => {
          const data = readFile(`/json/substring/${encodeURIComponent(shard)}.json`) ?? {};
          return Object.keys(data).filter((raw) => normalizeBengali(raw) === key).map((raw) => data[raw].length);
        });
        const n = Math.max(0, ...lists);
        return n >= 1 && n < 50;
      });
    expect(new Set(rare).size).toBeGreaterThanOrEqual(5);
    for (const word of new Set(rare)) {
      const off = mode({ tags: 2, substring: 2, cap: 0 });
      const on = mode({ tags: 2, substring: 2, cap: 50 });
      const a = await off.index.searchTags(normalizeQuery(word), off.options);
      const b = await on.index.searchTags(normalizeQuery(word), on.options);
      expect(b, word).toEqual(a);
      expect(sorted(on.fetched), word).toEqual(sorted(off.fetched));
    }
  });

  test('did you mean gives the same suggestions in the 2- and 3-letter substring modes, capped or not', async () => {
    for (const typed of ['সয়তান', 'মসজীদ', 'নামাজ', 'নামা', 'কিয়ামাত']) {
      const reference = mode({ tags: 3, substring: 2 });
      const expected = (await reference.index.suggest([typed], { ...reference.options, resultCount: 0 })).map((s) => s.query);
      for (const [substring, cap] of [[3, 0], [3, 50], [2, 50]]) {
        const m = mode({ tags: 3, substring, cap });
        const found = (await m.index.suggest([typed], { ...m.options, resultCount: 0 })).map((s) => s.query);
        expect(found, `${typed} sub ${substring} cap ${cap}`).toEqual(expected);
      }
    }
  });
});
