/* eslint-disable testing-library/no-node-access, testing-library/prefer-presence-queries */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { renderToStaticMarkup as toMarkup } from 'react-dom/server';
import { BOOKS } from '../lib/books';
import { clearNarratorCache, honorific, narratorHref, parseIndex } from '../lib/narrators';
import { SettingsProvider } from '../settings/SettingsProvider';
import { serveRealData } from '../test/publicJson';
import HomeNarrators, { topNarrators } from './HomeNarrators';

const INDEX = parseIndex(JSON.parse(readFileSync(path.resolve(process.cwd(), 'public/json/narrators/index.json'), 'utf8')));
const TOP = topNarrators(INDEX);
const digits = (n) => n.toLocaleString('en-US').replace(/\d/g, (d) => '০১২৩৪৫৬৭৮৯'[d]);
const wrap = () => (
  <SettingsProvider>
    <HomeNarrators />
  </SettingsProvider>
);
const settle = () => act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
const rowLinks = () => screen.getAllByRole('link').filter((link) => link.className === 'topics-row');

beforeEach(() => {
  clearNarratorCache();
  serveRealData();
});
afterEach(() => {
  vi.restoreAllMocks();
  delete global.fetch;
});

test('the top narrators are the twenty with most hadis, in the narrators page order', () => {
  expect(TOP).toHaveLength(20);
  expect(TOP.map((n) => n.count)).toEqual([...TOP.map((n) => n.count)].sort((a, b) => b - a));
  expect(TOP[0].id).toBe('abu-hurayrah');
  expect(INDEX.filter((n) => n.count > TOP[19].count).every((n) => TOP.includes(n))).toBe(true);
});

test('the pre-built page and the first client render are the same: the section waits for the index', async () => {
  expect(toMarkup(wrap())).toBe('');
  const { container } = render(wrap());
  expect(container).toBeEmptyDOMElement();
  await settle();
});

test('after loading it shows five different narrators from the top twenty, whatever the random numbers are', async () => {
  for (const value of [0, 0.3, 0.99]) {
    vi.spyOn(Math, 'random').mockReturnValue(value);
    const { unmount } = render(wrap());
    await settle();
    const hrefs = rowLinks().map((link) => link.getAttribute('href'));
    expect(hrefs).toHaveLength(5);
    expect(new Set(hrefs).size).toBe(5);
    for (const href of hrefs) expect(TOP.map((n) => narratorHref(n.id))).toContain(href);
    unmount();
    clearNarratorCache();
  }
});

test('different random numbers give different narrators', async () => {
  vi.spyOn(Math, 'random').mockReturnValue(0);
  const view = render(wrap());
  await settle();
  const a = rowLinks().map((link) => link.getAttribute('href'));
  view.unmount();
  clearNarratorCache();
  vi.spyOn(Math, 'random').mockReturnValue(0.99);
  render(wrap());
  await settle();
  expect(rowLinks().map((link) => link.getAttribute('href'))).not.toEqual(a);
});

test('each row is one link to /narrators?name=<id> with the name, the honorific and the count, and no link inside it', async () => {
  vi.spyOn(Math, 'random').mockReturnValue(0);
  render(wrap());
  await settle();
  const links = rowLinks();
  const first = TOP[0];
  expect(links[0]).toHaveAttribute('href', `/narrators?name=${first.id}`);
  expect(links[0]).toHaveTextContent(`${first.name} ${honorific(first.name)}${digits(first.count)}`);
  for (const link of links) expect(link.querySelector('a')).toBeNull();
});

test('the bar has a segment for each book the narrator has, named by book and count in the link name', async () => {
  vi.spyOn(Math, 'random').mockReturnValue(0);
  render(wrap());
  await settle();
  const first = TOP[0];
  const link = rowLinks()[0];
  const bar = within(link).getByTestId('narrator-bar');
  expect(bar).not.toHaveAttribute('aria-hidden');
  for (const book of BOOKS.filter((b) => first.perBook[b.id] > 0)) {
    const segment = within(bar).getByRole('img', { name: `${book.name}: ${digits(first.perBook[book.id])} হাদীস` });
    expect(segment.style.background).toContain(`var(${book.colorVar})`);
    expect(segment.style.flexGrow).toBe(String(first.perBook[book.id]));
  }
  expect(link).toHaveAccessibleName(expect.stringContaining(`${BOOKS[0].name}: ${digits(first.perBook.bukhari)} হাদীস`));
});

test('hovering a segment shows a tooltip naming the book and the count; leaving hides it; it takes no pointer', async () => {
  vi.spyOn(Math, 'random').mockReturnValue(0);
  render(wrap());
  await settle();
  const first = TOP[0];
  expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  const segment = within(rowLinks()[0]).getByRole('img', { name: `${BOOKS[1].name}: ${digits(first.perBook.muslim)} হাদীস` });
  fireEvent.pointerEnter(segment);
  expect(screen.getByRole('tooltip')).toHaveTextContent(`${BOOKS[1].name}: ${digits(first.perBook.muslim)} হাদীস`);
  expect(screen.getByRole('tooltip').closest('a')).toBeNull();
  fireEvent.pointerLeave(segment);
  expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
});

test('the legend lists the six short book names, with decorative circles', async () => {
  render(wrap());
  await settle();
  const legend = screen.getByRole('list', { name: 'বইয়ের রং' });
  const items = within(legend).getAllByRole('listitem');
  expect(items.map((li) => li.textContent)).toEqual(['বুখারী', 'মুসলিম', 'তিরমিযী', 'আবু দাউদ', 'ইবনে মাজাহ', 'নাসাঈ']);
  for (const [i, li] of items.entries()) {
    const dot = li.querySelector('i');
    expect(dot).toHaveAttribute('aria-hidden', 'true');
    expect(dot.style.background).toContain(`var(${BOOKS[i].colorVar})`);
  }
});

test('one card holds the heading row, then the legend, then the rows', async () => {
  render(wrap());
  await settle();
  const card = screen.getByRole('list', { name: 'বইয়ের রং' }).parentElement;
  expect(card).toHaveClass('home-narr-card');
  expect([...card.children].map((el) => el.className)).toEqual(['home-narr-head', 'home-narr-legend', 'home-narr-list']);
  expect(card).toContainElement(screen.getByRole('heading', { level: 2 }));
  expect(card).toContainElement(screen.getByRole('link', { name: 'সব দেখুন' }));
  expect(screen.getByRole('region', { name: 'শীর্ষ বর্ণনাকারী' })).toContainElement(card);
});

test('the heading links to the narrators page', async () => {
  render(wrap());
  await settle();
  expect(screen.getByRole('heading', { level: 2, name: 'শীর্ষ বর্ণনাকারী' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'সব দেখুন' })).toHaveAttribute('href', '/narrators');
});

test('renders nothing when the index is missing', async () => {
  global.fetch = vi.fn(() => Promise.resolve({ ok: false, status: 404 }));
  const { container } = render(wrap());
  await settle();
  expect(container).toBeEmptyDOMElement();
});
