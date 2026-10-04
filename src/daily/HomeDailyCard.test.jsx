/* eslint-disable testing-library/no-node-access */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { act, render, screen, within } from '@testing-library/react';
import { pickDay } from '../lib/dailyPool';
import { SettingsProvider } from '../settings/SettingsProvider';
import HomeDailyCard from './HomeDailyCard';

const NOW = new Date(2026, 9, 2, 10, 0);
const pick = () => pickDay(NOW);
const renderCard = () => render(<SettingsProvider><HomeDailyCard /></SettingsProvider>);
const card = () => screen.getByRole('region', { name: 'আজকের হাদীস' });
const css = readFileSync(path.resolve(process.cwd(), 'src/styles/daily.css'), 'utf8');
const cssRule = (selector) => {
  const rules = css.split('\n').filter((line) => line.startsWith(`${selector}{`));
  expect(rules).toHaveLength(1);
  return rules[0];
};

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
});

afterEach(async () => {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  vi.useRealTimers();
});

test("shows the owner's whole core line of the hadis, with the citation above it and nothing fetched", async () => {
  global.fetch = vi.fn();
  const { book, number, line } = pick();
  renderCard();
  const text = await screen.findByTestId('home-daily-text');
  expect(line.length).toBeGreaterThan(0);
  expect(text.textContent).toBe(line);
  expect(text.textContent).not.toMatch(/…|\.\.\./);
  expect(within(card()).getByText(/হাদীস নং/).compareDocumentPosition(text) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(global.fetch).not.toHaveBeenCalled();
  delete global.fetch;
  expect(within(card()).getByRole('link', { name: 'আরও দেখুন' })).toHaveAttribute('href', `/hadis/${book.id}/${number}`);
});

test('the line is never cut: no clamp, no hidden overflow, on any width', () => {
  expect(cssRule('.home-daily-text')).not.toMatch(/line-clamp|overflow:|-webkit-box/);
  expect(css.slice(css.indexOf('@media (min-width: 641px)'))).not.toContain('.home-daily-text{');
});

test('the line is darker than the citation: the full ink colour, same size and font as before', () => {
  const rule = cssRule('.home-daily-text');
  expect(rule).toContain('color:var(--ink)');
  expect(rule).toContain('font-size:var(--home-daily-fs)');
  expect(cssRule('.home-daily-cite')).toContain('color:var(--home-daily-ink)');
  expect(cssRule('.home-daily')).toContain('--home-daily-ink:var(--ink2)');
});

describe('the whole card is one link', () => {
  test('has a single link, to the hadis page, labelled "আরও দেখুন", inline right after the line, and no other interactive element', async () => {
    const { book, number } = pick();
    renderCard();
    const text = await screen.findByTestId('home-daily-text');
    const links = within(card()).getAllByRole('link');
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute('href', `/hadis/${book.id}/${number}`);
    expect(links[0]).toHaveTextContent('আরও দেখুন');
    expect(links[0]).toContainHTML('<svg');
    expect(text.compareDocumentPosition(links[0]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(text.closest('p')).toContainElement(links[0]);
    expect(within(card()).queryByRole('button')).not.toBeInTheDocument();
  });

  test("the card is the containing block of the link's stretched ::after, and has a hover state and a focus ring", () => {
    expect(cssRule('.home-daily')).toMatch(/position:relative/);
    const stretch = cssRule('.home-daily-more::after');
    expect(stretch).toMatch(/content:""/);
    expect(stretch).toMatch(/position:absolute/);
    expect(stretch).toMatch(/inset:0/);
    expect(cssRule('.home-daily-text')).not.toMatch(/position:(relative|absolute|fixed|sticky)/);
    expect(css).toMatch(/\.home-daily:hover\{[^}]*background:var\(--[a-z0-9-]+\)/);
    expect(css).toMatch(/\.home-daily:has\(\.home-daily-more:focus-visible\)\{[^}]*outline:2px solid var\(--accent\)/);
  });

  test('the link is accent coloured, inline in the text (no line of its own), underlined on hover and focus', () => {
    const more = cssRule('.home-daily-more');
    expect(more).toContain('color:var(--accent2)');
    expect(more).toContain('display:inline');
    expect(css).toMatch(/\.home-daily-more:hover,\.home-daily-more:focus-visible\{text-decoration:underline\}/);
  });
});

test('the card has no min-height of its own: only the loading state holds a height', () => {
  expect(cssRule('.home-daily')).not.toContain('min-height');
  expect(Number(/min-height:(\d+)px/.exec(cssRule('.home-daily-loading'))[1])).toBeLessThanOrEqual(110);
});

test('the card is compact: 6 to 12px card padding and top gap', () => {
  const card = cssRule('.home-daily');
  expect(/padding:(\d+)px (\d+)px/.exec(card).slice(1).map(Number).every((value) => value >= 6 && value <= 12)).toBe(true);
  const gap = Number(/margin:(\d+)px 0 0/.exec(card)[1]);
  expect(gap).toBeGreaterThanOrEqual(6);
  expect(gap).toBeLessThanOrEqual(12);
});
