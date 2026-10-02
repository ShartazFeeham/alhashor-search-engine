import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

// The site's old name must appear nowhere. The pattern is built from pieces so this file does not
// contain the name itself.
const OLD_NAME = new RegExp(
  [['boi', 'kotha'].join('[ _-]?'), ['বই', 'কথা'].join('[ -]?')].join('|'),
  'i',
);

const ROOT = join(__dirname, '..', '..');
const SKIP_DIRS = new Set(['node_modules', '.next', '.git', '.data', 'json']); // public/json is generated hadis data
const TEXT = /\.(js|jsx|mjs|cjs|css|json|md|html|svg|webmanifest|toml|yml|yaml|sh|txt|xml)$/i;

function* textFiles(path) {
  const stat = statSync(path);
  if (stat.isFile()) {
    if (TEXT.test(path)) yield path;
    return;
  }
  for (const name of readdirSync(path)) {
    if (SKIP_DIRS.has(name)) continue;
    yield* textFiles(join(path, name));
  }
}

test('the old site name is nowhere in src, public, docs, scripts, the root files or CI', () => {
  const offenders = [];
  for (const entry of ['src', 'public', 'docs', 'scripts', '.github', 'README.md', 'TODO.md', 'later-decide.md', 'package.json', 'package-lock.json', 'netlify.toml', 'next.config.mjs']) {
    const path = join(ROOT, entry);
    if (!existsSync(path)) continue;
    for (const file of textFiles(path)) {
      if (OLD_NAME.test(readFileSync(file, 'utf8')) || OLD_NAME.test(file)) offenders.push(file.slice(ROOT.length + 1));
    }
  }
  expect(offenders).toEqual([]);
});
