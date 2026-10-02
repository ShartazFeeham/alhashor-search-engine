// Server-side loader for hadis texts (pages and route handlers only; never import it from a
// component that runs in the browser). Texts are read from inside the application: first from
// the packed shards in .data/hadis (made by scripts/build-text-shards.mjs on every build and
// included in the function bundle by next.config.mjs), and when those are absent (the dev
// server, tests) from the per-hadis files under public/json/hadis. No database, no outside call.
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { cache } from 'react';
import { bookById, hasHadis } from './books';
import { shardFile } from './seo';

const MAX_SHARDS = 64; // parsed shards kept in memory (a shard is 100 texts, roughly 150 KB)

// A text file holds one JSON string; a raw control character falls back to stripping them.
function parseText(raw) {
  for (const candidate of [raw, raw.replace(/[\u0000-\u001f]/g, ' ')]) { // eslint-disable-line no-control-regex
    try {
      const value = JSON.parse(candidate);
      return typeof value === 'string' ? value : null;
    } catch {
      // try the next form
    }
  }
  return null;
}

export function createHadisReader({ shardDir, publicDir, maxShards = MAX_SHARDS }) {
  const shards = new Map(); // shard file -> Promise of its parsed content, or null when unusable

  function loadShard(file) {
    if (shards.has(file)) {
      const hit = shards.get(file);
      shards.delete(file); // re-insert: the Map keeps the most recently used last
      shards.set(file, hit);
      return hit;
    }
    const loading = readFile(path.join(/* turbopackIgnore: true */ shardDir, file), 'utf8').then(
      (raw) => {
        try {
          const parsed = JSON.parse(raw);
          return parsed && typeof parsed === 'object' ? parsed : null;
        } catch {
          return null;
        }
      },
      () => null,
    );
    shards.set(file, loading);
    while (shards.size > maxShards) shards.delete(shards.keys().next().value);
    return loading;
  }

  async function readFromFile(book, number) {
    const file = path.join(/* turbopackIgnore: true */ publicDir, 'json/hadis', book.folder, String(number).padStart(4, '0'), 'text.txt');
    try {
      return parseText(await readFile(/* turbopackIgnore: true */ file, 'utf8'));
    } catch {
      return null;
    }
  }

  return {
    // The text of one hadis, or null when the book or number does not exist.
    async read(bookId, number) {
      const book = bookById(bookId);
      if (!book || !hasHadis(book, number)) return null;
      const shard = await loadShard(shardFile(book.code, number));
      if (shard) return typeof shard[number] === 'string' ? shard[number] : null;
      return readFromFile(book, number);
    },
    cached: () => shards.size,
  };
}

let reader;
function defaultReader() {
  if (!reader) {
    // These paths are made at run time. The `turbopackIgnore` comments stop the bundler from tracing
    // everything they could match (the shards reach the function through outputFileTracingIncludes,
    // and the 33,000 public files must not be pulled into the bundle).
    const cwd = /* turbopackIgnore: true */ process.cwd();
    reader = createHadisReader({
      shardDir: path.join(/* turbopackIgnore: true */ cwd, '.data/hadis'),
      publicDir: path.join(/* turbopackIgnore: true */ cwd, 'public'),
    });
  }
  return reader;
}

// One read is shared by generateMetadata and the page for the same request.
export const getHadisText = cache((bookId, number) => defaultReader().read(bookId, number));
