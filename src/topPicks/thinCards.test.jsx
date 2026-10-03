import { readFileSync } from 'node:fs';
import path from 'node:path';
import { render, screen } from '@testing-library/react';
import { SettingsProvider } from '../settings/SettingsProvider';
import { formatNumber } from '../lib/digits';
import TopPicksPage from './TopPicksPage';

// jsdom has no layout, so the cards' size is pinned from their CSS. The text part (below) is
// 78px with a one-line title; with the growth tree at the right the card is as tall as the tree
// needs (see planCardTree.test.jsx: 84 to 110px).
const bn = (n) => formatNumber(n, 'bn');
const css = readFileSync(path.resolve(process.cwd(), 'src/styles/daily.css'), 'utf8');
const escape = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const rule = (selector) => {
  const match = css.match(new RegExp(`(?:^|\\n)${escape(selector)}\\{([^}]*)\\}`));
  expect(match, selector).not.toBeNull();
  return match[1];
};
const value = (declarations, property) => declarations.match(new RegExp(`(?:^|;)${property}:([^;]*)`))?.[1].trim() ?? null;

const LONG = 'উম্মতের মাঝে শ্রেষ্ঠতম: আহলে বায়াত ও তাঁদের ফজিলত';
const sets = [{ id: 'long', title: LONG, description: 'একটি ছোট লাইন', days: [{ book: 'bukhari', number: 1 }, { book: 'muslim', number: 2 }, { book: 'bukhari', number: 3 }] }];

test('a card is three compact lines: the title row, the description row and the progress row', () => {
  const card = rule('.plan-card');
  const [top, , bottom] = value(card, 'padding').split(/\s+/).map(parseFloat);
  const border = parseFloat(value(card, 'border')) * 2;
  const lines = [rule('.plan-card-title'), rule('.plan-card-text'), rule('.plan-card-progress')].map((entry) => parseFloat(value(entry, 'line-height')));
  const gap = parseFloat(value(rule('.plan-card-body'), 'gap')) * 2;
  const oneLineEach = top + bottom + border + gap + lines.reduce((sum, line) => sum + line, 0);
  expect(oneLineEach).toBeLessThanOrEqual(84);
  expect(top).toBeLessThanOrEqual(10);
  expect(bottom).toBeLessThanOrEqual(10);
});

test('a title is never cut: no ellipsis, no line clamp, no nowrap on the card or its texts, and long words break', () => {
  for (const selector of ['.plan-card', '.plan-card-body', '.plan-card-title', '.plan-card-text', '.plan-card-progress']) {
    expect(rule(selector), selector).not.toMatch(/text-overflow|line-clamp|white-space:\s*nowrap|overflow:\s*hidden|max-height/);
  }
  expect(value(rule('.plan-card-title'), 'overflow-wrap')).toBe('anywhere');
});

test('the tile is 36 to 40px and the text column can shrink beside it', () => {
  const tile = rule('.plan-tile');
  for (const property of ['width', 'height']) {
    expect(parseFloat(value(tile, property))).toBeGreaterThanOrEqual(36);
    expect(parseFloat(value(tile, property))).toBeLessThanOrEqual(40);
  }
  expect(value(tile, 'flex')).toBe('none');
  expect(value(rule('.plan-card-body'), 'min-width')).toBe('0');
});

test('the column can shrink below its content, so nothing pushes the page sideways', () => {
  expect(value(rule('.plan-list'), 'grid-template-columns')).toBe('minmax(0,1fr)');
  expect(value(rule('.plan-list li'), 'min-width')).toBe('0');
});

test('the longest set title is in the page in full, as the card title', () => {
  render(<SettingsProvider><TopPicksPage sets={sets} /></SettingsProvider>);
  const title = screen.getByText(LONG);
  expect(title).toHaveClass('plan-card-title');
  expect(title.textContent).toBe(LONG);
  expect(title.textContent).not.toMatch(/…|\.\.\./);
});

test('the progress line always reads আপনি পড়েছেন N/M, with a ring beside it', () => {
  const { unmount } = render(<SettingsProvider><TopPicksPage sets={sets} /></SettingsProvider>);
  expect(screen.getByText(/আপনি পড়েছেন/)).toHaveTextContent('আপনি পড়েছেন ০/৩');
  expect(screen.getByRole('img', { name: '০ শতাংশ পড়া হয়েছে' })).toBeInTheDocument();
  unmount();
  localStorage.setItem('alhashor.plan-progress', JSON.stringify({ long: [0, 2] }));
  render(<SettingsProvider><TopPicksPage sets={sets} /></SettingsProvider>);
  expect(screen.getByText(/আপনি পড়েছেন/)).toHaveTextContent('আপনি পড়েছেন ২/৩');
  expect(screen.getByRole('img', { name: '৬৭ শতাংশ পড়া হয়েছে' })).toBeInTheDocument();
});

const daily = readFileSync(path.resolve(process.cwd(), 'src/styles/daily.css'), 'utf8');

test.each([
  [0, 'red'],
  [32, 'red'],
  [33, 'yellow'],
  [65, 'yellow'],
  [66, 'green'],
  [100, 'green'],
])('at %i%% the N/M text is in the %s band, the same band as the ring', (percent, band) => {
  const total = 100;
  const days = Array.from({ length: total }, (_, index) => ({ book: 'bukhari', number: index + 1 }));
  localStorage.setItem('alhashor.plan-progress', JSON.stringify({ banded: Array.from({ length: percent }, (_, index) => index) }));
  render(<SettingsProvider><TopPicksPage sets={[{ id: 'banded', title: 'ব্যান্ড', description: '', days }]} /></SettingsProvider>);
  const count = screen.getByText(`${bn(percent)}/${bn(total)}`);
  expect(count).toHaveClass('plan-card-count');
  expect(count).toHaveAttribute('data-band', band);
  expect(screen.getByRole('img', { name: `${bn(percent)} শতাংশ পড়া হয়েছে` })).toHaveAttribute('data-band', band);
});

test('the label uses the body text token, the numbers the text token of their band', () => {
  expect(daily).toMatch(/\.plan-card-read\{color:var\(--progress-label\)\}/);
  expect(daily).toMatch(/\.plan-card-count\{[^}]*color:var\(--progress-red-text\)\}/);
  expect(daily).toMatch(/\.plan-card-count\[data-band="yellow"\]\{color:var\(--progress-yellow-text\)\}/);
  expect(daily).toMatch(/\.plan-card-count\[data-band="green"\]\{color:var\(--progress-green-text\)\}/);
});

test('the label reads আপনি পড়েছেন before the numbers', () => {
  render(<SettingsProvider><TopPicksPage sets={sets} /></SettingsProvider>);
  expect(screen.getByText(/আপনি পড়েছেন/)).toHaveTextContent('আপনি পড়েছেন ০/৩');
});
