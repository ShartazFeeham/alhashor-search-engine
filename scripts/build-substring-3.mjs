// Regroups the containing-words index public/json/substring/<first two characters>.json into
// public/json/substring3/<first three characters of the KEY>.json, the 3-letter sharding the search
// can switch to (src/search/searchConfig.js, `?sub=3`). public/json/substring and public/json/tags
// are only read, never changed.
// Run: node scripts/build-substring-3.mjs        (no network; the output is the same on every run)
//
// substring/<..>.json is { key: [every vocabulary word that contains the key] }. Every key of every
// file is merged (a key in two files would get one list), grouped by the first three code points of
// the key AS THE DATA SPELLS IT (a key shorter than three code points goes to its own file: the
// whole key and an underscore; src/lib/indexShards.js names the files here and in the search, with
// the same rules as scripts/build-index-3.mjs for tags3), and written as { key: [words] }, the keys
// in sorted order, one per line.
//
// The one thing that changes is the ORDER of each list: the words are sorted by their number of
// hadis, the most first (a word's hadis count is the number of different tags it has in
// public/json/tags), a tie broken by the code point order of the word. The search can then take the
// first N words of a list to cap how many data files one query word opens (`containingCap`, `?cap=`).
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { isSafeShardName, shardName } from '../src/lib/indexShards.js';
import { fileText } from './build-index-3.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PREFIX = 3;

// -1, 0 or 1 by code point (not by UTF-16 unit, which orders characters above U+FFFF wrongly).
export function compareCodePoints(a, b) {
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    const x = a.codePointAt(i);
    const y = b.codePointAt(j);
    if (x !== y) return x < y ? -1 : 1;
    i += x > 0xffff ? 2 : 1;
    j += y > 0xffff ? 2 : 1;
  }
  return (a.length - i > 0 ? 1 : 0) - (b.length - j > 0 ? 1 : 0);
}

// entries: [key, words] pairs, in any order. counts: Map(word -> number of hadis); a word it does
// not know counts as 0. Returns Map(file name -> { key: [words, most hadis first] } with sorted
// keys). Throws on an unsafe or clashing file name.
export function regroupSubstring(entries, counts, n = PREFIX) {
  const merged = new Map(); // key -> Set of words
  for (const [key, words] of entries) {
    if (!merged.has(key)) merged.set(key, new Set());
    for (const word of words) merged.get(key).add(word);
  }

  const files = new Map();
  for (const key of [...merged.keys()].sort(compareCodePoints)) {
    const name = shardName(key, n);
    if (!isSafeShardName(name)) throw new Error(`unsafe file name ${JSON.stringify(name)} for the key ${JSON.stringify(key)}`);
    if (!files.has(name)) files.set(name, {});
    files.get(name)[key] = [...merged.get(key)].sort((a, b) => (counts.get(b) ?? 0) - (counts.get(a) ?? 0) || compareCodePoints(a, b));
  }

  const alike = new Map(); // how a case- and spelling-blind file system sees the name -> the name
  for (const name of [...files.keys()].sort(compareCodePoints)) {
    const key = name.normalize('NFD').toLowerCase();
    if (alike.has(key)) throw new Error(`file names ${JSON.stringify(alike.get(key))} and ${JSON.stringify(name)} clash on some file systems`);
    alike.set(key, name);
  }
  return files;
}

async function readFolder(dir) {
  const names = (await readdir(dir)).filter((name) => name.endsWith('.json')).sort();
  const entries = [];
  for (const name of names) {
    entries.push(...Object.entries(JSON.parse(await readFile(path.join(dir, name), 'utf8'))));
  }
  return { files: names.length, entries };
}

export async function buildSubstring3({
  substringDir = path.join(root, 'public/json/substring'),
  tagsDir = path.join(root, 'public/json/tags'),
  outDir = path.join(root, 'public/json/substring3'),
} = {}) {
  const { files: sourceFiles, entries } = await readFolder(substringDir);
  const tags = await readFolder(tagsDir);
  const tagsOf = new Map(); // word -> its different tags (a word in two tag files gets both)
  for (const [word, list] of tags.entries) {
    if (!tagsOf.has(word)) tagsOf.set(word, new Set());
    for (const tag of list) tagsOf.get(word).add(tag);
  }
  const counts = new Map([...tagsOf].map(([word, set]) => [word, set.size]));
  const files = regroupSubstring(entries, counts);
  await rm(outDir, { recursive: true, force: true }); // no stale file from an older run
  await mkdir(outDir, { recursive: true });
  let bytes = 0;
  let largest = { name: '', bytes: 0 };
  for (const [name, data] of files) {
    const text = fileText(data);
    const size = Buffer.byteLength(text);
    bytes += size;
    if (size > largest.bytes) largest = { name, bytes: size };
    await writeFile(path.join(outDir, `${name}.json`), text);
  }
  return { sourceFiles, keys: entries.length, files: files.size, bytes, largest };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const started = Date.now();
  const { sourceFiles, keys, files, bytes, largest } = await buildSubstring3();
  console.log(`substring3: ${sourceFiles} substring files, ${keys} keys -> ${files} files, ${(bytes / 1048576).toFixed(1)} MB, `
    + `largest ${largest.name} ${(largest.bytes / 1024).toFixed(0)} KB, ${Date.now() - started} ms`);
}
