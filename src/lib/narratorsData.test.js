import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { BOOKS, hasHadis } from './books';
import { splitHadis } from './hadisText';
import { hashId, listedNarrator, narratorOfChain } from './narratorName';
import { realHadisText } from '../test/publicJson';

// The files written by scripts/build-narrators.mjs, checked against themselves and against the real
// hadis texts. If this fails after the data or the name rules changed, run the script again.
// Every file is read: allow for a busy machine.
vi.setConfig({ testTimeout: 30000 });

const dir = path.resolve(process.cwd(), 'public/json/narrators');
const readJson = (file) => JSON.parse(readFileSync(path.join(dir, file), 'utf8'));
const index = readJson('index.json');
const filesOf = (id) => readJson(`${id}.json`);

describe('index.json', () => {
  test('lists hundreds of narrators, each as [id, name, count, six book counts]', () => {
    expect(index.length).toBeGreaterThan(200);
    for (const row of index) {
      expect(row).toHaveLength(3 + BOOKS.length);
      expect(typeof row[0]).toBe('string');
      expect(typeof row[1]).toBe('string');
      expect(row.slice(2).every((n) => Number.isInteger(n) && n >= 0)).toBe(true);
    }
  });

  test('only narrators with at least 5 hadis, most hadis first', () => {
    const counts = index.map((row) => row[2]);
    expect(Math.min(...counts)).toBeGreaterThanOrEqual(5);
    expect(counts).toEqual([...counts].sort((a, b) => b - a));
  });

  test('the six book counts add up to the count', () => {
    for (const [, , count, ...perBook] of index) expect(perBook.reduce((a, b) => a + b, 0)).toBe(count);
  });

  test('ids are unique and URL safe, names are plain', () => {
    const ids = index.map((row) => row[0]);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.every((id) => /^[a-z][a-z0-9-]*$/.test(id))).toBe(true);
    for (const [, name] of index) {
      expect(name).toBe(name.trim());
      expect(name).not.toMatch(/[()।,০-৯0-9]|রাঃ|রহঃ|রাদিয়াল্লাহু/);
      expect(name.split(' ').length).toBeLessThanOrEqual(6);
    }
  });

  test('Abu Hurayrah leads, with most hadis in the six books together', () => {
    expect(index[0][0]).toBe('abu-hurayrah');
    expect(index[0][2]).toBeGreaterThan(3000);
    expect(index[1][0]).toBe('aisha');
  });

  test('every narrator has a file, and there is no other file', () => {
    const files = readdirSync(dir).filter((file) => file !== 'index.json').sort();
    expect(files).toEqual(index.map((row) => `${row[0]}.json`).sort());
  });

  test('stays small: the index under 40 KB and all files together under 1 MB', () => {
    const size = (file) => readFileSync(path.join(dir, file)).length;
    expect(size('index.json')).toBeLessThan(40 * 1024);
    expect(readdirSync(dir).reduce((sum, file) => sum + size(file), 0)).toBeLessThan(1024 * 1024);
  });
});

describe('<id>.json', () => {
  test('holds as many [bookIndex, number] pairs as the count, per book too, in ascending order with no repeat', () => {
    for (const [id, , count, ...perBook] of index) {
      const pairs = filesOf(id);
      expect(pairs).toHaveLength(count);
      const own = BOOKS.map(() => 0);
      pairs.forEach(([bookIndex], i) => {
        own[bookIndex] += 1;
        if (i > 0) {
          const [lastBook, lastNumber] = pairs[i - 1];
          expect(bookIndex > lastBook || (bookIndex === lastBook && pairs[i][1] > lastNumber)).toBe(true);
        }
      });
      expect(own).toEqual(perBook);
    }
  });

  test('every pair is a hadis that exists', () => {
    for (const [id] of index) {
      for (const [bookIndex, number] of filesOf(id)) {
        expect(BOOKS[bookIndex]).toBeDefined();
        expect(hasHadis(BOOKS[bookIndex], number)).toBe(true);
      }
    }
  });

  test('a hadis is under one narrator only', () => {
    const seen = new Set();
    for (const [id] of index) {
      for (const [bookIndex, number] of filesOf(id)) {
        const tag = `${bookIndex}-${number}`;
        expect(seen.has(tag)).toBe(false);
        seen.add(tag);
      }
    }
  });

  test('the real chain of the first, middle and last hadis of every narrator names that narrator', () => {
    const folders = BOOKS.map((book) => book.folder);
    for (const [id, name] of index) {
      const pairs = filesOf(id);
      for (const at of new Set([0, Math.floor(pairs.length / 2), pairs.length - 1])) {
        const [bookIndex, number] = pairs[at];
        const found = narratorOfChain(splitHadis(realHadisText(folders[bookIndex], number)).chain);
        expect(found, `${name}: ${folders[bookIndex]} ${number}`).not.toBeNull();
        const owner = listedNarrator(found.key)?.id ?? hashId(found.key);
        expect(id === owner || id.startsWith(`${owner}-`), `${name}: ${folders[bookIndex]} ${number} is ${owner}`).toBe(true);
      }
    }
  });
});
