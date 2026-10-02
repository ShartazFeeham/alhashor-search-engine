import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { createSearchIndex } from '../search/searchIndex';

// Shared by the golden tests of the search index (src/search/searchIndex*.golden.test.js): the real
// data files in public/json read through an injected loader, and the list of real queries.

const PUBLIC = path.resolve(process.cwd(), 'public');
const parsed = new Map(); // url -> parsed file, shared by both layouts so each file is parsed once
export function readFile(url) {
  if (!parsed.has(url)) {
    let data = null;
    try {
      data = JSON.parse(readFileSync(path.join(PUBLIC, decodeURIComponent(url)), 'utf8'));
    } catch {
      // a file that does not exist is a 404, as on the site
    }
    parsed.set(url, data);
  }
  return parsed.get(url);
}

// An index over the real files that records every address it fetches.
export function countingIndex() {
  const fetched = [];
  const load = async (url) => {
    fetched.push(url);
    const data = readFile(url);
    if (data === null) throw Object.assign(new Error(`404 ${url}`), { status: 404 });
    return data;
  };
  return { fetched, index: createSearchIndex(load) };
}

// five letters or more, all of them Bengali letters, signs or hasanta
const isBengaliWord = (word) => Array.from(word).length >= 5 && Array.from(word).every((c) => c >= '\u0985' && c <= '\u09CD');

// A deterministic handful of rare words (one hadis each) from the real data.
export function rareWords() {
  const rare = [];
  for (const name of readdirSync(path.join(PUBLIC, 'json/tags')).sort()) {
    const data = readFile(`/json/tags/${encodeURIComponent(name.slice(0, -5))}.json`)
      || readFile(`/json/tags/${name.slice(0, -5)}.json`);
    for (const [word, tags] of Object.entries(data)) {
      if (tags.length === 1 && isBengaliWord(word)) rare.push(word);
    }
  }
  rare.sort();
  return Array.from({ length: 8 }, (_, i) => rare[Math.floor((i * rare.length) / 8)]);
}

const O_LONG = 'রোজা'; // রোজা typed as র ে া জ া
export const QUERIES = [
  // single common words
  'রাসূলুল্লাহ', 'নামায', 'রোজা', 'যাকাত', 'হজ্জ', 'জান্নাত', 'ঈমান', 'কিয়ামত', 'আল্লাহ', 'সালাত', 'কবর', 'সাল',
  // several words
  'নামায রোজা', 'রাসূলুল্লাহ সালাত', 'আল্লাহ রাসূল ঈমান', 'যাকাত ফিতরা', 'জান্নাত জাহান্নাম কবর',
  // the letters that are written two ways: য় ড় ঢ় ো ৌ, typed in either spelling
  'হয়েছে', 'হয়েছে', 'ভয়', 'পড়া', 'পড়া', 'বড়', 'ঢোল', 'নৌকা', 'নৌকা', O_LONG, 'রোযা', 'সওয়াব', 'দুআ',
  // two letters or fewer, and one letter
  'কে', 'রা', 'তে', 'এই', 'না', 'ও', 'কো', 'হয়',
  // Latin, Arabic, a number, and words that have no file
  'lsquo', 'pim', 'الله', 'إنَّ', 'آب', '১২৩', 'qqqq', 'ঠঠঠঠ', 'নামায qqqq', 'ফফফ রোজা',
];

