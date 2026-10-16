// Adds the Khazainul Irfan entries (tag KHZ-<n>) to the word index public/json/tags, then run
// scripts/build-index-3.mjs to regroup it into tags3. Safe to run again: old KHZ tags are dropped first.
// Run after scripts/build-khazainul.mjs: node scripts/add-khazainul-tags.mjs
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { shardName } from '../src/lib/indexShards.js';
import { words } from '../src/lib/khazainulWords.js';
import { fileText } from './build-index-3.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.join(root, 'public/json/tags');

const added = new Map(); // word -> [KHZ-n]
for (const { n, words: text } of JSON.parse(await readFile(path.join(root, 'public/json/khazainul-units.json'), 'utf8'))) {
  for (const word of new Set(words(text))) {
    if (!added.has(word)) added.set(word, []);
    added.get(word).push(`KHZ-${n}`);
  }
}

const byFile = new Map(); // file name (no .json) -> { word: [tags] } to add
for (const [word, tags] of added) {
  const name = shardName(word, 2);
  if (!byFile.has(name)) byFile.set(name, {});
  byFile.get(name)[word] = tags;
}

let touched = 0;
const names = new Set([...(await readdir(dir)).filter((f) => f.endsWith('.json')).map((f) => f.slice(0, -5)), ...byFile.keys()]);
for (const name of names) {
  const file = path.join(dir, `${name}.json`);
  let data = {};
  try { data = JSON.parse(await readFile(file, 'utf8')); } catch { /* new file */ }
  let changed = false;
  for (const [word, tags] of Object.entries(data)) {
    const kept = tags.filter((t) => !t.startsWith('KHZ-'));
    if (kept.length !== tags.length) { changed = true; if (kept.length) data[word] = kept; else delete data[word]; }
  }
  for (const [word, tags] of Object.entries(byFile.get(name) ?? {})) { data[word] = [...(data[word] ?? []), ...tags]; changed = true; }
  if (changed) { await writeFile(file, fileText(Object.fromEntries(Object.entries(data).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))))); touched += 1; }
}
console.log(`${added.size} words, ${touched} tag files updated`);
