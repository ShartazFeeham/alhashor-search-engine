// Reorders the lists of the 2-letter containing-word files public/json/substring/<2 letters>.json IN
// PLACE, so the search can take the first N words of a list in 2-letter mode too (`containingCap`,
// `?cap=`). The order is the one of substring3 (scripts/build-substring-3.mjs): the words sorted by
// their number of hadis, the most first (a word's hadis count is the number of different tags it has
// in public/json/tags), a tie broken by the code point order of the word.
// Run: node scripts/sort-substring-2.mjs        (no network; idempotent: a second run changes nothing)
//
// Only the order of the words inside each list changes: the keys keep their order, the lists keep their
// words (a repeated word, if a list has one, stays), and the file keeps its exact style (one key per
// line, compact lists, no trailing newline: `fileText` of build-index-3.mjs). Before anything is
// written, every file is checked to be exactly what that style makes of its own data; if one is not,
// the script stops and writes nothing.
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { fileText } from './build-index-3.mjs';
import { compareCodePoints } from './build-substring-3.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// word -> number of different tags, over all the files of public/json/tags
export async function hadisCounts(tagsDir) {
  const tagsOf = new Map();
  for (const name of (await readdir(tagsDir)).filter((n) => n.endsWith('.json')).sort()) {
    for (const [word, list] of Object.entries(JSON.parse(await readFile(path.join(tagsDir, name), 'utf8')))) {
      if (!tagsOf.has(word)) tagsOf.set(word, new Set());
      for (const tag of list) tagsOf.get(word).add(tag);
    }
  }
  return new Map([...tagsOf].map(([word, set]) => [word, set.size]));
}

// The same order as regroupSubstring in build-substring-3.mjs; a word with no count is 0.
export const byHadis = (counts) => (a, b) => (counts.get(b) ?? 0) - (counts.get(a) ?? 0) || compareCodePoints(a, b);

export async function sortSubstring2({
  substringDir = path.join(root, 'public/json/substring'),
  tagsDir = path.join(root, 'public/json/tags'),
} = {}) {
  const counts = await hadisCounts(tagsDir);
  const names = (await readdir(substringDir)).filter((n) => n.endsWith('.json')).sort();
  const compare = byHadis(counts);
  const plan = [];
  let bytes = 0;
  for (const name of names) {
    const file = path.join(substringDir, name);
    const text = await readFile(file, 'utf8');
    const data = JSON.parse(text);
    if (fileText(data) !== text) throw new Error(`${name} is not in the expected style; nothing was written`);
    const sorted = {};
    for (const [key, words] of Object.entries(data)) sorted[key] = [...words].sort(compare);
    const next = fileText(sorted);
    if (Buffer.byteLength(next) !== Buffer.byteLength(text)) throw new Error(`${name} would change size; nothing was written`);
    bytes += Buffer.byteLength(next);
    plan.push({ file, text, next });
  }
  let changed = 0;
  for (const { file, text, next } of plan) {
    if (next === text) continue;
    await writeFile(file, next);
    changed++;
  }
  return { files: names.length, changed, bytes };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const started = Date.now();
  const { files, changed, bytes } = await sortSubstring2();
  console.log(`substring (2 letters): ${files} files, ${changed} rewritten, ${bytes} bytes, ${Date.now() - started} ms`);
}
