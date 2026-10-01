import { readFileSync } from 'node:fs';
import { BOOKS } from './books';
import { CARD_COLOURS, CARD_SIZES, cardPalette, contrastRatio, fitText, mix, wrapWords } from './cardLayout';
import { cleanText } from './share';

const read = (folder, number) =>
  JSON.parse(readFileSync(`public/json/hadis/${folder}/${String(number).padStart(4, '0')}/text.txt`, 'utf8'));
const SHORT = cleanText(read('Bukhari', 6628));
const MEDIUM = cleanText(read('Muslim', 3));
const LONG = cleanText(read('Bukhari', 6));

// A fake text measure: every character is half a font size wide.
const measure = (text, size) => text.length * size * 0.5;

describe('wrapWords', () => {
  const at = (text, width) => wrapWords(text, width, (s) => s.length * 10);

  test('breaks only on spaces and keeps every word whole', () => {
    const lines = at('আমল নিয়তের উপর নির্ভরশীল', 120);
    expect(lines).toEqual(['আমল নিয়তের', 'উপর', 'নির্ভরশীল']);
    expect(lines.join(' ')).toBe('আমল নিয়তের উপর নির্ভরশীল');
  });

  test('fills a line up to the width, not over it', () => {
    const lines = at('aa bb cc dd', 80);
    expect(lines).toEqual(['aa bb cc', 'dd']);
    expect(lines.every((l) => l.length * 10 <= 80)).toBe(true);
  });

  test('a new line in the text starts a new line', () => {
    expect(at('এক দুই\nতিন', 1000)).toEqual(['এক দুই', 'তিন']);
  });

  test('a word wider than the line stands alone on its own line', () => {
    expect(at('ab cdefghijkl mn', 50)).toEqual(['ab', 'cdefghijkl', 'mn']);
  });

  test('empty text has no lines', () => {
    expect(at('   ', 100)).toEqual([]);
  });
});

describe('fitText', () => {
  const box = { maxWidth: 904, maxHeight: 600, measure, maxFont: 60, minFont: 34, lineHeight: 1.75 };

  test('a short text keeps the biggest font', () => {
    const fit = fitText({ ...box, text: 'সৎকাজ করো' });
    expect(fit.fontSize).toBe(60);
    expect(fit.excerpted).toBe(false);
    expect(fit.lines).toEqual(['সৎকাজ করো']);
  });

  test('a longer text uses a smaller font so that it fits the box', () => {
    const fit = fitText({ ...box, text: SHORT });
    expect(fit.fontSize).toBeLessThan(60);
    expect(fit.fontSize).toBeGreaterThanOrEqual(34);
    expect(fit.excerpted).toBe(false);
    expect(fit.lines.length * fit.fontSize * 1.75).toBeLessThanOrEqual(600);
    expect(fit.lines.every((line) => measure(line, fit.fontSize) <= 904)).toBe(true);
    expect(fit.lines.join(' ').replace(/\s+/g, ' ')).toBe(SHORT.replace(/\s+/g, ' '));
  });

  test('picks the largest font that fits (one step bigger would not)', () => {
    const fit = fitText({ ...box, text: MEDIUM });
    if (fit.fontSize < 60) {
      const bigger = fitText({ ...box, text: MEDIUM, maxFont: fit.fontSize + 2, minFont: fit.fontSize + 2 });
      expect(bigger.excerpted).toBe(true);
    }
    expect(fit.excerpted).toBe(false);
  });

  test('a very long text is cut at a word boundary with " ..." at the smallest font', () => {
    const fit = fitText({ ...box, text: LONG });
    expect(fit.excerpted).toBe(true);
    expect(fit.fontSize).toBe(34);
    expect(fit.text.endsWith(' ...')).toBe(true);
    const kept = fit.text.slice(0, -4);
    expect(LONG.startsWith(kept)).toBe(true);
    expect(/\s/.test(LONG[kept.length])).toBe(true);
    expect(fit.lines.length * 34 * 1.75).toBeLessThanOrEqual(600);
    expect(fit.lines.at(-1).endsWith('...')).toBe(true);
  });

  test('the excerpt is as long as the box allows', () => {
    const fit = fitText({ ...box, text: LONG });
    const kept = fit.text.slice(0, -4);
    const nextSpace = LONG.indexOf(' ', kept.length + 1);
    const longer = `${LONG.slice(0, nextSpace)}\u00a0...`;
    const lines = wrapWords(longer, 904, (s) => measure(s, 34));
    expect(lines.length * 34 * 1.75 > 600 || lines.some((l) => measure(l, 34) > 904)).toBe(true);
  });

  test('a single word too wide even for the smallest font still returns something', () => {
    const fit = fitText({ ...box, text: 'ক'.repeat(200) });
    expect(fit.lines.length).toBeGreaterThan(0);
    expect(fit.fontSize).toBe(34);
  });
});

describe('card palette', () => {
  test('there is a size for the square and the tall card', () => {
    expect(CARD_SIZES.square).toEqual({ width: 1080, height: 1080 });
    expect(CARD_SIZES.tall).toEqual({ width: 1080, height: 1350 });
  });

  test('mix blends two colours', () => {
    expect(mix('#000000', '#ffffff', 0.5)).toBe('#808080');
    expect(mix('#102030', '#ffffff', 0)).toBe('#102030');
  });

  test('contrast ratio is 21 for black on white', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 0);
  });

  test('the card colours are the light-theme book colours of the design tokens', () => {
    expect(Object.keys(CARD_COLOURS).sort()).toEqual(BOOKS.map((book) => book.id).sort());
    for (const book of BOOKS) expect(CARD_COLOURS[book.id]).toBe(getComputedColour(book.id));
  });

  test.each(BOOKS.map((book) => [book.id, getComputedColour(book.id)]))('%s: a light card with readable text', (id, hex) => {
    const palette = cardPalette(hex);
    expect(palette.accent).toBe(hex);
    expect(contrastRatio(palette.ink, palette.bg)).toBeGreaterThanOrEqual(7);
    expect(contrastRatio(palette.muted, palette.bg)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(palette.ink, palette.bg2)).toBeGreaterThanOrEqual(7);
  });
});

// The book colours as written in src/styles/tokens.css (light theme).
function getComputedColour(id) {
  const css = readFileSync('src/styles/tokens.css', 'utf8');
  return new RegExp(`--bk-${id}:(#[0-9a-f]{6})`).exec(css)[1];
}
