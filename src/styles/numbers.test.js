import { readFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';

// Hind Siliguri (the interface font) draws Bengali figures that sit at different heights (the
// one is short, the two drops below the line), so a count like ১,৮১২ looks odd next to the
// serif text. One small font file holds only the ten Bengali digits (Noto Serif Bengali, even
// lining figures) and comes first in the body font stack, so every number uses it.
const root = process.cwd();
const css = (name) => readFileSync(path.resolve(root, 'src/styles', name), 'utf8');
const allCss = readdirSync(path.resolve(root, 'src/styles')).filter((f) => f.endsWith('.css')).map((f) => [f, css(f)]);

test('the digit font file is in the repository and is small', () => {
  const file = path.resolve(root, 'src/assets/fonts/BengaliDigits.woff2');
  expect(existsSync(file)).toBe(true);
  expect(readFileSync(file).length).toBeLessThan(20 * 1024);
});

test('the fonts module declares the digit font as --f-digits, preloaded, with display swap', async () => {
  vi.resetModules();
  vi.doMock('next/font/local', () => ({
    default: (options) => ({ variable: options.variable, className: 'c', options }),
  }));
  const { digitFont } = await import('../fonts.js');
  expect(digitFont.variable).toBe('--f-digits');
  expect(digitFont.options.src).toMatch(/BengaliDigits\.woff2$/);
  expect(digitFont.options.preload).not.toBe(false);
  expect(digitFont.options.display).toBe('swap');
  // an Arial stand-in face would catch commas and spaces before the interface font does
  expect(digitFont.options.adjustFontFallback).toBe(false);
});

test('the page root carries the digit font variable', () => {
  const layout = readFileSync(path.resolve(root, 'src/app/layout.jsx'), 'utf8');
  expect(layout).toMatch(/digitFont\.variable/);
});

test('the body font stack puts the digit font before the interface font', () => {
  const body = css('base.css').match(/\n\s*font-family:\s*([^;]+);/)[1];
  expect(body).toMatch(/^var\(--f-digits\),\s*var\(--f-ui\)/);
});

test('no rule asks for old-style or proportional figures or switches the figure feature on', () => {
  for (const [file, text] of allCss) {
    expect(text, file).not.toMatch(/oldstyle-nums|proportional-nums|slashed-zero/);
    expect(text, file).not.toMatch(/font-feature-settings[^;}]*["'](onum|pnum|tnum|lnum)["']/);
  }
});

test('number classes do not pick their own font family (the digits come from the body stack)', () => {
  const numberRules = /\.(topics-row-count|narr-books-n|topics-pager-now|books-pager-now|books-range|books-ranges|search-count-n|home-spine-count)\b[^{]*\{[^}]*\}/g;
  for (const [file, text] of allCss) {
    for (const rule of text.match(numberRules) || []) expect(rule, file).not.toMatch(/font-family|font:/);
  }
});

test('the digit font covers every weight in use (400, 600, 700) and only the ten digits', async () => {
  vi.resetModules();
  vi.doMock('next/font/local', () => ({
    default: (options) => ({ variable: options.variable, className: 'c', options }),
  }));
  const { digitFont } = await import('../fonts.js');
  // one variable file (wght axis 100 to 900): a range weight makes the browser draw the real 600 and
  // 700 outlines instead of thickening the regular face
  expect(digitFont.options.weight).toBe('100 900');
  const range = digitFont.options.declarations.find((d) => d.prop === 'unicode-range');
  expect(range.value).toBe('U+09E6-09EF');
});

test('form controls inherit the font family and no rule names the interface font without the digit font', () => {
  expect(css('base.css')).toMatch(/button, input, select, textarea \{[^}]*font-family: inherit/);
  for (const [file, text] of allCss) {
    for (const rule of text.match(/[^{}]*\{[^}]*font-(?:family:|:[^;}]*)[^}]*var\(--f-ui\)[^}]*\}/g) || []) {
      // an element that names the interface font itself must list the digits first
      expect(rule, file).toMatch(/var\(--f-digits\)\s*,\s*var\(--f-ui\)/);
    }
  }
});

test('the picture canvas builds its font lists with the digit font first and loads it before drawing', () => {
  const card = readFileSync(path.resolve(root, 'src/share/QuoteCard.jsx'), 'utf8');
  expect(card).toMatch(/--f-digits/);
  expect(card).toMatch(/ui: `\$\{digits\}, \$\{pick\('--f-ui'/);
  expect(card).toMatch(/\[500, 600, 700\]\.map\(\(weight\) => document\.fonts\.load\(`\$\{weight\} 40px \$\{fonts\.digits\}`/);
});
