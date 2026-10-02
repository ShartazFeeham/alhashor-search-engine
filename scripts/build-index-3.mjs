// Regroups the word index public/json/tags/<first two characters>.json into
// public/json/tags3/<first three characters>.json, the 3-letter sharding the search can switch to
// (src/search/searchConfig.js, `?idx=3`). public/json/tags is only read, never changed.
// Run: node scripts/build-index-3.mjs        (no network; the output is the same on every run)
//
// Every word of every tags file is merged (a word in two files would get one list: the tags of
// both, each only once, in the order they were found), grouped by the first three code points of
// the word AS THE DATA SPELLS IT (a word shorter than three code points goes to its own file:
// the whole word and an underscore, see src/lib/indexShards.js, which names the files here and in
// the search), and written as { word: [tags] } with the words in sorted order, one per line like
// the files it comes from. A file name that is unsafe, or that a file system which ignores the
// difference between spellings of a letter (macOS, Windows) or letter case would read as another
// file's name, stops the build before anything is written.
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { isSafeShardName, shardName } from '../src/lib/indexShards.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PREFIX = 3;

// entries: [word, tags] pairs, in any order. Returns Map(file name -> { word: [tags] } with sorted
// keys). Throws on an unsafe or clashing file name.
export function regroup(entries, n = PREFIX) {
  const merged = new Map(); // word -> tags, deduplicated, in the order found
  for (const [word, tags] of entries) {
    const known = merged.get(word);
    if (!known) {
      merged.set(word, [...new Set(tags)]);
    } else {
      const have = new Set(known);
      for (const tag of tags) {
        if (!have.has(tag)) {
          have.add(tag);
          known.push(tag);
        }
      }
    }
  }

  const files = new Map();
  for (const word of [...merged.keys()].sort()) {
    const name = shardName(word, n);
    if (!isSafeShardName(name)) throw new Error(`unsafe file name ${JSON.stringify(name)} for the word ${JSON.stringify(word)}`);
    if (!files.has(name)) files.set(name, {});
    files.get(name)[word] = merged.get(word);
  }

  const alike = new Map(); // how a case- and spelling-blind file system sees the name -> the name
  for (const name of [...files.keys()].sort()) {
    const key = name.normalize('NFD').toLowerCase();
    if (alike.has(key)) throw new Error(`file names ${JSON.stringify(alike.get(key))} and ${JSON.stringify(name)} clash on some file systems`);
    alike.set(key, name);
  }
  return files;
}

// The file's text: one word per line, as in the files it comes from.
export function fileText(words) {
  return `{${Object.entries(words).map(([word, tags]) => `${JSON.stringify(word)}:${JSON.stringify(tags)}`).join(',\n')}}`;
}

async function readTags(tagsDir) {
  const names = (await readdir(tagsDir)).filter((name) => name.endsWith('.json')).sort();
  const entries = [];
  for (const name of names) {
    const data = JSON.parse(await readFile(path.join(tagsDir, name), 'utf8'));
    for (const [word, tags] of Object.entries(data)) entries.push([word, tags]);
  }
  return { files: names.length, entries };
}

export async function buildIndex3({ tagsDir = path.join(root, 'public/json/tags'), outDir = path.join(root, 'public/json/tags3') } = {}) {
  const { files: sourceFiles, entries } = await readTags(tagsDir);
  const files = regroup(entries);
  await rm(outDir, { recursive: true, force: true }); // no stale file from an older run
  await mkdir(outDir, { recursive: true });
  let bytes = 0;
  let largest = { name: '', bytes: 0 };
  for (const [name, words] of files) {
    const text = fileText(words);
    const size = Buffer.byteLength(text);
    bytes += size;
    if (size > largest.bytes) largest = { name, bytes: size };
    await writeFile(path.join(outDir, `${name}.json`), text);
  }
  return { sourceFiles, words: new Set(entries.map(([word]) => word)).size, files: files.size, bytes, largest };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const started = Date.now();
  const { sourceFiles, words, files, bytes, largest } = await buildIndex3();
  console.log(`tags3: ${sourceFiles} tag files, ${words} words -> ${files} files, ${(bytes / 1048576).toFixed(1)} MB, `
    + `largest ${largest.name} ${(largest.bytes / 1024).toFixed(0)} KB, ${Date.now() - started} ms`);
}
