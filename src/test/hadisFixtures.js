import { readFileSync } from 'node:fs';
import path from 'node:path';
import { bookById } from '../lib/books';

const publicDir = path.resolve(process.cwd(), 'public');

// A stand-in for fetch() that serves the site's real files from public/ (the real hadis texts
// and the real short-hadis list); anything else is a 404.
export function diskFetch(url) {
  try {
    const raw = readFileSync(path.join(publicDir, url), 'utf8');
    return Promise.resolve({ ok: true, json: () => Promise.resolve(JSON.parse(raw)) });
  } catch {
    return Promise.resolve({ ok: false });
  }
}

// The real text of one hadis.
export function realText(bookId, number) {
  const file = `${bookById(bookId).folder}/${String(number).padStart(4, '0')}/text.txt`;
  return JSON.parse(readFileSync(path.join(publicDir, 'json/hadis', file), 'utf8'));
}

export const realShortList = () => JSON.parse(readFileSync(path.join(publicDir, 'json/short-hadis.json'), 'utf8'));
