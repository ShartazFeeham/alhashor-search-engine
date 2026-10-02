import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { BOOKS, bookByCode, hasHadis } from './books';
import { parseRelated, shardKey } from './related';

// Checks the shards the one-time script wrote (public/json/related) against the real data.
const dir = path.resolve(process.cwd(), 'public/json/related');
// These read all 334 shard files; on a busy machine that can pass the default 5 seconds.
vi.setConfig({ testTimeout: 30000 });

const files = readdirSync(dir).filter((name) => name.endsWith('.json'));

test('the script wrote shards for every book', () => {
  for (const book of BOOKS) expect(files.some((name) => name.startsWith(`${book.code}-`))).toBe(true);
});

test('every shard is named <CODE>-<shard>, holds only its own 100 numbers, and has 1 to 3 readable entries each', () => {
  for (const name of files) {
    const [, code, shard] = /^([A-Z]{3})-(\d+)\.json$/.exec(name);
    const book = bookByCode(code);
    expect(book).toBeDefined();
    const data = JSON.parse(readFileSync(path.join(dir, name), 'utf8'));
    for (const [number, entries] of Object.entries(data)) {
      expect(shardKey(book, Number(number))).toBe(`${code}-${shard}`);
      expect(hasHadis(book, Number(number))).toBe(true);
      expect(entries.length).toBeGreaterThanOrEqual(1);
      expect(entries.length).toBeLessThanOrEqual(3);
      for (const entry of entries) {
        const item = parseRelated(entry);
        expect(item, `${name} ${number} ${JSON.stringify(entry)}`).not.toBeNull();
        expect(item.book === book.id && item.number === Number(number)).toBe(false);
        if (item.reason === 'sameReport') expect(item.book).not.toBe(book.id);
        else expect(item.words.length).toBeGreaterThanOrEqual(1);
      }
    }
  }
});

test('every related hadis exists as a data file', () => {
  for (const name of files) {
    const data = JSON.parse(readFileSync(path.join(dir, name), 'utf8'));
    for (const entries of Object.values(data)) {
      for (const entry of entries) {
        const { folder } = bookByCode(entry[0]);
        const file = path.resolve(process.cwd(), 'public/json/hadis', folder, String(entry[1]).padStart(4, '0'), 'text.txt');
        expect(existsSync(file), file).toBe(true);
      }
    }
  }
});

test('the whole folder stays small (under 6 MB), since every visit may fetch one shard', () => {
  const bytes = files.reduce((sum, name) => sum + readFileSync(path.join(dir, name)).length, 0);
  expect(bytes).toBeLessThan(6 * 1024 * 1024);
});
