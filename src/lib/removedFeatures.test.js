import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

// The khutbah sheet (খুতবার তালিকা) and the compare feature (তুলনা) were removed. No source file
// under src/ (tests excepted) may name them again, and their folders and files stay gone.
const SRC = join(__dirname, '..');

function* sourceFiles(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) yield* sourceFiles(path);
    else if (/\.(js|jsx|mjs|css|json)$/.test(name) && !/\.test\.(js|jsx)$/.test(name)) yield path;
  }
}

const REMOVED = /khutbah|খুতবার|তুলনা|\bcompare\b(?!\()|compare(List|Diff|Texts|Href|Bar|Toggle|Provider|Page|Column)|Compare(Bar|Toggle|Provider|Page|Column|Route)|cmp-|dock-extra/i;

test('no source file under src/ mentions the khutbah sheet or compare', () => {
  const offenders = [];
  for (const file of sourceFiles(SRC)) {
    readFileSync(file, 'utf8').split('\n').forEach((line, index) => {
      if (REMOVED.test(line)) offenders.push(`${file.slice(SRC.length + 1)}:${index + 1}`);
    });
  }
  expect(offenders).toEqual([]);
});

test.each([
  'compare',
  'app/compare',
  'styles/compare.css',
  'lib/compareList.js',
  'lib/compareDiff.js',
  'lib/khutbahList.js',
  'daily/KhutbahSection.jsx',
  'daily/KhutbahItem.jsx',
  'daily/AddToKhutbah.jsx',
  'daily/useKhutbahList.js',
])('src/%s does not exist', (name) => {
  expect(existsSync(join(SRC, name))).toBe(false);
});
