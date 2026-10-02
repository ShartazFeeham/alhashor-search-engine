// One-time script: for every hadis, finds up to 3 related hadis and writes them as small shards.
// Run: node scripts/build-related.mjs   (writes public/json/related/<CODE>-<shard>.json)
//
// Method (deterministic, nothing random, explainable word by word):
//  1. Take the saying: the text without its number and without the narrator chain (the same
//     splitHadis the hadis page uses, loaded read-only from src/lib/hadisText.js).
//  2. Make a set of words: lower-case, no punctuation, no "(রাঃ)" style notes, no 1 or 2 letter
//     words. A word that appears in many hadis (over MAX_DF) carries no meaning, so it is dropped,
//     and so is a word that appears in only one hadis (it cannot be shared).
//  3. Each word gets a weight, idf = ln(hadis count / hadis that have the word): rarer is heavier.
//  4. An inverted index (word -> hadis) lists, for each hadis, the others that share a word, adding
//     up the weights of the shared words.
//  5. A pair's score is the weighted Jaccard: shared weight / (weight of A + weight of B - shared).
//     A pair needs at least MIN_SHARED shared words and MIN_SCORE.
//  6. The best 3 are kept. A hadis from another book gets a small bonus (CROSS_BOOK_BONUS), so
//     when scores are close the same report in another book wins. Two reports that are almost the
//     same text in different books are marked 's' (same report); the rest are 'w' with the 3
//     shared words that carry the most weight.
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const hadisDir = path.join(root, 'public/json/hadis');
const outDir = path.join(root, 'public/json/related');

const BOOKS = [
  { code: 'BUK', folder: 'Bukhari' },
  { code: 'MUS', folder: 'Muslim' },
  { code: 'TIR', folder: 'Tirmiji' },
  { code: 'DAU', folder: 'Daud' },
  { code: 'MAJ', folder: 'Majah' },
  { code: 'NAS', folder: 'Nasae' },
];

const MAX_DF = 600; // a word in more hadis than this is too common to mean anything
const MIN_WORD_LENGTH = 3; // in letters (code points)
const MIN_SHARED = 4; // shared informative words needed for any pair
const MIN_SCORE = 0.14;
const SAME_REPORT_SCORE = 0.4; // weighted Jaccard of a "same report" pair
const SAME_REPORT_SHARED = 6;
const CROSS_BOOK_BONUS = 1.15; // a hadis of another book counts 15% more when ranking
const PER_SHARD = 100;
const MAX_RELATED = 3;
const MAX_WORDS_SHOWN = 3;

const log = (...args) => console.log(new Date().toISOString().slice(11, 19), ...args);

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

const NOTE = /\([^)]*\)|\[[^\]]*\]|\{[^}]*\}/g; // "(রাঃ)", "(সাঃ)" and other bracketed notes
const SPLIT = /[^\p{L}\p{M}\p{N}]+/u;
const JOINERS = /[‌‍]/g;

function wordsOf(saying) {
  const clean = saying.normalize('NFC').replace(JOINERS, '').replace(NOTE, ' ');
  const words = new Set();
  for (const token of clean.split(SPLIT)) {
    if (token === '' || /^[\p{N}]+$/u.test(token)) continue;
    if (Array.from(token).length >= MIN_WORD_LENGTH) words.add(token.toLowerCase());
  }
  return words;
}

const splitHadis = await loadSplitHadis();

// ---- 1. read every text ----
log('reading texts');
const docs = []; // { code, number, words: Set }
for (const { code, folder } of BOOKS) {
  const dirs = (await readdir(path.join(hadisDir, folder))).filter((d) => /^\d{4}$/.test(d)).sort();
  let unreadable = 0;
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
        unreadable += 1;
        return;
      }
      docs.push({ code, number: Number(dirs[i + k]), words: wordsOf(splitHadis(text).body) });
    });
  }
  log(`${code}: ${dirs.length} files, ${unreadable} unreadable`);
}
const N = docs.length;
log(`${N} hadis read`);

// ---- 2. weights and the inverted index ----
const df = new Map();
for (const doc of docs) for (const w of doc.words) df.set(w, (df.get(w) || 0) + 1);
const idf = new Map();
for (const [w, count] of df) if (count >= 2 && count <= MAX_DF) idf.set(w, Math.log(N / count));
log(`${df.size} distinct words, ${idf.size} informative (2 to ${MAX_DF} hadis)`);

const postings = new Map(); // word -> Int32Array of doc indexes
const lists = new Map();
docs.forEach((doc, index) => {
  doc.terms = [...doc.words].filter((w) => idf.has(w)).sort();
  doc.weight = 0;
  for (const w of doc.terms) {
    doc.weight += idf.get(w);
    if (!lists.has(w)) lists.set(w, []);
    lists.get(w).push(index);
  }
  delete doc.words;
});
for (const [w, list] of lists) postings.set(w, Int32Array.from(list));
lists.clear();
log('index built');

// ---- 3. score the pairs ----
const shardsOut = new Map(); // "BUK-0" -> { "12": [...] }
const stats = Object.fromEntries(BOOKS.map(({ code }) => [code, { hadis: 0, withRelated: 0, sameReport: 0 }]));
const score = new Float64Array(N);
const shared = new Int32Array(N);
const touched = [];

docs.forEach((doc, a) => {
  stats[doc.code].hadis += 1;
  touched.length = 0;
  for (const w of doc.terms) {
    const weight = idf.get(w);
    for (const b of postings.get(w)) {
      if (b === a) continue;
      if (shared[b] === 0) touched.push(b);
      shared[b] += 1;
      score[b] += weight;
    }
  }

  const candidates = [];
  for (const b of touched) {
    const other = docs[b];
    const common = score[b];
    const count = shared[b];
    score[b] = 0;
    shared[b] = 0;
    if (count < MIN_SHARED || (other.code === doc.code && other.number === doc.number)) continue;
    const jaccard = common / (doc.weight + other.weight - common);
    if (jaccard < MIN_SCORE) continue;
    const cross = other.code !== doc.code;
    candidates.push({ b, jaccard, count, cross, rank: jaccard * (cross ? CROSS_BOOK_BONUS : 1) });
  }
  if (candidates.length === 0) return;

  // Highest rank first; ties fall back to book order and number, so the output never varies.
  candidates.sort((x, y) => y.rank - x.rank || x.b - y.b);
  const entries = candidates.slice(0, MAX_RELATED).map((c) => {
    const other = docs[c.b];
    if (c.cross && c.jaccard >= SAME_REPORT_SCORE && c.count >= SAME_REPORT_SHARED) {
      stats[doc.code].sameReport += 1;
      return [other.code, other.number, 's'];
    }
    const otherTerms = new Set(other.terms);
    // The heaviest shared words, preferring words of 5 characters or more (a short word is
    // often a fragment such as "জনের").
    const words = doc.terms
      .filter((w) => otherTerms.has(w))
      .sort((x, y) => (Array.from(y).length >= 5) - (Array.from(x).length >= 5) || idf.get(y) - idf.get(x) || (x < y ? -1 : 1))
      .slice(0, MAX_WORDS_SHOWN)
      .join(' ');
    return [other.code, other.number, 'w', words];
  });

  stats[doc.code].withRelated += 1;
  const key = `${doc.code}-${Math.floor((doc.number - 1) / PER_SHARD)}`;
  if (!shardsOut.has(key)) shardsOut.set(key, {});
  shardsOut.get(key)[doc.number] = entries;
  if (a % 4000 === 0) log(`scored ${a} / ${N}`);
});
log('scoring done');

// ---- 4. write the shards ----
await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });
let bytes = 0;
for (const [key, shard] of [...shardsOut].sort(([x], [y]) => (x < y ? -1 : 1))) {
  const sorted = Object.fromEntries(Object.entries(shard).sort(([x], [y]) => Number(x) - Number(y)));
  const json = JSON.stringify(sorted);
  bytes += Buffer.byteLength(json);
  await writeFile(path.join(outDir, `${key}.json`), json);
}

log(`${shardsOut.size} shard files, ${(bytes / 1024 / 1024).toFixed(2)} MB`);
console.table(stats);
log('done');
