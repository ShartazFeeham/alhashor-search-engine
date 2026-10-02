import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { realText } from '../src/test/hadisFixtures';
import { shardFile } from '../src/lib/seo';
import { buildShards, parseText, shardName } from './build-text-shards.mjs';

let out;
beforeEach(() => {
  out = mkdtempSync(path.join(tmpdir(), 'shards-'));
});
afterEach(() => {
  rmSync(out, { recursive: true, force: true });
});

test('the script and the server loader agree on the shard name', () => {
  for (const [code, number] of [['BUK', 1], ['BUK', 100], ['BUK', 101], ['MUS', 7281], ['NAS', 5758]]) {
    expect(shardName(code, number)).toBe(shardFile(code, number));
  }
});

test('parseText reads a JSON string and strips a raw control character when strict parsing fails', () => {
  expect(parseText('"সরল"')).toBe('সরল');
  expect(parseText('"নবী \u001cসাল্লাল্লাহু"')).toBe('নবী  সাল্লাল্লাহু');
  expect(parseText('not json')).toBeNull();
  expect(parseText('42')).toBeNull();
});

test('packs a book into shards of 100 holding the real texts, and is repeatable', async () => {
  const first = await buildShards({ outDir: out, only: ['MAJ'] });
  expect(first.books.MAJ).toEqual({ files: 4341, unreadable: 0, shards: 44 });
  const names = readdirSync(out).sort();
  expect(names).toHaveLength(44);
  expect(names[0]).toBe('MAJ-0.json');
  const shard = JSON.parse(readFileSync(path.join(out, 'MAJ-0.json'), 'utf8'));
  expect(Object.keys(shard)).toHaveLength(100);
  expect(shard['1']).toBe(realText('ibnmajah', 1));
  expect(shard['100']).toBe(realText('ibnmajah', 100));
  const last = JSON.parse(readFileSync(path.join(out, 'MAJ-43.json'), 'utf8'));
  expect(last['4341']).toBe(realText('ibnmajah', 4341));

  const bytes = readFileSync(path.join(out, 'MAJ-7.json'), 'utf8');
  await buildShards({ outDir: out, only: ['MAJ'] });
  expect(readFileSync(path.join(out, 'MAJ-7.json'), 'utf8')).toBe(bytes);
}, 60000);

test('a gap number is simply absent from its shard (Bukhari 63)', async () => {
  const result = await buildShards({ outDir: out, only: ['BUK'] });
  expect(result.books.BUK.files).toBe(6719);
  const shard = JSON.parse(readFileSync(path.join(out, 'BUK-0.json'), 'utf8'));
  expect('63' in shard).toBe(false);
  expect(Object.keys(shard)).toHaveLength(99);
}, 60000);
