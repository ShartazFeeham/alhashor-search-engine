import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileText, regroup } from '../../scripts/build-index-3.mjs';
import { normalizeBengali } from '../Helpers/bengali';
import { candidateShards, isSafeShardName, shardName } from './indexShards';

// Reading the ~11,000 real data files takes a few seconds.
vi.setConfig({ testTimeout: 60000 });


// The spellings the data uses for the same letter, built from escapes so they stay visible:
//   য় = য + ়  (U+09AF U+09BC)  or  য়  (U+09DF)
//   ো = ো (U+09CB)  or  ে + া (U+09C7 U+09BE)
//   ৌ = ৌ (U+09CC)  or  ে + ৗ (U+09C7 U+09D7)
const YA = 'য';
const YA_NUKTA = 'য়';
const YA_ONE = 'য়';
const O = 'ো';
const O_LONG = 'ো';
const AU = 'ৌ';
const AU_LONG = 'ৌ';
const [HA, RA, KA, NA, JA, BA, CA, E_SIGN, AA_SIGN] = ['হ', 'র', 'ক', 'ন', 'জ', 'ব', 'ছ', 'ে', 'া'];

describe('shardName', () => {
  test('is the first n code points of the word, as spelled', () => {
    expect(shardName(`${RA}${O}${JA}${AA_SIGN}`, 3)).toBe(`${RA}${O}${JA}`);
    expect(shardName(`${RA}${O}${JA}${AA_SIGN}`, 2)).toBe(`${RA}${O}`);
    expect(shardName('lsquo', 3)).toBe('lsq');
    expect(shardName('ابتغاء', 3)).toBe('ابت');
  });

  test('counts code points, not UTF-16 units', () => {
    expect(shardName('a\u{1F600}bc', 3)).toBe('a\u{1F600}b');
  });

  test('spells a letter the way the word does: a decomposed য় uses up two of the three', () => {
    expect(shardName(`${HA}${YA_NUKTA}${E_SIGN}${CA}${E_SIGN}`, 3)).toBe(`${HA}${YA_NUKTA}`);
    expect(shardName(`${HA}${YA_ONE}${E_SIGN}${CA}${E_SIGN}`, 3)).toBe(`${HA}${YA_ONE}${E_SIGN}`);
  });

  test('a word shorter than n code points gets its own file: the whole word and an underscore', () => {
    // the plain name would clash with the first three code points of other words on a file system
    // that treats the two spellings of য় and ো as one name (macOS, Windows): the word হয় (2 code
    // points) and the start of হয়েছে (হ য ়) are the same name there
    const short = `${HA}${YA_ONE}`;
    const longStart = shardName(`${HA}${YA_NUKTA}${E_SIGN}${CA}${E_SIGN}`, 3);
    expect(shardName(short, 3)).toBe(`${short}_`);
    expect(short.normalize('NFD')).toBe(longStart.normalize('NFD')); // the clash this avoids
    expect(shardName(short, 3).normalize('NFD')).not.toBe(longStart.normalize('NFD'));
    expect(shardName(`${KA}${E_SIGN}`, 3)).toBe(`${KA}${E_SIGN}_`);
    expect(shardName(`${KA}${E_SIGN}`, 2)).toBe(`${KA}${E_SIGN}`);
    expect(shardName(KA, 2)).toBe(`${KA}_`);
  });
});

describe('isSafeShardName', () => {
  test('accepts the names of real shards', () => {
    for (const name of [`${RA}${O}${JA}`, `${KA}${E_SIGN}_`, 'lsq', '«أ', 'ÿ' + KA, '­­', `${HA}‌${KA}`]) {
      expect(isSafeShardName(name)).toBe(true);
    }
  });

  test('refuses path separators, dots, characters a web address would read differently, and nothing', () => {
    for (const name of ['', '.', '..', 'a/b', 'a\\b', 'a?b', 'a#b', 'a%b', 'a\u0000b', 'a\nb']) expect(isSafeShardName(name)).toBe(false);
  });
});

describe('candidateShards: every file a word could be filed in', () => {
  test('a word without a spelling variant in its start has one file', () => {
    expect(candidateShards(`${NA}${AA_SIGN}মায`, 3)).toEqual([`${NA}${AA_SIGN}ম`]);
    expect(candidateShards(`${NA}${AA_SIGN}মায`, 2)).toEqual([`${NA}${AA_SIGN}`]);
    expect(candidateShards('lsquo', 3)).toEqual(['lsq']);
  });

  test('য় at the start: both the two-character and the one-character spelling', () => {
    const word = `${HA}${YA_NUKTA}${E_SIGN}${CA}${E_SIGN}`; // হয়েছে, as the search writes it (NFC)
    expect(candidateShards(word, 3)).toEqual([`${HA}${YA_NUKTA}`, `${HA}${YA_ONE}${E_SIGN}`]);
    expect(candidateShards(word, 2)).toEqual([`${HA}${YA}`, `${HA}${YA_ONE}`]);
  });

  test('ো: one character, or ে + া, which takes two of the three code points', () => {
    const word = `${RA}${O}${JA}${AA_SIGN}`;
    expect(candidateShards(word, 3)).toEqual([`${RA}${O}${JA}`, `${RA}${O_LONG}`]);
    expect(candidateShards(word, 2)).toEqual([`${RA}${O}`, `${RA}${E_SIGN}`]);
  });

  test('ৌ: one character, or ে + ৗ', () => {
    expect(candidateShards(`${NA}${AU}${KA}${AA_SIGN}`, 3)).toEqual([`${NA}${AU}${KA}`, `${NA}${AU_LONG}`]);
  });

  test('two variants inside the first three code points multiply, without repeats', () => {
    // র ো য় া: ো two ways, then য় two ways; the long spelling of ো ends the three early
    expect(candidateShards(`${RA}${O}${YA_NUKTA}${AA_SIGN}`, 3)).toEqual([
      `${RA}${O}${YA}`,
      `${RA}${O}${YA_ONE}`,
      `${RA}${O_LONG}`,
    ]);
  });

  test('a variant after the first three code points does not add files', () => {
    expect(candidateShards(`${KA}${BA}${RA}${E_SIGN}`, 3)).toEqual([`${KA}${BA}${RA}`]);
    expect(candidateShards(`${KA}${BA}${RA}${YA_NUKTA}`, 3)).toEqual([`${KA}${BA}${RA}`]);
    expect(candidateShards(`${RA}${O}${JA}${AA_SIGN}`, 2)).toHaveLength(2);
  });

  test('a word shorter than n code points: its own file, plus the long spellings that reach n', () => {
    expect(candidateShards(`${KA}${E_SIGN}`, 3)).toEqual([`${KA}${E_SIGN}_`]);
    expect(candidateShards(`${KA}${O}`, 3)).toEqual([`${KA}${O}_`, `${KA}${O_LONG}`]);
    expect(candidateShards(`${KA}${O}`, 2)).toEqual([`${KA}${O}`, `${KA}${E_SIGN}`]);
    expect(candidateShards(`${HA}${YA_NUKTA}`, 3)).toEqual([`${HA}${YA_NUKTA}`, `${HA}${YA_ONE}_`]);
  });

  test('Arabic words typed with marks in another order, or with alef and madda as two characters', () => {
    // the data has إنَّ as إ ن ّ َ (shadda first); the search writes it in NFC order, fatha first
    const nfc = '\u0625\u0646\u064E\u0651';
    expect(nfc.normalize('NFC')).toBe(nfc);
    expect(candidateShards(nfc, 3)).toContain('\u0625\u0646\u0651');
    expect(candidateShards(nfc, 3)[0]).toBe('\u0625\u0646\u064E');
    // ط َ ا ٓ in the data is ط َ آ in NFC
    expect(candidateShards('\u0637\u064E\u0622', 3)).toContain('\u0637\u064E\u0627');
  });

  test('nothing for an empty word, and a word whose file name is unsafe gets no file', () => {
    expect(candidateShards('', 3)).toEqual([]);
    expect(candidateShards('a?b', 3)).toEqual([]);
    expect(candidateShards('a/b', 3)).toEqual([]);
    expect(candidateShards('..x', 3)).toEqual(['..x']); // dots inside a longer name are fine
  });
});

describe('the generator (scripts/build-index-3.mjs): regroup', () => {
  test('groups words by their first three code points and sorts the words of a file', () => {
    const files = regroup([['নামাজ', ['B-2']], ['নামায', ['B-1']], ['নামা', ['B-3']], ['রোজা', ['B-4']]]);
    expect(files.get('নাম')).toEqual({ নামা: ['B-3'], নামাজ: ['B-2'], নামায: ['B-1'] });
    expect(Object.keys(files.get('নাম'))).toEqual(['নামা', 'নামাজ', 'নামায']);
    expect(files.size).toBe(2);
  });

  test('a word in two files is one word: both tag lists, each tag once, in the order found', () => {
    const files = regroup([['নামায', ['B-3', 'B-1']], ['নামায', ['B-1', 'B-2', 'B-3', 'B-0']], ['নামায', ['B-9']]]);
    expect(files.get('নাম').নামায).toEqual(['B-3', 'B-1', 'B-2', 'B-0', 'B-9']);
  });

  test('a list repeating a tag keeps it once', () => {
    expect(regroup([['নামায', ['B-1', 'B-1', 'B-2']]]).get('নাম').নামায).toEqual(['B-1', 'B-2']);
  });

  test('a word under three code points goes to a file of its own name with an underscore', () => {
    const files = regroup([['কে', ['B-1']], ['কেউ', ['B-2']], ['ক', ['B-3']]]);
    expect([...files.keys()].sort()).toEqual(['কে_', 'কেউ', 'ক_'].sort());
  });

  test('the two spellings of a letter stay in the files of their own spelling', () => {
    const files = regroup([[`হ${YA_NUKTA}েছে`, ['B-1']], [`হ${YA_ONE}েছে`, ['B-2']], [`হ${YA_ONE}`, ['B-3']]]);
    expect([...files.keys()].sort()).toEqual([`হ${YA_NUKTA}`, `হ${YA_ONE}ে`, `হ${YA_ONE}_`].sort());
  });

  test('refuses a word whose file name is unsafe', () => {
    expect(() => regroup([['ab/c', ['B-1']]])).toThrow(/unsafe/);
    expect(() => regroup([['a?bc', ['B-1']]])).toThrow(/unsafe/);
  });

  test('refuses file names that a case- or spelling-blind file system would mix up', () => {
    expect(() => regroup([['Abcd', ['B-1']], ['abcd', ['B-2']]])).toThrow(/clash/);
    // the underscore keeps the word হয় (one character য়) and the start of হয়েছে (য + ়) apart: no clash
    expect(() => regroup([[`হ${YA_ONE}`, ['B-1']], [`হ${YA_NUKTA}েছে`, ['B-2']]])).not.toThrow();
    // two starts that differ only in the order of two combining marks are one name there too
    expect(() => regroup([['\u0644\u0651\u064Ex', ['B-1']], ['\u0644\u064E\u0651y', ['B-2']]])).toThrow(/clash/);
  });

  test('a file is one word per line and reads back as the same data', () => {
    const words = { নামা: ['B-3'], নামায: ['B-1', 'B-2'] };
    const text = fileText(words);
    expect(text.split('\n')).toHaveLength(2);
    expect(JSON.parse(text)).toEqual(words);
    expect(fileText({})).toBe('{}');
  });
});

describe('the real data: public/json/tags3 holds exactly what public/json/tags holds', () => {
  const base = path.resolve(process.cwd(), 'public/json');
  const readFolder = (folder) => readdirSync(path.join(base, folder)).filter((name) => name.endsWith('.json')).sort();
  const readJson = (folder, name) => JSON.parse(readFileSync(path.join(base, folder, name), 'utf8'));

  test('a deterministic sample of 300 words has the same tag list in both', () => {
    const words = [];
    for (const name of readFolder('tags')) words.push(...Object.keys(readJson('tags', name)));
    words.sort();
    expect(words.length).toBeGreaterThan(80000);
    const step = Math.floor(words.length / 300);
    const sample = Array.from({ length: 300 }, (_, i) => words[i * step]);
    expect(new Set(sample).size).toBe(300);
    // the short words and the words with spelling variants are always in the sample
    sample.push(...words.filter((word) => Array.from(word).length < 3).slice(0, 20));
    sample.push(...words.filter((word) => /\u09DF|\u09DC|\u09DD|\u09CB|\u09CC/.test(word.slice(0, 3))).slice(0, 20));

    for (const word of sample) {
      const two = readJson('tags', `${shardName(word, 2)}.json`)[word];
      const three = readJson('tags3', `${shardName(word, 3)}.json`)[word];
      expect(two, `tags: ${word}`).toBeDefined();
      expect(three, `tags3: ${word}`).toEqual(two);
    }
  });

  test('every word and every (word, tag) pair is in both, and the files are exactly what the generator writes', () => {
    const two = new Map(); // word -> tags
    for (const name of readFolder('tags')) {
      for (const [word, tags] of Object.entries(readJson('tags', name))) {
        expect(two.has(word)).toBe(false); // no word is in two files
        two.set(word, tags);
      }
    }
    const namesThree = readFolder('tags3');
    let wordsThree = 0;
    let pairsTwo = 0;
    let pairsThree = 0;
    for (const tags of two.values()) pairsTwo += tags.length;
    for (const name of namesThree) {
      for (const [word, tags] of Object.entries(readJson('tags3', name))) {
        wordsThree++;
        pairsThree += tags.length;
        expect(two.get(word), `${word} is in tags3 and tags`).toEqual(tags);
        expect(`${shardName(word, 3)}.json`.normalize('NFD')).toBe(name.normalize('NFD'));
      }
    }
    expect(wordsThree).toBe(two.size);
    expect(pairsThree).toBe(pairsTwo);
    expect(namesThree.every((name) => isSafeShardName(name.slice(0, -5)))).toBe(true);

    // the folder is what the script makes of tags, with no stale file left over
    const made = regroup(two.entries());
    expect(namesThree.map((name) => name.normalize('NFD')).sort()).toEqual([...made.keys()].map((name) => `${name}.json`.normalize('NFD')).sort());
    for (const [name, words] of made) {
      expect(readFileSync(path.join(base, 'tags3', `${name}.json`), 'utf8')).toBe(fileText(words));
    }
  });

  test('the lookup always names the file a word was filed in, except for words with a joiner in their start', () => {
    const missed = { 2: [], 3: [] };
    for (const [folder, n] of [['tags', 2], ['tags3', 3]]) {
      for (const name of readFolder(folder)) {
        for (const word of Object.keys(readJson(folder, name))) {
          if (!candidateShards(normalizeBengali(word), n).includes(name.slice(0, -5).normalize('NFC'))
            && !candidateShards(normalizeBengali(word), n).includes(name.slice(0, -5))) missed[n].push(word);
        }
      }
    }
    // the search drops invisible joiners (ZWNJ, ZWJ) from a word, so a word filed under a start with
    // one in it cannot be reached by its file: 15 of 80,587 words with 2 letters, 17 with 3
    for (const n of [2, 3]) {
      for (const word of missed[n]) expect(Array.from(word).slice(0, n).join(''), word).toMatch(/[\u200C\u200D]/);
    }
    expect(missed[3].length).toBeLessThanOrEqual(20);
  });
});
