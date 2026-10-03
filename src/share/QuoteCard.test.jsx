import { render, screen, waitFor } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { createRef } from 'react';
import { bookById } from '../lib/books';
import { stubCanvas } from '../test/canvasStub';
import QuoteCard from './QuoteCard';

const BUKHARI_6628 = JSON.parse(readFileSync('public/json/hadis/Bukhari/6628/text.txt', 'utf8'));
const BUKHARI_6 = JSON.parse(readFileSync('public/json/hadis/Bukhari/0006/text.txt', 'utf8'));
const bukhari = bookById('bukhari');
const CITE = 'সহীহ বুখারী, হাদীস নং ৬,৬২৮';

const card = (props) => (
  <QuoteCard book={bukhari} number={6628} text={BUKHARI_6628} citationText={CITE} {...props} />
);

let stub;
beforeEach(() => {
  stub = stubCanvas();
});

afterEach(() => {
  vi.restoreAllMocks();
  delete document.fonts;
});

test('draws the card on a canvas 1080 wide, as tall as the text needs', async () => {
  const onDrawn = vi.fn();
  render(card({ onDrawn }));
  await waitFor(() => expect(onDrawn).toHaveBeenCalled());
  const canvas = screen.getByRole('img');
  expect(canvas.tagName).toBe('CANVAS');
  expect(canvas).toHaveAttribute('width', '1080');
  const height = Number(canvas.getAttribute('height'));
  expect(height).toBe(stub.texts.find((t) => t.text === 'Alhashor').y + 134); // the site name sits 134 above the bottom edge
  const drawn = stub.texts.map((t) => t.text);
  expect(drawn).toContain(CITE);
  expect(drawn).toContain('বুখারী শরীফ');
  expect(drawn).toContain('Alhashor');
  expect(stub.texts.some((t) => t.text.includes('বর্তমান যুগের মুনাফিকরা'))).toBe(true);
});

test('has no size prop: a longer hadis gives a taller canvas on the same width', async () => {
  const heightOf = async (props) => {
    const onDrawn = vi.fn();
    const view = render(card({ onDrawn, ...props }));
    await waitFor(() => expect(onDrawn).toHaveBeenCalled());
    const canvas = screen.getByRole('img');
    const size = [canvas.getAttribute('width'), Number(canvas.getAttribute('height'))];
    view.unmount();
    return size;
  };
  const short = await heightOf({});
  const long = await heightOf({ number: 6, text: BUKHARI_6 });
  expect(short[0]).toBe('1080');
  expect(long[0]).toBe('1080');
  expect(long[1]).toBeGreaterThan(short[1]);
});

test('the height is measured from the text before drawing: every line is inside the canvas, and the whole text is drawn', async () => {
  const onDrawn = vi.fn();
  render(card({ number: 6, text: BUKHARI_6, onDrawn }));
  await waitFor(() => expect(onDrawn).toHaveBeenCalled());
  const result = onDrawn.mock.calls[0][0];
  expect(Number(screen.getByRole('img').getAttribute('height'))).toBe(result.height);
  const body = stub.texts.filter((t) => t.font.includes(`${result.fontSize}px`) && t.font.startsWith('500'));
  expect(body.length).toBe(result.lines.length);
  expect(Math.max(...body.map((t) => t.y))).toBeLessThan(result.height - 88 - 150);
  expect(result.excerpted).toBe(false);
});

test('describes the picture for screen readers with the saying and the citation', async () => {
  const onDrawn = vi.fn();
  render(card({ onDrawn }));
  const label = screen.getByRole('img').getAttribute('aria-label');
  expect(label).toContain('বর্তমান যুগের মুনাফিকরা');
  expect(label).toContain(CITE);
  expect(label).not.toMatch(/^৬৬২৮/);
  await waitFor(() => expect(onDrawn).toHaveBeenCalled());
});

test('the description of a long hadis is its first part only, not the whole text', async () => {
  const onDrawn = vi.fn();
  render(card({ number: 6, text: BUKHARI_6, onDrawn }));
  await waitFor(() => expect(onDrawn).toHaveBeenCalled());
  expect(onDrawn.mock.calls[0][0].excerpted).toBe(false);
  await waitFor(() => expect(screen.getByRole('img').getAttribute('aria-label').length).toBeLessThan(600));
  expect(screen.getByRole('img').getAttribute('aria-label')).toContain(' ...');
});

test('hands the canvas to its parent', async () => {
  const canvasRef = createRef();
  const onDrawn = vi.fn();
  render(card({ canvasRef, onDrawn }));
  await waitFor(() => expect(onDrawn).toHaveBeenCalled());
  expect(canvasRef.current).toBe(screen.getByRole('img'));
});

test('waits for the fonts to load before drawing', async () => {
  let release;
  const loading = new Promise((resolve) => { release = resolve; });
  document.fonts = { load: vi.fn(() => loading) };
  const onDrawn = vi.fn();
  render(card({ onDrawn }));
  await waitFor(() => expect(document.fonts.load).toHaveBeenCalled());
  const loaded = document.fonts.load.mock.calls.map((call) => call[0]).join(' ');
  expect(loaded).toMatch(/500 \d+px/); // the reading font
  expect(stub.ctx.fillRect).not.toHaveBeenCalled();
  expect(onDrawn).not.toHaveBeenCalled();
  release([]);
  await waitFor(() => expect(onDrawn).toHaveBeenCalled());
  expect(stub.ctx.fillRect).toHaveBeenCalled();
});

test('still draws when a font cannot be loaded', async () => {
  document.fonts = { load: vi.fn(() => Promise.reject(new Error('no font'))) };
  const onDrawn = vi.fn();
  render(card({ onDrawn }));
  await waitFor(() => expect(onDrawn).toHaveBeenCalled());
});

test('draws again when the text changes, with the new height', async () => {
  const onDrawn = vi.fn();
  const { rerender } = render(card({ onDrawn }));
  await waitFor(() => expect(onDrawn).toHaveBeenCalledTimes(1));
  rerender(card({ number: 6, text: BUKHARI_6, onDrawn }));
  await waitFor(() => expect(onDrawn).toHaveBeenCalledTimes(2));
  expect(onDrawn.mock.calls[1][0].height).toBeGreaterThan(onDrawn.mock.calls[0][0].height);
});

test('a browser with no canvas context does not break the page', async () => {
  HTMLCanvasElement.prototype.getContext.mockReturnValue(null);
  const onDrawn = vi.fn();
  render(card({ onDrawn }));
  await new Promise((resolve) => setTimeout(resolve, 20));
  expect(onDrawn).not.toHaveBeenCalled();
  expect(screen.getByRole('img')).toBeInTheDocument();
});

describe('Bengali digits on the picture use the digit font', () => {
  beforeEach(() => {
    document.documentElement.style.setProperty('--f-digits', 'digitFont');
    document.documentElement.style.setProperty('--f-ui', 'uiFont');
  });
  afterEach(() => {
    document.documentElement.style.removeProperty('--f-digits');
    document.documentElement.style.removeProperty('--f-ui');
  });

  test('every canvas font that draws the book name, citation or link lists the digit font first', async () => {
    const onDrawn = vi.fn();
    render(card({ onDrawn }));
    await waitFor(() => expect(onDrawn).toHaveBeenCalled());
    const cite = stub.texts.find((t) => t.text === CITE);
    expect(cite.font).toMatch(/^600 40px digitFont, uiFont, sans-serif$/);
    const name = stub.texts.find((t) => t.text === 'বুখারী শরীফ');
    expect(name.font).toMatch(/^700 46px digitFont, uiFont, sans-serif$/);
    // the saying is in the reading font, which has its own even digits; the digit font still comes first
    const body = stub.texts.find((t) => t.text.includes('বর্তমান যুগের মুনাফিকরা'));
    expect(body.font).toMatch(/^500 \d+px digitFont, /);
  });

  test('loads the digit font at the weights the picture draws before drawing', async () => {
    document.fonts = { load: vi.fn(() => Promise.resolve([])) };
    const onDrawn = vi.fn();
    render(card({ onDrawn }));
    await waitFor(() => expect(onDrawn).toHaveBeenCalled());
    const loads = document.fonts.load.mock.calls.filter(([font]) => /^\d+ 40px digitFont$/.test(font));
    expect(loads.map(([font]) => font.split(' ')[0]).sort()).toEqual(['500', '600', '700']);
    for (const [, sample] of loads) expect(sample).toBe('০১২৩৪৫৬৭৮৯');
  });
});
