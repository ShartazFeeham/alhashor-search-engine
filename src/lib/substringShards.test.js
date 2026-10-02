import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileText } from '../../scripts/build-index-3.mjs';
import { compareCodePoints, regroupSubstring } from '../../scripts/build-substring-3.mjs';
import { isSafeShardName, shardName } from './indexShards';

// Reading the ~7,000 real data files takes a few seconds.
vi.setConfig({ testTimeout: 60000 });

const YA_NUKTA = '\u09AF\u09BC'; // য + ়
const YA_ONE = '\u09DF'; // য় as one character

// counts: word -> number of hadis
const counts = (object) => new Map(Object.entries(object));

describe('compareCodePoints', () => {
  test('orders by code point, not by UTF-16 unit', () => {
    expect(compareCodePoints('a', 'b')).toBeLessThan(0);
    expect(compareCodePoints('b', 'a')).toBeGreaterThan(0);
    expect(compareCodePoints('a', 'a')).toBe(0);
    expect(compareCodePoints('a', 'ab')).toBeLessThan(0);
    // U+FF5E (BMP, above the surrogates' range) sorts below U+1F600 by code point, above it by UTF-16 unit
    expect(compareCodePoints('～', '\u{1F600}')).toBeLessThan(0);
    expect('～' < '\u{1F600}').toBe(false);
  });
});

describe('regroupSubstring', () => {
  test('groups the keys by their first three code points and sorts each list by hadis count, largest first', () => {
    const files = regroupSubstring(
      [['নামা', ['নামাযের', 'নামাযী', 'নামাজ']], ['নামায', ['নামাযের']], ['নাস', ['নাসির']]],
      counts({ নামাযের: 5, নামাযী: 9, নামাজ: 5, নাসির: 1 }),
    );
    expect([...files.keys()].sort()).toEqual(['নাম', 'নাস']);
    // নামাযী has the most hadis; নামাজ and নামাযের tie, and জ comes before য
    expect(files.get('নাম')).toEqual({ নামা: ['নামাযী', 'নামাজ', 'নামাযের'], নামায: ['নামাযের'] });
    expect(files.get('নাস')).toEqual({ নাস: ['নাসির'] });
  });

  test('a tie is broken by the code point order of the word, so the output never depends on the input order', () => {
    const c = counts({ b: 2, a: 2, c: 2 });
    const one = regroupSubstring([['xyz', ['c', 'a', 'b']]], c).get('xyz');
    const two = regroupSubstring([['xyz', ['b', 'c', 'a']]], c).get('xyz');
    expect(one.xyz).toEqual(['a', 'b', 'c']);
    expect(two).toEqual(one);
  });

  test('a word with no hadis counts as zero and comes last', () => {
    expect(regroupSubstring([['xyz', ['nohadis', 'one']]], counts({ one: 1 })).get('xyz').xyz).toEqual(['one', 'nohadis']);
  });

  test('keys in one file come out sorted, lists without repeats', () => {
    const files = regroupSubstring([['abd', ['x', 'x', 'y']], ['abc', ['z']], ['abcd', ['y']]], counts({ x: 3, y: 2, z: 1 }));
    expect(Object.keys(files.get('abd'))).toEqual(['abd']);
    expect(Object.keys(files.get('abc'))).toEqual(['abc', 'abcd']);
    expect(files.get('abd').abd).toEqual(['x', 'y']);
  });

  test('a key that is in two files is merged into one list', () => {
    const files = regroupSubstring([['abc', ['x']], ['abc', ['y', 'x']]], counts({ x: 1, y: 2 }));
    expect(files.get('abc')).toEqual({ abc: ['y', 'x'] });
  });

  test('a key of fewer than three code points goes to its own file with an underscore, like the tags', () => {
    const files = regroupSubstring([['কে', ['কেউ']], ['ক', ['কেউ']]], counts({ কেউ: 1 }));
    expect([...files.keys()].sort()).toEqual(['কে_', 'ক_'].sort());
  });

  test('the two spellings of a letter stay in the files of their own spelling', () => {
    const files = regroupSubstring([[`হ${YA_NUKTA}`, ['a']], [`হ${YA_ONE}`, ['b']], [`হ${YA_ONE}ে`, ['c']]], counts({ a: 1, b: 1, c: 1 }));
    expect([...files.keys()].sort()).toEqual([`হ${YA_NUKTA}`, `হ${YA_ONE}_`, `হ${YA_ONE}ে`].sort());
  });

  test('refuses an unsafe file name', () => {
    expect(() => regroupSubstring([['ab/c', ['x']]], counts({}))).toThrow(/unsafe/);
  });

  test('refuses names that a case- or spelling-blind file system would mix up', () => {
    expect(() => regroupSubstring([['Abcd', ['x']], ['abcd', ['y']]], counts({}))).toThrow(/clash/);
  });

  test('a file is written one key per line and reads back as the same data', () => {
    const data = { abc: ['y', 'x'], abd: ['z'] };
    const text = fileText(data);
    expect(text.split('\n')).toHaveLength(2);
    expect(JSON.parse(text)).toEqual(data);
  });
});

describe('the real data: public/json/substring3 holds exactly what public/json/substring holds', () => {
  const base = path.resolve(process.cwd(), 'public/json');
  const readFolder = (folder) => readdirSync(path.join(base, folder)).filter((name) => name.endsWith('.json')).sort();
  const readJson = (folder, name) => JSON.parse(readFileSync(path.join(base, folder, name), 'utf8'));

  test('every (key, word) pair is in both, as sets, and each key is filed under its first three code points', () => {
    const two = new Map(); // key -> list
    for (const name of readFolder('substring')) {
      for (const [key, words] of Object.entries(readJson('substring', name))) {
        expect(two.has(key), `${key} is in two files`).toBe(false);
        two.set(key, words);
      }
    }
    expect(two.size).toBeGreaterThan(22000);

    const names = readFolder('substring3');
    expect(names.every((name) => isSafeShardName(name.slice(0, -5)))).toBe(true);
    let keys = 0;
    let pairsTwo = 0;
    let pairsThree = 0;
    for (const words of two.values()) pairsTwo += new Set(words).size;
    for (const name of names) {
      for (const [key, words] of Object.entries(readJson('substring3', name))) {
        keys++;
        pairsThree += words.length;
        expect(new Set(words).size, `${key} has a repeated word`).toBe(words.length);
        expect(new Set(words), `${key}`).toEqual(new Set(two.get(key)));
        expect(`${shardName(key, 3)}.json`.normalize('NFD')).toBe(name.normalize('NFD'));
      }
    }
    expect(keys).toBe(two.size);
    expect(pairsThree).toBe(pairsTwo);
  });

  test('every list is sorted by hadis count, largest first, ties by code point order of the word', () => {
    const count = new Map();
    for (const name of readFolder('tags')) {
      for (const [word, tags] of Object.entries(readJson('tags', name))) count.set(word, new Set(tags).size);
    }
    let lists = 0;
    for (const name of readFolder('substring3')) {
      const data = readJson('substring3', name);
      const keys = Object.keys(data);
      expect([...keys].sort(compareCodePoints), name).toEqual(keys);
      for (const [key, words] of Object.entries(data)) {
        lists++;
        for (let i = 1; i < words.length; i++) {
          const before = count.get(words[i - 1]) ?? 0;
          const after = count.get(words[i]) ?? 0;
          const ok = before > after || (before === after && compareCodePoints(words[i - 1], words[i]) < 0);
          if (!ok) throw new Error(`${name} ${key}: ${words[i - 1]} (${before}) before ${words[i]} (${after})`);
        }
      }
    }
    expect(lists).toBeGreaterThan(22000);
  });

  test('the first word of a big list is a common word: কে leads with the most frequent containing words', () => {
    const list = readJson('substring3', 'কে_.json')['কে'];
    expect(list.length).toBeGreaterThan(1000);
    const hadis = (word) => readJson('tags3', `${shardName(word, 3)}.json`)[word].length;
    expect(hadis(list[0])).toBeGreaterThanOrEqual(hadis(list[49]));
    expect(hadis(list[0])).toBeGreaterThan(1000);
  });

  test('the folder is what the script makes of substring and tags, with no stale file left over', () => {
    const entries = [];
    for (const name of readFolder('substring')) entries.push(...Object.entries(readJson('substring', name)));
    const count = new Map();
    for (const name of readFolder('tags')) {
      for (const [word, tags] of Object.entries(readJson('tags', name))) count.set(word, new Set(tags).size);
    }
    const made = regroupSubstring(entries, count);
    const names = readFolder('substring3');
    expect(names.map((name) => name.normalize('NFD')).sort()).toEqual([...made.keys()].map((name) => `${name}.json`.normalize('NFD')).sort());
    for (const [name, data] of made) {
      expect(readFileSync(path.join(base, 'substring3', `${name}.json`), 'utf8')).toBe(fileText(data));
    }
  });
});
