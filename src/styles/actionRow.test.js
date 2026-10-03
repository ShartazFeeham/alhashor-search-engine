import { readFileSync } from 'node:fs';
import path from 'node:path';
import { contrastRatio } from '../lib/cardLayout';

const read = (name) => readFileSync(path.resolve(process.cwd(), 'src/styles', name), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const tokens = read('tokens.css');
const hadis = read('hadis.css');
const share = read('share.css');
const books = read('books.css');

// The declarations of the first rule whose selector list contains `selector`.
function rule(css, selector) {
  for (const [, list, body] of css.matchAll(/([^{}]+)\{([^}]*)\}/g)) {
    if (list.split(',').map((part) => part.trim()).includes(selector)) return body;
  }
  throw new Error(`no rule ${selector}`);
}
const values = (block) => Object.fromEntries([...block.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map(([, name, value]) => [name, value.trim()]));
const THEMES = {
  light: tokens.slice(0, tokens.indexOf(':root[data-theme="dark"]')),
  dark: tokens.slice(tokens.indexOf(':root[data-theme="dark"]'), tokens.indexOf(':root[data-theme="sepia"]')),
  sepia: tokens.slice(tokens.indexOf(':root[data-theme="sepia"]'), tokens.indexOf('@media (prefers-color-scheme: dark)')),
  'automatic dark': tokens.slice(tokens.indexOf('@media (prefers-color-scheme: dark)')),
};
const ICONS = ['copy', 'link', 'share', 'image'];

describe('the action row after a hadis', () => {
  test('every button has radius exactly 7px and a small padding', () => {
    const button = rule(hadis, '.act-btn');
    expect(button).toMatch(/border-radius:7px(?:;|$)/);
    expect(Number(/padding:\d+(?:px)? (\d+)px/.exec(button)[1])).toBeLessThanOrEqual(8);
    for (const [css, selector] of [[share, '.share-icon-btn'], [hadis, '.hadis-actions .ui-btn.primary']]) {
      expect(rule(css, selector)).toMatch(/border-radius:7px(?:;|$)/);
    }
  });

  test('the row is one line, right-aligned, and never scrolls sideways', () => {
    const row = rule(hadis, '.hadis-actions');
    expect(row).toMatch(/display:flex/);
    expect(row).toMatch(/flex-wrap:nowrap/);
    expect(row).toMatch(/justify-content:flex-end/);
    expect(row).not.toMatch(/overflow-x:\s*(auto|scroll)|overflow:\s*(auto|scroll)/);
    expect(row).toMatch(/container(?:-type)?:/);
  });

  test('the labels shorten and then drop out as the row narrows, so five buttons always fit', () => {
    expect(hadis).toMatch(/@container[^{]*max-width:\s*\d+px/);
    expect(rule(hadis, '.act-btn')).toMatch(/flex:0 1 auto/);
    expect(rule(hadis, '.act-btn')).toMatch(/min-width:0/);
  });

  test.each(ICONS)('the %s icon has its own colour class using its token', (name) => {
    expect(rule(hadis, `.act-${name} .ui-icon`)).toContain(`color:var(--act-${name})`);
  });

  test('the hadis card footer buttons use the same look', () => {
    expect(rule(books, '.hcard-foot')).toMatch(/justify-content:flex-end/);
  });
});

describe.each(Object.keys(THEMES))('icon colours in the %s theme', (theme) => {
  const block = values(THEMES[theme]);
  test.each(ICONS)('--act-%s is at least 3:1 on the card and on the quiet surface', (name) => {
    const colour = block[`--act-${name}`];
    expect(colour).toMatch(/^#[0-9a-f]{6}$/i);
    expect(contrastRatio(colour, block['--surface'])).toBeGreaterThanOrEqual(3);
    expect(contrastRatio(colour, block['--surface2'])).toBeGreaterThanOrEqual(3);
  });

  test('the four colours are all different', () => {
    expect(new Set(ICONS.map((name) => block[`--act-${name}`])).size).toBe(4);
  });
});
