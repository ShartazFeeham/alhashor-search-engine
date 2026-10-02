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

test('draws the card on a 1080 x 1080 canvas', async () => {
  const onDrawn = vi.fn();
  render(card({ onDrawn }));
  await waitFor(() => expect(onDrawn).toHaveBeenCalled());
  const canvas = screen.getByRole('img');
  expect(canvas.tagName).toBe('CANVAS');
  expect(canvas).toHaveAttribute('width', '1080');
  expect(canvas).toHaveAttribute('height', '1080');
  const drawn = stub.texts.map((t) => t.text);
  expect(drawn).toContain(CITE);
  expect(drawn).toContain('বুখারী শরীফ');
  expect(drawn).toContain('Alhashor · বইকথা');
  expect(stub.texts.some((t) => t.text.includes('বর্তমান যুগের মুনাফিকরা'))).toBe(true);
});

test('the tall size is 1080 x 1350', async () => {
  const onDrawn = vi.fn();
  render(card({ ratio: 'tall', onDrawn }));
  await waitFor(() => expect(onDrawn).toHaveBeenCalled());
  expect(screen.getByRole('img')).toHaveAttribute('height', '1350');
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

test('the description of a long hadis is the excerpt that is on the card, not the whole text', async () => {
  const onDrawn = vi.fn();
  render(card({ number: 6, text: BUKHARI_6, onDrawn }));
  await waitFor(() => expect(onDrawn).toHaveBeenCalled());
  expect(onDrawn.mock.calls[0][0].excerpted).toBe(true);
  await waitFor(() => expect(screen.getByRole('img').getAttribute('aria-label').length).toBeLessThan(1500));
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

test('draws again when the size changes', async () => {
  const onDrawn = vi.fn();
  const { rerender } = render(card({ onDrawn }));
  await waitFor(() => expect(onDrawn).toHaveBeenCalledTimes(1));
  rerender(card({ ratio: 'tall', onDrawn }));
  await waitFor(() => expect(onDrawn).toHaveBeenCalledTimes(2));
  expect(onDrawn.mock.calls[1][0]).toBeDefined();
});

test('a browser with no canvas context does not break the page', async () => {
  HTMLCanvasElement.prototype.getContext.mockReturnValue(null);
  const onDrawn = vi.fn();
  render(card({ onDrawn }));
  await new Promise((resolve) => setTimeout(resolve, 20));
  expect(onDrawn).not.toHaveBeenCalled();
  expect(screen.getByRole('img')).toBeInTheDocument();
});
