/* eslint-disable testing-library/no-node-access */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { clearNarratorCache, narratorHref, narratorSortFrom } from '../lib/narrators';
import { groupTopics } from '../lib/topicBlocks';
import { SettingsProvider } from '../settings/SettingsProvider';
import { getUrl, setUrl } from '../test/nextNavigation';
import { serveRealData } from '../test/publicJson';
import { ToastProvider } from '../ui/Toast';
import NarratorsPage from './NarratorsPage';

// The narrators menu shows every narrator with the number of hadis, and has four sort options.
vi.setConfig({ testTimeout: 30000 });
const read = (file) => readFileSync(path.resolve(process.cwd(), file), 'utf8');
const INDEX = JSON.parse(read('public/json/narrators/index.json'));
const byCount = [...INDEX].sort((a, b) => b[2] - a[2] || (a[1] < b[1] ? -1 : 1));
const LARGEST = byCount[0];
const SMALLEST = [...INDEX].sort((a, b) => a[2] - b[2])[0][2];
const digits = (n) => n.toLocaleString('en-US').replace(/\d/g, (d) => '০১২৩৪৫৬৭৮৯'[d]);

let width;
const media = (query) => {
  const min = Number(/min-width:\s*(\d+)px/.exec(query)?.[1] ?? 0);
  return { matches: width >= min, media: query, addEventListener() {}, removeEventListener() {} };
};

beforeEach(() => {
  clearNarratorCache();
  serveRealData();
  window.matchMedia = media;
  localStorage.clear();
});
afterEach(async () => {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  delete window.matchMedia;
  delete global.fetch;
  document.body.style.overflow = '';
});

function show(address, w = 1200) {
  width = w;
  setUrl(address);
  return render(
    <SettingsProvider>
      <ToastProvider>
        <NarratorsPage />
      </ToastProvider>
    </SettingsProvider>
  );
}
const address = () => decodeURIComponent(getUrl().pathname + getUrl().search);
const menu = () => screen.getByRole('navigation', { name: 'বর্ণনাকারীসূচি' });
const rows = () => within(menu()).getAllByRole('link');
const sortBox = () => screen.getByRole('combobox', { name: 'সাজান' });
const headings = () => within(menu()).queryAllByRole('heading', { level: 3 }).map((h) => h.textContent);
const nameOf = (row) => row.querySelector('.topics-row-name').textContent.replace(/ \(রাঃ\)$/, '');
const countOf = (row) => row.querySelector('.topics-row-count').textContent;
const loaded = () => screen.findByRole('link', { name: /^আবূ হুরায়রা(?: \(রাঃ\))? [০-৯,]+$/ });

describe('the counts', () => {
  test('every row shows the narrator and the real count with thousands commas, in Bengali digits', async () => {
    show('/narrators');
    await loaded();
    expect(rows()).toHaveLength(INDEX.length);
    const first = rows()[0];
    expect(nameOf(first)).toBe(LARGEST[1]);
    expect(countOf(first)).toBe(digits(LARGEST[2]));
    const abu = screen.getByRole('link', { name: /^আবূ হুরায়রা(?: \(রাঃ\))? [০-৯,]+$/ });
    expect(countOf(abu)).toBe('৩,৬০৬');
    for (const row of rows()) expect(countOf(row)).toMatch(/^[০-৯,]+$/);
  });

  test('the digit style of the visitor is respected', async () => {
    localStorage.setItem('alhashor.settings', JSON.stringify({ digits: 'en' }));
    show('/narrators');
    await screen.findByRole('link', { name: /^আবূ হুরায়রা(?: \(রাঃ\))? [0-9,]+$/ });
    expect(await screen.findByText('3,606')).toBeInTheDocument();
    expect(rows()[0].querySelector('.topics-row-count').textContent).toBe(LARGEST[2].toLocaleString('en-US'));
  });

  test('the counts stay in filtered results and in the phone overlay', async () => {
    show('/narrators', 390);
    const dialog = screen.getByRole('dialog', { name: 'বর্ণনাকারীসূচি' });
    await within(dialog).findByRole('link', { name: /^আয়িশা(?: \(রাঃ\))? [০-৯,]+$/ });
    fireEvent.change(screen.getByRole('textbox', { name: 'বর্ণনাকারী খুঁজুন' }), { target: { value: 'আয়িশা' } });
    const found = within(dialog).getAllByRole('link');
    expect(found.length).toBeGreaterThan(0);
    for (const row of found) expect(countOf(row)).toMatch(/^[০-৯,]+$/);
    expect(countOf(found[0])).toBe(digits(INDEX.find((r) => r[0] === 'aisha')[2]));
  });

  test('the chosen narrator has aria-current and its row keeps the count', async () => {
    show('/narrators?name=abu-hurayrah');
    const row = await loaded();
    expect(row).toHaveAttribute('aria-current', 'page');
    expect(countOf(row)).toBe('৩,৬০৬');
  });
});

describe('the four sort options', () => {
  test('the select has the four options and the count order is the default', async () => {
    show('/narrators');
    await loaded();
    const options = within(sortBox()).getAllByRole('option').map((o) => [o.value, o.textContent]);
    expect(options).toEqual([
      ['count-desc', 'হাদীস সংখ্যা (বেশি → কম)'],
      ['count-asc', 'হাদীস সংখ্যা (কম → বেশি)'],
      ['name-asc', 'নাম (ক → হ)'],
      ['name-desc', 'নাম (হ → ক)'],
    ]);
    expect(sortBox()).toHaveValue('count-desc');
  });

  test('default: one flat list, the largest count first, ties by name, no block headings', async () => {
    show('/narrators');
    await loaded();
    expect(headings()).toHaveLength(0);
    expect(rows().slice(0, 8).map(nameOf)).toEqual(byCount.slice(0, 8).map((r) => r[1]));
    expect(countOf(rows()[0])).toBe(digits(LARGEST[2]));
  });

  test('count ascending: flat, the smallest count first', async () => {
    show('/narrators?sort=count-asc');
    await loaded();
    expect(sortBox()).toHaveValue('count-asc');
    expect(headings()).toHaveLength(0);
    expect(countOf(rows()[0])).toBe(digits(SMALLEST));
    const nums = rows().map((r) => Number(r.querySelector('.topics-row-count').textContent.replace(/[,]/g, '').replace(/[০-৯]/g, (d) => '০১২৩৪৫৬৭৮৯'.indexOf(d))));
    expect(nums).toEqual([...nums].sort((a, b) => a - b));
  });

  test('name ascending and descending bring the letter blocks back', async () => {
    const names = INDEX.map((r) => r[1]);
    const view = show('/narrators?sort=name-asc');
    await loaded();
    expect(sortBox()).toHaveValue('name-asc');
    expect(headings()).toEqual(groupTopics(names, 'asc').map((b) => b.letter));
    view.unmount();
    show('/narrators?sort=name-desc');
    await loaded();
    expect(sortBox()).toHaveValue('name-desc');
    expect(headings()).toEqual(groupTopics(names, 'desc').map((b) => b.letter));
    expect(rows().every((r) => r.querySelector('.topics-row-count'))).toBe(true);
  });

  test('the old &sort=desc and &sort=asc links still work; unknown values mean the default', async () => {
    expect(narratorSortFrom('desc')).toBe('name-desc');
    expect(narratorSortFrom('asc')).toBe('name-asc');
    expect(narratorSortFrom('zzz')).toBe('count-desc');
    expect(narratorSortFrom(null)).toBe('count-desc');
    const view = show('/narrators?sort=desc');
    await loaded();
    expect(sortBox()).toHaveValue('name-desc');
    view.unmount();
    show('/narrators?sort=asc');
    await loaded();
    expect(sortBox()).toHaveValue('name-asc');
  });

  test('every sort goes to the address and back; the default is left out', async () => {
    show('/narrators?name=aisha');
    await loaded();
    for (const [value, query] of [['count-asc', '&sort=count-asc'], ['name-asc', '&sort=name-asc'], ['name-desc', '&sort=name-desc'], ['count-desc', '']]) {
      fireEvent.change(sortBox(), { target: { value } });
      expect(address()).toBe(`/narrators?name=aisha${query}`);
      expect(sortBox()).toHaveValue(value);
    }
    fireEvent.change(sortBox(), { target: { value: 'name-asc' } });
    expect(decodeURIComponent(screen.getByRole('link', { name: /^আবূ হুরায়রা(?: \(রাঃ\))? [০-৯,]+$/ }).getAttribute('href'))).toBe('/narrators?name=abu-hurayrah&sort=name-asc');
  });

  test('narratorHref writes the four sorts and maps the old ones', () => {
    expect(narratorHref('', 0, 'all', 'count-desc')).toBe('/narrators');
    expect(narratorHref('', 0, 'all', 'count-asc')).toBe('/narrators?sort=count-asc');
    expect(narratorHref('', 0, 'all', 'name-asc')).toBe('/narrators?sort=name-asc');
    expect(narratorHref('', 0, 'all', 'name-desc')).toBe('/narrators?sort=name-desc');
    expect(narratorHref('', 0, 'all', 'desc')).toBe('/narrators?sort=name-desc');
    expect(narratorHref('', 0, 'all', 'asc')).toBe('/narrators?sort=name-asc');
    expect(narratorHref('aisha')).toBe('/narrators?name=aisha');
  });
});

describe('the search stays on top', () => {
  test('the search input is the first control in the menu and filters live with the counts', async () => {
    show('/narrators');
    await loaded();
    const controls = [...menu().querySelectorAll('input,select,a')];
    expect(controls[0]).toBe(screen.getByRole('textbox', { name: 'বর্ণনাকারী খুঁজুন' }));
    expect(controls[1]).toBe(sortBox());
    fireEvent.change(controls[0], { target: { value: 'ঝঝঝঝঝ' } });
    expect(screen.getByText('কোনো বর্ণনাকারী পাওয়া যায়নি')).toBeInTheDocument();
  });

  test('the top row is sticky inside the scrolling area, with the menu background', () => {
    const css = read('src/styles/topics.css');
    const rule = (selector) => css.slice(css.indexOf(`${selector}{`) + selector.length + 1, css.indexOf('}', css.indexOf(`${selector}{`)));
    const row = rule('.topics-menu-row');
    expect(row).toMatch(/position:sticky/);
    expect(row).toMatch(/top:0/);
    expect(row).toMatch(/background:var\(--surface\)/);
    expect(css).toMatch(/\.is-overlay \.topics-menu-row\{[^}]*background:var\(--bg\)/);
    const source = read('src/topics/NameMenu.jsx');
    expect(source.indexOf('className="topics-scroll"')).toBeLessThan(source.indexOf('className="topics-menu-row"'));
  });
});
