// One-time script: lists every hadis of 60 words or fewer, per book code, for the daily hadis.
// Run: node scripts/build-short-hadis.mjs   (writes public/json/short-hadis.json)
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const hadisDir = path.join(root, 'public/json/hadis');
const BOOKS = { BUK: 'Bukhari', MUS: 'Muslim', TIR: 'Tirmiji', DAU: 'Daud', MAJ: 'Majah', NAS: 'Nasae' };
const MAX_WORDS = 60;

// Strict parse first; texts with a raw control character (Nasa'i 435) fall back to stripping them.
function parseText(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    // eslint-disable-next-line no-control-regex
    const cleaned = raw.replace(/[\u0000-\u001f]/g, ' ');
    try {
      return JSON.parse(cleaned);
    } catch {
      return null;
    }
  }
}

// "১২। " and Ibn Majah's "১/১। " style prefixes.
const PREFIX = /^\s*[0-9০-৯]+(?:\/[0-9০-৯]+)?\s*[।.]\s*/;

export function wordCount(text) {
  const body = text.replace(PREFIX, '').trim();
  return body === '' ? 0 : body.split(/\s+/).length;
}

const result = {};
const stats = {};
let total = 0;
for (const [code, folder] of Object.entries(BOOKS)) {
  const numbers = [];
  const dirs = (await readdir(path.join(hadisDir, folder))).filter((d) => /^\d{4}$/.test(d));
  let unreadable = 0;
  const found = await Promise.all(
    dirs.map(async (dir) => {
      let raw;
      try {
        raw = await readFile(path.join(hadisDir, folder, dir, 'text.txt'), 'utf8');
      } catch {
        return null;
      }
      const text = parseText(raw);
      if (typeof text !== 'string') {
        unreadable += 1;
        return null;
      }
      const words = wordCount(text);
      return words > 0 && words <= MAX_WORDS ? Number(dir) : null;
    }),
  );
  for (const n of found) if (n !== null) numbers.push(n);
  numbers.sort((a, b) => a - b);
  result[code] = numbers;
  stats[code] = { files: dirs.length, short: numbers.length, unreadable };
  total += numbers.length;
}

await writeFile(path.join(root, 'public/json/short-hadis.json'), JSON.stringify(result));
console.log(stats);
console.log('total short hadis:', total);
