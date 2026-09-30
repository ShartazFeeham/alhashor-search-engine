import { readFileSync } from 'node:fs';
import path from 'node:path';

const css = readFileSync(path.resolve(process.cwd(), 'src/styles/tokens.css'), 'utf8');

const required = [
  '--page', '--bg', '--surface', '--surface2', '--line', '--ink', '--ink2', '--ink3',
  '--accent', '--accent2', '--on-accent', '--accent-soft', '--hl', '--hl-ink',
  '--ok', '--warn', '--bad', '--link',
  '--bk-bukhari', '--bk-muslim', '--bk-tirmidhi', '--bk-abudawud', '--bk-ibnmajah', '--bk-nasai', '--on-bk',
  '--shadow', '--rs', '--rlh', '--rw',
];

test.each(required)('the light theme defines %s', (name) => {
  const light = css.slice(0, css.indexOf(':root[data-theme="dark"]'));
  expect(light).toMatch(new RegExp(`${name}\\s*:`));
});

test('dark and sepia redefine the colour variables', () => {
  for (const theme of ['dark', 'sepia']) {
    const block = css.slice(css.indexOf(`:root[data-theme="${theme}"]`));
    for (const name of ['--bg', '--surface', '--ink', '--accent']) {
      expect(block).toMatch(new RegExp(`${name}\\s*:`));
    }
  }
});

test('a visitor whose device prefers dark gets dark unless a theme is chosen', () => {
  expect(css).toContain('@media (prefers-color-scheme: dark)');
  expect(css).toContain(':root:not([data-theme])');
});

test('the six book colours match the design', () => {
  expect(css).toContain('--bk-bukhari:#0f8a66');
  expect(css).toContain('--bk-muslim:#3a63c8');
  expect(css).toContain('--bk-tirmidhi:#c08108');
  expect(css).toContain('--bk-abudawud:#8a4bb8');
  expect(css).toContain('--bk-ibnmajah:#d3582a');
  expect(css).toContain('--bk-nasai:#c3387f');
});
