import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

// The site was called BoiKotha before it was called Alhashor. The old name may live in source only
// as the name of a storage key that visitors saved data under (LEGACY_KEY), so that data is still read.
const SRC = join(__dirname, '..');

function* sourceFiles(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) yield* sourceFiles(path);
    else if (/\.(js|jsx|mjs|css|json)$/.test(name) && !/\.test\.(js|jsx)$/.test(name)) yield path;
  }
}

test('no source file under src/ still names the old brand, except the LEGACY_KEY storage constants', () => {
  const offenders = [];
  for (const file of sourceFiles(SRC)) {
    readFileSync(file, 'utf8').split('\n').forEach((line, index) => {
      if (/boikotha/i.test(line) && !/LEGACY_KEY/.test(line)) offenders.push(`${file.slice(SRC.length + 1)}:${index + 1}`);
    });
  }
  expect(offenders).toEqual([]);
});

test('the old storage keys are only ever the three LEGACY_KEY constants', () => {
  const legacy = [];
  for (const file of sourceFiles(SRC)) {
    readFileSync(file, 'utf8').split('\n').forEach((line) => {
      const match = /LEGACY_KEY\s*=\s*'(boikotha\.[a-z-]+)'/.exec(line);
      if (match) legacy.push(match[1]);
    });
  }
  expect(legacy.sort()).toEqual(['boikotha.compare', 'boikotha.plan-progress', 'boikotha.settings']);
});
