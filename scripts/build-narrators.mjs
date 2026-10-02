// One-time script: the narrator index (idea 11). Reads all hadis texts, takes the narrator the
// report comes from (the last name of the chain, before "থেকে বর্ণিত"), cleans and groups the
// spellings, and writes static files.
// Run: node scripts/build-narrators.mjs [--progress=<file>]
//   public/json/narrators/index.json  [[id, name, count, bukhari, muslim, tirmidhi, abudawud, ibnmajah, nasai], ...]
//                                     most hadis first, only narrators with MIN_COUNT hadis or more
//   public/json/narrators/<id>.json   that narrator's hadis as [[bookIndex, number], ...], ascending
//                                     (bookIndex is the position in BOOKS of src/lib/books.js)
//
// Method (deterministic, nothing random):
//  1. Take the chain with splitHadis (the same one the hadis page uses, loaded read-only from
//     src/lib/hadisText.js). A text with no recognised chain has no narrator here (the count of
//     those is printed: they are the limit of this index).
//  2. lastNarratorRaw / cleanName / foldKey (src/lib/narratorName.js) give the name and a key in
//     which the spellings of one person are equal. A chain with several narrators in the last
//     place, or a last name that is not plausibly a person, is dropped (counted below).
//  3. A key that is in the table src/data/narratorVariants.js takes that entry's id and name; any
//     other key is a group of its own, shown in the spelling the books use most, with an id made
//     from a hash of the key (the same on every run).
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { appendFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const hadisDir = path.join(root, 'public/json/hadis');
const outDir = path.join(root, 'public/json/narrators');

// The order of src/lib/books.js: a book's position here is the bookIndex in the files.
const BOOKS = [
  { id: 'bukhari', folder: 'Bukhari' },
  { id: 'muslim', folder: 'Muslim' },
  { id: 'tirmidhi', folder: 'Tirmiji' },
  { id: 'abudawud', folder: 'Daud' },
  { id: 'ibnmajah', folder: 'Majah' },
  { id: 'nasai', folder: 'Nasae' },
];
const MIN_COUNT = 5;

const progressFile = process.argv.find((arg) => arg.startsWith('--progress='))?.slice('--progress='.length);
if (progressFile) writeFileSync(progressFile, '');
const log = (...args) => {
  const line = `${new Date().toISOString().slice(11, 19)} ${args.join(' ')}`;
  console.log(line);
  if (progressFile) appendFileSync(progressFile, `${line}\n`);
};

// Loads splitHadis without editing or copying the source file: its one import (a digit helper
// the split does not use) is swapped for a stub, and the module is loaded from memory.
async function loadSplitHadis() {
  const source = (await readFile(path.join(root, 'src/lib/hadisText.js'), 'utf8')).replace(
    /import \{[^}]*\} from '\.\/digits';/,
    'const formatNumber = (n) => String(n);',
  );
  const module = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
  return module.splitHadis;
}

// Strict parse first; a text with a raw control character (Nasa'i 435) falls back to stripping them.
function parseText(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    try {
      // eslint-disable-next-line no-control-regex
      return JSON.parse(raw.replace(/[\u0000-\u001f]/g, ' '));
    } catch {
      return null;
    }
  }
}

const splitHadis = await loadSplitHadis();
const { narratorOfChain, lastNarratorRaw, listedNarrator, hashId } = await import(pathToFileURL(path.join(root, 'src/lib/narratorName.js')).href);

// ---- 1. read every text, group by narrator ----
log('reading texts');
const groups = new Map(); // group key -> { listed, key, names: Map(name -> n), tags: [[bookIndex, number]] }
const stats = { texts: 0, unreadable: 0, noChain: 0, dropped: 0, named: 0 };
const perBookStats = BOOKS.map((book) => ({ id: book.id, texts: 0, noChain: 0, dropped: 0, named: 0 }));
const droppedSample = new Map(); // raw text of a dropped last name -> n

for (const [bookIndex, { folder }] of BOOKS.entries()) {
  const dirs = (await readdir(path.join(hadisDir, folder))).filter((d) => /^\d{4}$/.test(d)).sort();
  for (let i = 0; i < dirs.length; i += 400) {
    const batch = await Promise.all(
      dirs.slice(i, i + 400).map(async (dir) => {
        try {
          return parseText(await readFile(path.join(hadisDir, folder, dir, 'text.txt'), 'utf8'));
        } catch {
          return null;
        }
      }),
    );
    batch.forEach((text, k) => {
      if (typeof text !== 'string') {
        stats.unreadable += 1;
        return;
      }
      const number = Number(dirs[i + k]);
      stats.texts += 1;
      perBookStats[bookIndex].texts += 1;
      const { chain } = splitHadis(text);
      if (!chain) {
        stats.noChain += 1;
        perBookStats[bookIndex].noChain += 1;
        return;
      }
      const found = narratorOfChain(chain);
      if (!found) {
        stats.dropped += 1;
        perBookStats[bookIndex].dropped += 1;
        const raw = lastNarratorRaw(chain);
        droppedSample.set(raw, (droppedSample.get(raw) ?? 0) + 1);
        return;
      }
      stats.named += 1;
      perBookStats[bookIndex].named += 1;
      const listed = listedNarrator(found.key);
      const groupKey = listed ? `L:${listed.id}` : found.key;
      let group = groups.get(groupKey);
      if (!group) {
        group = { listed, key: found.key, names: new Map(), tags: [] };
        groups.set(groupKey, group);
      }
      group.names.set(found.name, (group.names.get(found.name) ?? 0) + 1);
      group.tags.push([bookIndex, number]);
    });
    if ((i / 400) % 5 === 4) log(`${folder}: ${Math.min(i + 400, dirs.length)} of ${dirs.length}`);
  }
  log(`${folder} done`);
}

// ---- 2. name each group, keep those with enough hadis ----
// The name shown for an unlisted group: the spelling used most, then the shorter, then by code points.
function displayName(names) {
  return [...names].sort((a, b) => b[1] - a[1] || a[0].length - b[0].length || (a[0] < b[0] ? -1 : 1))[0][0];
}

const narrators = [];
const usedIds = new Set();
for (const group of groups.values()) {
  if (group.tags.length < MIN_COUNT) continue;
  let id = group.listed ? group.listed.id : hashId(group.key);
  for (let n = 2; usedIds.has(id); n += 1) id = `${group.listed ? group.listed.id : hashId(group.key)}-${n}`;
  usedIds.add(id);
  const perBook = BOOKS.map(() => 0);
  for (const [bookIndex] of group.tags) perBook[bookIndex] += 1;
  narrators.push({
    id,
    name: group.listed ? group.listed.name : displayName(group.names),
    count: group.tags.length,
    perBook,
    listed: Boolean(group.listed),
    spellings: group.names.size,
    tags: group.tags.sort((a, b) => a[0] - b[0] || a[1] - b[1]),
  });
}
narrators.sort((a, b) => b.count - a.count || (a.name < b.name ? -1 : 1));

// ---- 3. write ----
log('writing files');
await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });
const index = JSON.stringify(narrators.map((n) => [n.id, n.name, n.count, ...n.perBook]));
await writeFile(path.join(outDir, 'index.json'), index);
let bytes = Buffer.byteLength(index);
for (const n of narrators) {
  const body = JSON.stringify(n.tags);
  await writeFile(path.join(outDir, `${n.id}.json`), body);
  bytes += Buffer.byteLength(body);
}

// ---- 4. report ----
const covered = narrators.reduce((sum, n) => sum + n.count, 0);
log('---');
log(`texts read: ${stats.texts} (unreadable ${stats.unreadable})`);
log(`no chain recognised: ${stats.noChain} (${((stats.noChain / stats.texts) * 100).toFixed(1)}%)`);
log(`chain found but the last name was dropped (several narrators, a list, not a person): ${stats.dropped}`);
log(`hadis with a narrator: ${stats.named} in ${groups.size} groups; ${narrators.length} narrators with ${MIN_COUNT} hadis or more cover ${covered} hadis`);
log('per book (texts / no chain / dropped / named):');
for (const book of perBookStats) log(`  ${book.id}: ${book.texts} / ${book.noChain} / ${book.dropped} / ${book.named}`);
log(`files: index.json ${Buffer.byteLength(index)} bytes, ${narrators.length} narrator files, ${bytes} bytes in all (${(bytes / 1024 / 1024).toFixed(2)} MB)`);
const biggest = narrators[0];
log(`largest narrator file: ${biggest.id} ${Buffer.byteLength(JSON.stringify(biggest.tags))} bytes`);
log('top 40 narrators:');
narrators.slice(0, 40).forEach((n, i) => {
  const words = n.name.split(' ').length;
  const flag = [];
  if (!n.listed && words === 1) flag.push('first name only: may be more than one person');
  if (n.listed && n.name.split(' ').length === 1) flag.push('listed');
  log(`  ${String(i + 1).padStart(2)}. ${n.name} (${n.id}) ${n.count} [${n.perBook.join(' ')}] spellings ${n.spellings}${flag.length ? `  <- ${flag.join(', ')}` : ''}`);
});
log('most common dropped last names:');
for (const [raw, n] of [...droppedSample].sort((a, b) => b[1] - a[1]).slice(0, 10)) log(`  ${n}x ${raw}`);
log('done');
