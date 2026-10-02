import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { realText } from '../test/hadisFixtures';
import { createHadisReader, getHadisText } from './hadisServer';

let dir;
beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), 'shards-'));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

test('reads a real text from the public files when there are no shards (dev server, tests)', async () => {
  expect(await getHadisText('bukhari', 6628)).toBe(realText('bukhari', 6628));
  expect(await getHadisText('muslim', 5)).toBe(realText('muslim', 5));
});

test('a number with no file is null (Bukhari 63) and so are numbers out of range and unknown books', async () => {
  expect(await getHadisText('bukhari', 63)).toBeNull();
  expect(await getHadisText('bukhari', 0)).toBeNull();
  expect(await getHadisText('bukhari', 99999)).toBeNull();
  expect(await getHadisText('nobook', 1)).toBeNull();
});

test('reads from a shard when there is one, and keeps the parsed shard for the next read', async () => {
  writeFileSync(path.join(dir, 'BUK-66.json'), JSON.stringify({ 6628: 'শার্ড থেকে', 6650: 'আরেকটি' }));
  const reader = createHadisReader({ shardDir: dir, publicDir: path.join(dir, 'none') });
  expect(await reader.read('bukhari', 6628)).toBe('শার্ড থেকে');
  rmSync(path.join(dir, 'BUK-66.json'));
  expect(await reader.read('bukhari', 6650)).toBe('আরেকটি');
});

test('a shard that does not hold the number gives null, not the public file', async () => {
  writeFileSync(path.join(dir, 'BUK-0.json'), JSON.stringify({ 1: 'এক' }));
  const reader = createHadisReader({ shardDir: dir, publicDir: path.join(process.cwd(), 'public') });
  expect(await reader.read('bukhari', 63)).toBeNull();
  expect(await reader.read('bukhari', 1)).toBe('এক');
});

test('a missing shard falls back to the per-hadis file', async () => {
  mkdirSync(path.join(dir, 'public/json/hadis/Muslim/0009'), { recursive: true });
  writeFileSync(path.join(dir, 'public/json/hadis/Muslim/0009/text.txt'), JSON.stringify('৯। ফাইল থেকে'));
  const reader = createHadisReader({ shardDir: path.join(dir, 'no-shards'), publicDir: path.join(dir, 'public') });
  expect(await reader.read('muslim', 9)).toBe('৯। ফাইল থেকে');
  expect(await reader.read('muslim', 10)).toBeNull();
});

test('a broken shard falls back to the per-hadis file', async () => {
  writeFileSync(path.join(dir, 'MUS-0.json'), '{ not json');
  const reader = createHadisReader({ shardDir: dir, publicDir: path.join(process.cwd(), 'public') });
  expect(await reader.read('muslim', 5)).toBe(realText('muslim', 5));
});

test('only the most recent shards are kept in memory', async () => {
  for (let i = 0; i < 5; i++) writeFileSync(path.join(dir, `TIR-${i}.json`), JSON.stringify({ [i * 100 + 1]: `text ${i}` }));
  const reader = createHadisReader({ shardDir: dir, publicDir: path.join(dir, 'none'), maxShards: 2 });
  for (let i = 0; i < 5; i++) expect(await reader.read('tirmidhi', i * 100 + 1)).toBe(`text ${i}`);
  expect(reader.cached()).toBe(2);
});

test('a text with a raw control character (Nasa\'i 435) still reads', async () => {
  const text = await getHadisText('nasai', 435);
  expect(typeof text).toBe('string');
  expect(text).toContain('নবী');
  // eslint-disable-next-line no-control-regex
  expect(text).not.toMatch(/[\u0000-\u001f]/);
});
