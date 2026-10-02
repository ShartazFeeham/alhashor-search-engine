// One-time script: the common words (stopwords) that the "similar hadis" search leaves out.
// Run: node scripts/build-stopwords.mjs [--threshold=N] [--report=<file>]
// For every word of public/json/tags (word -> hadis tags) it counts the distinct hadis, merging the
// spellings of one word (normalizeBengali). A word that is in MORE than the threshold of hadis is a
// stopword, and src/data/stopwords.json gets the list (most common first). With no --threshold the
// default below is used; the report (distribution of the counts and the first words) goes to
// --report or the console. Words of 1 or 2 letters and digits are not listed: the runtime
// (src/lib/similarWords.js) drops them by their shape.
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const tagsDir = path.join(root, 'public/json/tags');
const DEFAULT_THRESHOLD = 750;

const arg = (name) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=')[1];
const threshold = Number(arg('threshold') || DEFAULT_THRESHOLD);
const report = arg('report');
const normalize = (text) => text.normalize('NFC').replace(/[‌‍]/g, '');
// Letters with their vowel signs: "তিনি" is 4 characters, "এ" is 1.
const letters = (word) => (word.match(/[\p{L}\p{M}]/gu) || []).length;

const counts = new Map(); // normalized word -> Set of tags
for (const file of await readdir(tagsDir)) {
  if (!file.endsWith('.json')) continue;
  const data = JSON.parse(await readFile(path.join(tagsDir, file), 'utf8'));
  for (const [word, tags] of Object.entries(data)) {
    const key = normalize(word);
    if (!counts.has(key)) counts.set(key, new Set());
    const set = counts.get(key);
    for (const tag of tags) set.add(tag);
  }
}

const sizes = [...counts.entries()].map(([word, set]) => [word, set.size]).sort((a, b) => b[1] - a[1]);
const lines = [`distinct words (normalized): ${sizes.length}`];
for (const t of [500, 750, 1000, 1500, 2000, 3000, 4000, 5000, 8000, 10000]) {
  lines.push(`more than ${t} hadis: ${sizes.filter(([word, n]) => n > t && letters(word) > 2).length} words`);
}
const stop = sizes.filter(([word, n]) => n > threshold && letters(word) > 2 && !/[0-9০-৯]/.test(word));
lines.push(`threshold ${threshold}: ${stop.length} stopwords`);
lines.push(stop.map(([word, n]) => `${word}:${n}`).join(' '));
if (report) await writeFile(report, lines.join('\n') + '\n');
else console.log(lines.join('\n'));

await writeFile(path.join(root, 'src/data/stopwords.json'), JSON.stringify(stop.map(([word]) => word)) + '\n');
console.log(`wrote src/data/stopwords.json: ${stop.length} words, threshold ${threshold}`);
