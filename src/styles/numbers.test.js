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
