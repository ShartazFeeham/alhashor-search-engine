import { readFileSync } from 'node:fs';
import { CARD_MAX_HEIGHT, CARD_WIDTH, cardPalette } from '../lib/cardLayout';
import { cleanText } from '../lib/share';
import { stubContext } from '../test/canvasStub';
import { drawCard, measureCard } from './drawCard';

const read = (folder, number) =>
  JSON.parse(readFileSync(`public/json/hadis/${folder}/${String(number).padStart(4, '0')}/text.txt`, 'utf8'));
const SHORT = cleanText(read('Bukhari', 6628));
const LONG = cleanText(read('Bukhari', 6));

const FONTS = { read: '"ReadFont", serif', ui: '"UiFont", sans-serif', lat: '"LatFont", sans-serif' };
const COLOUR = '#0f8a66';

const base = {
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
  expect(rects[0][0]).toBe(0);
  expect(rects[0][1]).toBe(0);
  expect(rects[0][2]).toBe(1080);
  expect(rects[0][3]).toBeGreaterThan(0);
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
  expect(drawn).toContain('Alhashor');
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

test('a long hadis is drawn whole, on a taller card, with no excerpt and no link line', () => {
  const { texts, result } = draw({ text: LONG, linkText: 'hadis.example/hadis/bukhari/6' });
  expect(result.excerpted).toBe(false);
  expect(result.text).toBe(LONG);
  expect(result.lines.join(' ').replace(/\s+/g, ' ')).toBe(LONG.replace(/\s+/g, ' '));
  expect(result.lines.at(-1).endsWith('...')).toBe(false);
  expect(texts.some((t) => t.text.startsWith('সম্পূর্ণ হাদীস'))).toBe(false);
  expect(result.height).toBeGreaterThan(draw().result.height);
});

describe('the height of the card', () => {
  const heightOf = (text) => measureCard(stubContext().ctx, { text, linkText: 'x', fonts: FONTS }).height;
  const words = (n) => Array.from({ length: n }, (_, i) => `শব্দ${i % 7}`).join(' ');

  test('is worked out from the wrapped text: more text, a taller card, on the same width', () => {
    const heights = [10, 60, 200, 600, 1500].map((n) => heightOf(words(n)));
    for (let i = 1; i < heights.length; i++) expect(heights[i]).toBeGreaterThan(heights[i - 1]);
    expect(measureCard(stubContext().ctx, { text: words(10), fonts: FONTS }).width).toBe(CARD_WIDTH);
  });

  test('contains the whole text: the last line and the footer are inside the canvas, with the paddings', () => {
    const text = words(900);
    const { texts, result } = draw({ text });
    const body = texts.filter((t) => t.font.includes('ReadFont'));
    expect(body).toHaveLength(result.lines.length);
    expect(result.excerpted).toBe(false);
    const last = body.at(-1);
    const rule = texts.find((t) => t.text.startsWith('সহীহ বুখারী'));
    expect(last.y + result.fontSize * 0.875).toBeLessThanOrEqual(rule.y - 48); // above the footer rule
    const site = texts.find((t) => t.text === 'Alhashor');
    expect(site.y + 30).toBeLessThanOrEqual(result.height - 88 + 16);
    expect(result.height).toBe(Math.ceil(site.y + 134));
  });

  test('grows linearly with the number of lines (the header and footer paddings are constant)', () => {
    const one = measureCard(stubContext().ctx, { text: words(100), fonts: FONTS });
    const two = measureCard(stubContext().ctx, { text: words(200), fonts: FONTS });
    const lineHeight = one.fit.fontSize * 1.75;
    expect(two.height - one.height).toBeCloseTo((two.fit.lines.length - one.fit.lines.length) * lineHeight, -1);
  });

  test('a very long hadis keeps growing until the phone canvas limit, then is set smaller, and only then cut', () => {
    const big = measureCard(stubContext().ctx, { text: words(3000), linkText: 'x', fonts: FONTS });
    expect(big.height).toBeGreaterThan(5000);
    expect(big.height).toBeLessThanOrEqual(CARD_MAX_HEIGHT);
    const huge = measureCard(stubContext().ctx, { text: words(40000), linkText: 'x', fonts: FONTS });
    expect(huge.height).toBeLessThanOrEqual(CARD_MAX_HEIGHT);
    expect(huge.fit.excerpted).toBe(true);
    expect(huge.fit.fontSize).toBe(26);
  });

  test('the longest hadis of the books fits without an excerpt', () => {
    const longest = cleanText(read('Muslim', 6760));
    const layout = measureCard(stubContext().ctx, { text: longest, linkText: 'x', fonts: FONTS });
    expect(layout.height).toBeLessThanOrEqual(CARD_MAX_HEIGHT);
    expect(layout.fit.excerpted).toBe(false);
  });
});

test('never sets letter spacing, which would pull Bengali conjuncts apart', () => {
  const { ctx } = draw();
  expect(ctx.letterSpacing).toBeUndefined();
});
