/* eslint-disable testing-library/no-node-access */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { clearNarratorCache } from '../lib/narrators';
import { groupTopics } from '../lib/topicBlocks';
import { SettingsProvider } from '../settings/SettingsProvider';
import { setUrl } from '../test/nextNavigation';
import { serveRealData } from '../test/publicJson';
import { ToastProvider } from '../ui/Toast';
import NarratorsPage from './NarratorsPage';

// The narrators menu draws 50 rows first and 50 more each time the end of its list comes into view.
vi.setConfig({ testTimeout: 30000 });
const BATCH = 50;
const INDEX = JSON.parse(readFileSync(path.resolve(process.cwd(), 'public/json/narrators/index.json'), 'utf8'));
const byCount = [...INDEX].sort((a, b) => b[2] - a[2] || (a[1] < b[1] ? -1 : 1));

let observers;
class FakeObserver {
  constructor(callback, options) {
    this.callback = callback;
    this.options = options;
    this.targets = new Set();
    observers.push(this);
  }
  observe(target) {
    this.targets.add(target);
  }
  unobserve(target) {
    this.targets.delete(target);
  }
  disconnect() {
    this.targets.clear();
  }
}
// The end of the list comes into view: every observer that still watches something is told.
const reachEnd = async () => {
  await waitFor(() => expect(observers.some((o) => o.targets.size > 0)).toBe(true));
  await act(async () => {
    observers.filter((o) => o.targets.size > 0).forEach((o) => o.callback([...o.targets].map((target) => ({ target, isIntersecting: true }))));
  });
};

beforeEach(() => {
  clearNarratorCache();
  serveRealData();
  observers = [];
  window.IntersectionObserver = FakeObserver;
  window.matchMedia = (query) => ({ matches: true, media: query, addEventListener() {}, removeEventListener() {} });
});
afterEach(async () => {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  delete window.IntersectionObserver;
  delete window.matchMedia;
  delete global.fetch;
});

function show(address) {
  setUrl(address);
  return render(
    <SettingsProvider>
      <ToastProvider>
        <NarratorsPage />
      </ToastProvider>
    </SettingsProvider>
  );
}
const menu = () => screen.getByRole('navigation', { name: 'বর্ণনাকারীসূচি' });
const rows = () => within(menu()).getAllByRole('link');
const names = () => rows().map((row) => row.querySelector('.topics-row-name').textContent.replace(/ \(রাঃ\)$/, ''));
const loaded = () => screen.findAllByRole('link', { name: /^[^\s].*(?: \(রাঃ\))? [০-৯,]+$/ });
const sentinel = () => menu().querySelector('[data-testid="menu-sentinel"]');
const box = () => screen.getByRole('textbox', { name: 'বর্ণনাকারী খুঁজুন' });
const sortBox = () => screen.getByRole('combobox', { name: 'সাজান' });

test('only the first 50 rows are drawn, with a sentinel after them', async () => {
  show('/narrators');
  await loaded();
  expect(rows()).toHaveLength(BATCH);
  expect(names()).toEqual(byCount.slice(0, BATCH).map((row) => row[1]));
  expect(sentinel()).not.toBeNull();
});

test('the next 50 rows are added when the sentinel comes into view, and in the same order', async () => {
  show('/narrators');
  await loaded();
  await reachEnd();
  expect(rows()).toHaveLength(2 * BATCH);
  expect(names()).toEqual(byCount.slice(0, 2 * BATCH).map((row) => row[1]));
});

test('every narrator comes in the end, and then the sentinel is gone', async () => {
  show('/narrators');
  await loaded();
  while (sentinel()) await reachEnd();
  expect(rows()).toHaveLength(INDEX.length);
  expect(sentinel()).toBeNull();
});

test('the sentinel is the last thing in the scrolling area, after the sticky search row', async () => {
  show('/narrators');
  await loaded();
  const scroll = menu().querySelector('.topics-scroll');
  expect(scroll.firstElementChild.classList.contains('topics-menu-row')).toBe(true);
  expect(scroll.lastElementChild).toBe(sentinel());
  const watcher = observers.find((o) => o.targets.has(sentinel()));
  expect(watcher.options.root).toBe(scroll);
});

test('typing in the search starts again from the first batch of the matches', async () => {
  show('/narrators');
  await loaded();
  await reachEnd();
  expect(rows()).toHaveLength(2 * BATCH);
  fireEvent.change(box(), { target: { value: 'আব' } });
  const matches = rows();
  expect(matches.length).toBeGreaterThan(0);
  expect(matches.length).toBeLessThanOrEqual(BATCH);
  fireEvent.change(box(), { target: { value: '' } });
  expect(rows()).toHaveLength(BATCH);
});

test('a search with many matches shows 50 and then more', async () => {
  show('/narrators');
  await loaded();
  fireEvent.change(box(), { target: { value: 'ই' } });
  const first = rows().length;
  if (first === BATCH) {
    await reachEnd();
    expect(rows().length).toBeGreaterThan(BATCH);
  } else {
    expect(first).toBeLessThan(BATCH);
    expect(sentinel()).toBeNull();
  }
});

test.each(['count-desc', 'count-asc', 'name-asc', 'name-desc'])('with the sort %s the first batch is 50 rows and the next adds 50', async (sort) => {
  show(`/narrators?sort=${sort}`);
  await loaded();
  expect(rows()).toHaveLength(BATCH);
  await reachEnd();
  expect(rows()).toHaveLength(2 * BATCH);
});

test('changing the sort goes back to the first 50 rows', async () => {
  show('/narrators');
  await loaded();
  await reachEnd();
  expect(rows()).toHaveLength(2 * BATCH);
  fireEvent.change(sortBox(), { target: { value: 'count-asc' } });
  await loaded();
  expect(rows()).toHaveLength(BATCH);
  const asc = [...INDEX].sort((a, b) => a[2] - b[2] || (a[1] < b[1] ? -1 : 1));
  expect(rows()[0].querySelector('.narr-plain').textContent).toBe(asc[0][1]);
});

test('with the name sort the first 50 are the first 50 of the letter blocks, and the headings are only those of the rows shown', async () => {
  show('/narrators?sort=name-asc');
  await loaded();
  const all = groupTopics(INDEX.map((row) => row[1]), 'asc').flatMap((block) => block.names);
  expect(names()).toEqual(all.slice(0, BATCH));
  const shown = within(menu()).getAllByRole('heading', { level: 3 }).map((h) => h.textContent);
  const wanted = groupTopics(all.slice(0, BATCH), 'asc').map((block) => block.letter);
  expect(shown).toEqual(wanted);
  await reachEnd();
  expect(names()).toEqual(all.slice(0, 2 * BATCH));
});

test('a narrator chosen from far down the list is still drawn, and marked', async () => {
  const far = byCount[200];
  show(`/narrators?name=${far[0]}`);
  const link = await screen.findByRole('link', { name: new RegExp(`^${far[1]} `) });
  expect(link).toHaveAttribute('aria-current', 'page');
  expect(rows().length).toBeGreaterThan(200);
});

test('without IntersectionObserver every row is drawn at once, and there is no sentinel', async () => {
  delete window.IntersectionObserver;
  show('/narrators');
  await loaded();
  expect(rows()).toHaveLength(INDEX.length);
  expect(sentinel()).toBeNull();
});
