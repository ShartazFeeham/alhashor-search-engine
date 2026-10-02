// Packs every hadis text into a few hundred shard files for the server, so a server-rendered
// page can read its text from inside the application (no outside request, and not 33,000 loose
// files in the function bundle).
// Run: node scripts/build-text-shards.mjs   (npm runs it as `prebuild`; writes .data/hadis/)
// A shard is .data/hadis/<CODE>-<n>.json, n = floor((number - 1) / 100), holding
// { "<number>": "<text>" }. The output is the same on every run.
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BOOKS = { BUK: 'Bukhari', MUS: 'Muslim', TIR: 'Tirmiji', DAU: 'Daud', MAJ: 'Majah', NAS: 'Nasae' };
const SHARD_SIZE = 100; // keep in step with src/lib/seo.js (a test pins it)

export const shardName = (code, number) => `${code}-${Math.floor((number - 1) / SHARD_SIZE)}.json`;

// A text file holds one JSON string. Strict parse first; a raw control character (Nasa'i 435
// once had one) falls back to stripping control characters. Anything else is null.
export function parseText(raw) {
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

async function readBook(hadisDir, folder) {
  const dirs = (await readdir(path.join(hadisDir, folder))).filter((d) => /^\d{4}$/.test(d));
  const entries = [];
  let unreadable = 0;
  for (let start = 0; start < dirs.length; start += 256) {
    const batch = await Promise.all(
      dirs.slice(start, start + 256).map(async (dir) => {
        let raw;
        try {
          raw = await readFile(path.join(hadisDir, folder, dir, 'text.txt'), 'utf8');
        } catch {
          return null;
        }
        const text = parseText(raw);
        if (text === null) unreadable += 1;
        return text === null ? null : [Number(dir), text];
      }),
    );
    for (const entry of batch) if (entry) entries.push(entry);
  }
  entries.sort((a, b) => a[0] - b[0]);
  return { entries, files: dirs.length, unreadable };
}

// Writes the shards for the books named in `only` (all by default) into `outDir`.
export async function buildShards({ outDir = path.join(root, '.data/hadis'), hadisDir = path.join(root, 'public/json/hadis'), only } = {}) {
  const codes = Object.keys(BOOKS).filter((code) => !only || only.includes(code));
  await mkdir(outDir, { recursive: true });
  const books = {};
  let bytes = 0;
  let shards = 0;
  for (const code of codes) {
    const { entries, files, unreadable } = await readBook(hadisDir, BOOKS[code]);
    const byShard = new Map();
    for (const [number, text] of entries) {
      const name = shardName(code, number);
      if (!byShard.has(name)) byShard.set(name, {});
      byShard.get(name)[number] = text;
    }
    await Promise.all(
      [...byShard].map(([name, content]) => {
        const json = JSON.stringify(content);
        bytes += Buffer.byteLength(json);
        return writeFile(path.join(outDir, name), json);
      }),
    );
    shards += byShard.size;
    books[code] = { files, unreadable, shards: byShard.size };
  }
  return { books, shards, bytes };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const started = Date.now();
  const outDir = path.join(root, '.data/hadis');
  await rm(outDir, { recursive: true, force: true }); // no stale shard from an older run
  const { books, shards, bytes } = await buildShards({ outDir });
  console.log(books);
  console.log(`text shards: ${shards} files, ${(bytes / 1048576).toFixed(1)} MB, ${Date.now() - started} ms`);
}
