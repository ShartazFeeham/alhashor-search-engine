import { readFileSync } from 'node:fs';
import { CARD_SIZES, cardPalette } from '../lib/cardLayout';
import { cleanText } from '../lib/share';
import { stubContext } from '../test/canvasStub';
import { drawCard } from './drawCard';

const read = (folder, number) =>
  JSON.parse(readFileSync(`public/json/hadis/${folder}/${String(number).padStart(4, '0')}/text.txt`, 'utf8'));
const SHORT = cleanText(read('Bukhari', 6628));
const MEDIUM = cleanText(read('Muslim', 3));
const LONG = cleanText(read('Bukhari', 6));

const FONTS = { read: '"ReadFont", serif', ui: '"UiFont", sans-serif', lat: '"LatFont", sans-serif' };
const COLOUR = '#0f8a66';

const base = {
  ...CARD_SIZES.square,
  badge: 'বু',
  bookName: 'বুখারী শরীফ',
  citationText: 'সহীহ বুখারী, হাদীস নং ৬,৬২৮',
  linkText: 'hadis.example/hadis/bukhari/6628',
  fonts: FONTS,
  colour: COLOUR,
};

const draw = (overrides) => {
  const { ctx, texts, rects } = stubContext();
  const result = drawCard(ctx, { ...base, text: SHORT, ...overrides });
  return { ctx, texts, rects, result };
};

test('paints the whole card with the paper colour first', () => {
  const { rects } = draw();
  expect(rects[0]).toEqual([0, 0, 1080, 1080]);
});

test('draws the saying in the reading font, in lines that stay inside the margins', () => {
  const { texts, result } = draw();
  const body = texts.filter((t) => t.font.includes('ReadFont') && t.font.includes(`${result.fontSize}px`));
  expect(body.map((t) => t.text)).toEqual(result.lines);
  expect(body.length).toBeGreaterThan(1);
  for (const line of body) {
    expect(line.x).toBe(88);
    expect(line.text.length * result.fontSize * 0.5).toBeLessThanOrEqual(1080 - 2 * 88);
    expect(line.fillStyle).toBe(cardPalette(COLOUR).ink);
  }
  expect(body.map((t) => t.text).join(' ').replace(/\s+/g, ' ')).toBe(SHORT.replace(/\s+/g, ' '));
});

test('the lines go from top to bottom, one after another', () => {
  const { texts, result } = draw();
  const ys = texts.filter((t) => t.font.includes('ReadFont')).map((t) => t.y);
  expect(ys).toHaveLength(result.lines.length);
  expect([...ys].sort((a, b) => a - b)).toEqual(ys);
  expect(ys[1] - ys[0]).toBeCloseTo(result.fontSize * 1.75, 5);
});

test('draws the book badge and name, the citation and the site name', () => {
  const { texts } = draw();
  const drawn = texts.map((t) => t.text);
  expect(drawn).toContain('বু');
  expect(drawn).toContain('বুখারী শরীফ');
  expect(drawn).toContain('সহীহ বুখারী, হাদীস নং ৬,৬২৮');
  expect(drawn).toContain('Alhashor · বইকথা');
});

test('the citation and site name are at the bottom, below the saying', () => {
  const { texts } = draw();
  const lastBody = Math.max(...texts.filter((t) => t.font.includes('ReadFont')).map((t) => t.y));
  const cite = texts.find((t) => t.text.startsWith('সহীহ বুখারী'));
  const site = texts.find((t) => t.text.startsWith('Alhashor'));
  expect(cite.y).toBeGreaterThan(lastBody);
  expect(site.y).toBeGreaterThan(cite.y);
  expect(site.y).toBeLessThan(1080);
});

test('a short text is not cut and has no "full hadis" line', () => {
  const { texts, result } = draw();
  expect(result.excerpted).toBe(false);
  expect(texts.some((t) => t.text.startsWith('সম্পূর্ণ হাদীস'))).toBe(false);
});

test('a long hadis is an excerpt at the smallest font, with the link to the full hadis', () => {
  const { texts, result } = draw({ text: LONG, linkText: 'hadis.example/hadis/bukhari/6' });
  expect(result.excerpted).toBe(true);
  expect(result.fontSize).toBe(34);
  expect(result.lines.at(-1).endsWith('...')).toBe(true);
  const link = texts.find((t) => t.text === 'সম্পূর্ণ হাদীস: hadis.example/hadis/bukhari/6');
  expect(link).toBeDefined();
  const lastBody = Math.max(...texts.filter((t) => t.font.includes('ReadFont')).map((t) => t.y));
  expect(link.y).toBeGreaterThan(lastBody);
  const cite = texts.find((t) => t.text.startsWith('সহীহ বুখারী'));
  expect(link.y).toBeLessThan(cite.y);
});

test('the taller card has more room, so a mid-length text is not smaller than on the square card', () => {
  const square = draw({ text: MEDIUM }).result;
  const tall = draw({ text: MEDIUM, ...CARD_SIZES.tall }).result;
  expect(tall.fontSize).toBeGreaterThanOrEqual(square.fontSize);
});

test('on the tall card the citation sits at the bottom of the taller canvas', () => {
  const { texts } = draw({ ...CARD_SIZES.tall });
  const site = texts.find((t) => t.text.startsWith('Alhashor'));
  expect(site.y).toBeGreaterThan(1080);
  expect(site.y).toBeLessThan(1350);
});

test('never sets letter spacing, which would pull Bengali conjuncts apart', () => {
  const { ctx } = draw();
  expect(ctx.letterSpacing).toBeUndefined();
});
