import { readFileSync } from 'node:fs';
import path from 'node:path';
import { vi } from 'vitest';

// A stand-in for fetch that answers /json/... from the real data files in public/json, so a
// test shows real hadis texts and real search indexes. A file that does not exist is a 404,
// as on the site. Pass `fake` to answer some addresses yourself first (return undefined to
// fall through to the real files).
export function serveRealData(fake = () => undefined) {
  global.fetch = vi.fn((url) => {
    const made = fake(url);
    if (made !== undefined) return made;
    try {
      const content = readFileSync(path.resolve(process.cwd(), 'public', decodeURIComponent(url).replace(/^\//, '')), 'utf8');
      return Promise.resolve({ ok: true, json: () => Promise.resolve(JSON.parse(content)) });
    } catch {
      return Promise.resolve({ ok: false, status: 404 });
    }
  });
}

// The text of a real hadis file, as the site shows it (the data stores it as a JSON string).
export function realHadisText(folder, number) {
  const file = path.resolve(process.cwd(), 'public/json/hadis', folder, String(number).padStart(4, '0'), 'text.txt');
  return JSON.parse(readFileSync(file, 'utf8'));
}
