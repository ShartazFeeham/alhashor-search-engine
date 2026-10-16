// Writes Khazainul Irfan as a seventh hadis book (code KHZ): one numbered entry per ayah range,
// public/json/hadis/Khazainul/<NNNN>/text.txt (a JSON string, like the other books), numbered in reading
// order, plus public/json/khazainul-units.json (the words each entry is indexed by, for add-khazainul-tags).
// A unit comes from the per-range JSON files next to the pages; surah 1 has none, so its intro pages
// become one unit, range "intro".
// Run: node scripts/build-khazainul.mjs [sourceDir]   (default ~/Documents/personal/book-extraction/khazainul-irfan)
// Prints counts only.
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = process.argv[2] ?? path.join(os.homedir(), 'Documents/personal/book-extraction/khazainul-irfan');
const out = path.join(root, 'public/json/hadis/Khazainul');
const bn = (n) => String(n).replace(/\d/g, (d) => '০১২৩৪৫৬৭৮৯'[d]);
const first = (range) => parseInt(range, 10) || 0;

const surahs = new Map(); // number -> { n, bn, bnLatn, units: [] }
const add = (surah, unit) => {
  if (!surahs.has(surah.number)) surahs.set(surah.number, { n: surah.number, bn: surah.bn, bnLatn: surah.bnLatn, units: [] });
  surahs.get(surah.number).units.push(unit);
};

for (const unit of (await readdir(src)).filter((d) => /^para-\d{2}$/.test(d)).sort()) {
  for (const page of (await readdir(path.join(src, unit, 'pages'))).filter((d) => /^\d{4}$/.test(d)).sort()) {
    const dir = path.join(src, unit, 'pages', page);
    for (const file of (await readdir(dir)).filter((f) => f.endsWith('.json'))) {
      const j = JSON.parse(await readFile(path.join(dir, file), 'utf8'));
      add(j.surah, {
        id: `${j.surah.number}:${j.ayahRange}`,
        range: j.ayahRange,
        ref: j.ref.bn,
        summary: j.summary?.short?.bn ?? '',
        topics: (j.topics ?? []).map((t) => t.bn).filter(Boolean),
        keywords: (j.keywords ?? []).map((k) => k.bn).filter(Boolean),
        text: j.text,
      });
    }
  }
}

// Surah 1: the intro pages, as one unit.
const intro = path.join(src, 'fatiha/pages');
const parts = [];
for (const page of (await readdir(intro)).filter((d) => /^\d{4}$/.test(d)).sort()) parts.push((await readFile(path.join(intro, page, 'richtext.md'), 'utf8')).trim());
add({ number: 1, bn: 'ফাতিহা', bnLatn: 'Fatiha' }, { id: '1:intro', range: 'intro', ref: 'ভূমিকা (ফাতিহা)', summary: '', topics: [], keywords: [], text: parts.join('\n\n') });

await rm(out, { recursive: true, force: true });
const list = [...surahs.values()].sort((a, b) => a.n - b.n);
const index = []; // { n, ref, words: string } per entry
let n = 0;
for (const s of list) {
  s.units.sort((a, b) => first(a.range) - first(b.range));
  for (const u of s.units) {
    n += 1;
    const dir = path.join(out, String(n).padStart(4, '0'));
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, 'text.txt'), JSON.stringify(`${bn(n)}। ${u.ref}\n${u.text}`));
    index.push({ n, ref: u.ref, words: [u.text, u.ref, u.summary, ...u.topics, ...u.keywords].join(' ') });
  }
}
await writeFile(path.join(root, 'public/json/khazainul-units.json'), JSON.stringify(index));
console.log(`${list.length} surahs, ${n} entries -> ${path.relative(root, out)}`);
