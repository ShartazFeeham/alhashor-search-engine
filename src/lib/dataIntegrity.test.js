import { readdirSync } from 'node:fs';
import path from 'node:path';
import { realHadisText } from '../test/publicJson';

// The site reads each hadis with response.json(), which is strict: one raw control character in a
// data file makes that hadis show "could not load". The whole set was checked once with a script
// (32,886 files, one was broken: Nasa'i 435). This test keeps a representative set honest without
// parsing every file: the repaired file plus 200 files spread evenly across the books.
const root = path.resolve(process.cwd(), 'public/json/hadis');
const SAMPLE_SIZE = 200;

function evenlySampledFiles() {
  const all = [];
  for (const folder of readdirSync(root).sort()) {
    for (const dir of readdirSync(path.join(root, folder)).filter((d) => /^\d+$/.test(d)).sort()) {
      all.push([folder, Number(dir)]);
    }
  }
  const step = all.length / SAMPLE_SIZE;
  return Array.from({ length: SAMPLE_SIZE }, (_, i) => all[Math.floor(i * step)]);
}

test("Nasa'i 435 (once broken by a raw control character) is valid JSON and keeps its text", () => {
  const text = realHadisText('Nasae', 435);
  expect(typeof text).toBe('string');
  expect(text.length).toBeGreaterThan(300);
  // no control characters are left in the text itself
  // eslint-disable-next-line no-control-regex
  expect(text).not.toMatch(/[\u0000-\u001f]/);
  expect(text.normalize('NFC')).toContain('নবী সাল্লাল্লাহু আলাইহি ওয়াসাল্লাম এর নিকট'.normalize('NFC'));
});

test(`${SAMPLE_SIZE} files sampled evenly across all books strict-parse to a non-empty string`, () => {
  const sample = evenlySampledFiles();
  expect(sample).toHaveLength(SAMPLE_SIZE);
  expect(new Set(sample.map(([folder]) => folder)).size).toBe(6);
  for (const [folder, number] of sample) {
    const text = realHadisText(folder, number);
    expect(typeof text, `${folder} ${number}`).toBe('string');
    expect(text.trim().length, `${folder} ${number}`).toBeGreaterThan(0);
  }
});
