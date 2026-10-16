// Rebuilds the containing-words index public/json/substring/<first two characters of the key>.json
// from the word index public/json/tags: a key is a tag word (2+ letters) that sits inside another tag
// word, and its list is every longer tag word that contains it. Needed after scripts/add-khazainul-tags.mjs
// added words. The lists come out unsorted: run scripts/sort-substring-2.mjs and scripts/build-substring-3.mjs next.
// Run: node scripts/build-substring-2.mjs [outDir]
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { shardName } from '../src/lib/indexShards.js';
import { fileText } from './build-index-3.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const tagsDir = path.join(root, 'public/json/tags');
const out = process.argv[2] ?? path.join(root, 'public/json/substring');

const vocab = new Set();
for (const f of (await readdir(tagsDir)).filter((n) => n.endsWith('.json'))) {
  for (const word of Object.keys(JSON.parse(await readFile(path.join(tagsDir, f), 'utf8')))) vocab.add(word);
}

const lists = new Map(); // key -> [words containing it]
for (const word of [...vocab].sort()) {
  const cs = Array.from(word);
  const keys = new Set();
  for (let i = 0; i < cs.length; i += 1) {
    for (let len = 2; i + len <= cs.length; len += 1) {
      if (len === cs.length) continue; // the word itself
      const key = cs.slice(i, i + len).join('');
      if (vocab.has(key) && key !== word) keys.add(key);
    }
  }
  for (const key of keys) {
    if (!lists.has(key)) lists.set(key, []);
    lists.get(key).push(word);
  }
}

const files = new Map();
for (const key of [...lists.keys()].sort()) {
  const name = shardName(key, 2);
  if (!files.has(name)) files.set(name, {});
  files.get(name)[key] = lists.get(key);
}
await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });
for (const [name, data] of files) await writeFile(path.join(out, `${name}.json`), fileText(data));
console.log(`substring: ${vocab.size} words -> ${lists.size} keys, ${files.size} files`);
