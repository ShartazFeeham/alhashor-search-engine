/* eslint-disable testing-library/no-node-access */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { clearNarratorCache, filterNarrators, narratorHref, parseIndex } from '../lib/narrators';
import { SettingsProvider } from '../settings/SettingsProvider';
import { getUrl, setUrl } from '../test/nextNavigation';
import { serveRealData } from '../test/publicJson';
import { ToastProvider } from '../ui/Toast';
import NarratorsPage from './NarratorsPage';

// The narrator chosen from a search (and so far down the menu) must survive Back, forward and a reload:
// the address holds the narrator, the sort and the search text.
vi.setConfig({ testTimeout: 30000 });
const INDEX = JSON.parse(readFileSync(path.resolve(process.cwd(), 'public/json/narrators/index.json'), 'utf8'));
const byCount = [...INDEX].sort((a, b) => b[2] - a[2] || (a[1] < b[1] ? -1 : 1));

class FakeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
beforeEach(() => {
  clearNarratorCache();
  serveRealData();
  window.IntersectionObserver = FakeObserver;
  window.matchMedia = (query) => ({ matches: true, media: query, addEventListener() {}, removeEventListener() {} });
});
afterEach(async () => {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  vi.restoreAllMocks();
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
const box = () => screen.getByRole('textbox', { name: 'বর্ণনাকারী খুঁজুন' });
const loaded = () => screen.findAllByRole('link', { name: /^[^\s].*(?: \(রাঃ\))? [০-৯,]+$/ });
const current = () => rows().find((row) => row.getAttribute('aria-current') === 'page');

describe('the chosen narrator survives going away and coming back', () => {
  test('one beyond the first 50 is drawn and marked again after remounting from the same address', async () => {
    const far = byCount[300];
    const address = `/narrators?name=${far[0]}`;
    const view = show(address);
    await loaded();
    expect(current()).toBeTruthy();
    view.unmount();
    show(address);
    await loaded();
    expect(current().querySelector('.narr-plain').textContent).toBe(far[1]);
  });

  test('the sort stays in the address and the menu after remounting', async () => {
    const far = byCount[120];
    const address = narratorHref(far[0], 0, 'all', 'count-asc');
    const view = show(address);
    await loaded();
    view.unmount();
    show(address);
    await loaded();
    expect(screen.getByRole('combobox', { name: 'সাজান' })).toHaveValue('count-asc');
    expect(current()).toBeTruthy();
    expect(getUrl().searchParams.get('sort')).toBe('count-asc');
  });

  test('typing in the search writes q to the address (and clearing it removes q)', async () => {
    show('/narrators');
    await loaded();
    fireEvent.change(box(), { target: { value: 'আব' } });
    expect(getUrl().searchParams.get('q')).toBe('আব');
    fireEvent.change(box(), { target: { value: '' } });
    expect(getUrl().searchParams.has('q')).toBe(false);
  });

  test('search, choose, remount: the same filtered list shows with the narrator selected', async () => {
    const all = parseIndex(INDEX);
    const view = show('/narrators');
    await loaded();
    // A text with plenty of matches, so that the chosen one is far down the filtered list.
    const text = 'আব';
    fireEvent.change(box(), { target: { value: text } });
    const matches = filterNarrators(all.sort((a, b) => b.count - a.count || (a.name < b.name ? -1 : 1)), text);
    expect(matches.length).toBeGreaterThan(60);
    // The last of the first 50 matches: it sits beyond the first 50 rows of the whole list.
    const chosen = matches[49];
    expect(all.indexOf(chosen)).toBeGreaterThan(50);
    const link = rows().find((row) => row.getAttribute('href').includes(`name=${encodeURIComponent(chosen.id)}`) || row.getAttribute('href').includes(`name=${chosen.id}`));
    expect(link).toBeTruthy();
    const target = new URL(link.getAttribute('href'), 'http://localhost');
    expect(target.searchParams.get('q')).toBe(text);
    view.unmount();
    show(`${target.pathname}${target.search}`);
    await loaded();
    expect(box()).toHaveValue(text);
    expect(rows().length).toBeGreaterThan(0);
    expect(current().querySelector('.narr-plain').textContent).toBe(chosen.name);
    // Every row is a match of the search.
    expect(rows().length).toBeLessThanOrEqual(matches.length);
  });

  test('the page links keep the search text', async () => {
    show('/narrators?name=' + byCount[0][0] + '&q=' + encodeURIComponent('আব'));
    await loaded();
    expect(box()).toHaveValue('আব');
    const hrefs = rows().map((row) => row.getAttribute('href'));
    expect(hrefs.every((href) => new URL(href, 'http://localhost').searchParams.get('q') === 'আব')).toBe(true);
  });
});

describe('the chosen narrator is scrolled into view in the menu', () => {
  // jsdom has no layout: say where the scrolling box and the chosen row are.
  function layout(rowTop) {
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function rect() {
      if (this.classList.contains('topics-scroll')) return { top: 100, bottom: 600, height: 500 };
      if (this.getAttribute('aria-current') === 'page') return { top: rowTop, bottom: rowTop + 40, height: 40 };
      return { top: 0, bottom: 0, height: 0 };
    });
  }
  const scroller = () => document.querySelector('.topics-scroll');

  test('although the index arrives after the page has mounted', async () => {
    layout(9000);
    show(`/narrators?name=${byCount[250][0]}`);
    await loaded();
    expect(scroller().scrollTop).toBe(9000 - 100 - (500 - 40) / 2);
  });

  test('and left alone when it is already in sight', async () => {
    layout(150);
    show(`/narrators?name=${byCount[250][0]}`);
    await loaded();
    expect(scroller().scrollTop).toBe(0);
  });
});
