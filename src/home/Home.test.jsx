import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { clearDailyPicksCache } from '../daily/useHomePick';
import { clearShortListCache } from '../daily/useShortList';
import { pickDaily } from '../lib/dailyPick';
import { splitHadis } from '../lib/hadisText';
import { SettingsProvider } from '../settings/SettingsProvider';
import { diskFetch, realShortList, realText } from '../test/hadisFixtures';
import { getUrl } from '../test/nextNavigation';
import Home from './Home';

const renderHome = () => render(<SettingsProvider><Home /></SettingsProvider>);

// The daily card loads its texts after the test body; let those loads finish inside act().
async function settle() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 9, 2, 10, 0));
  clearShortListCache();
  clearDailyPicksCache();
  global.fetch = vi.fn(diskFetch);
});

afterEach(async () => {
  await settle();
  vi.useRealTimers();
  delete global.fetch;
});

test('has a clear title and a search entry that opens the search page', () => {
  renderHome();
  expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('link', { name: /হাদীস খুঁজুন/ }));
  expect(getUrl().pathname).toBe('/search');
});

test('offers the three ways in, each a real link', () => {
  renderHome();
  fireEvent.click(screen.getByRole('link', { name: /বিষয়ভিত্তিক হাদীস/ }));
  expect(getUrl().pathname).toBe('/topics');
});

test('shows all six books on a bookshelf with their real hadis counts', () => {
  renderHome();
  for (const [name, count] of [['বুখারী', '৬,৭১৯'], ['মুসলিম', '৭,২৮১'], ['তিরমিযী', '৩,৬০৮'], ['আবু দাউদ', '৫,১৮৪'], ['ইবনে মাজাহ', '৪,৩৪১'], ['নাসাঈ', '৫,৭৫৩']]) {
    const spine = screen.getByRole('link', { name: new RegExp(name) });
    expect(spine).toHaveTextContent(count);
  }
});

test('a book on the shelf opens that book', () => {
  renderHome();
  fireEvent.click(screen.getByRole('link', { name: /মুসলিম/ }));
  expect(getUrl().pathname).toBe('/books/muslim');
});

test('no longer has the placeholder tile saying more is coming', () => {
  renderHome();
  expect(screen.queryByText(/আরও আসছে/)).not.toBeInTheDocument();
  expect(screen.queryByText(/শীঘ্রই আসছে/)).not.toBeInTheDocument();
});

describe('the daily hadis card', () => {
  const card = () => screen.getByRole('region', { name: 'আজকের হাদীস' });
  const today = () => pickDaily(realShortList(), new Date(2026, 9, 2, 10, 0));

  test('shows the start of today\'s hadis with its citation, and links to the daily page', async () => {
    renderHome();
    const pick = today();
    const { chain, body } = splitHadis(realText(pick.book.id, pick.number));
    const start = `${chain} ${body}`.trim().replace(/\s+/g, ' ').slice(0, 40);
    const excerpt = await within(card()).findByTestId('home-daily-text');
    expect(excerpt.textContent.replace(/\s+/g, ' ')).toContain(start);
    expect(within(card()).getByText(new RegExp(pick.book.cite))).toBeInTheDocument();
    expect(within(card()).getByText('২ অক্টোবর ২০২৬')).toBeInTheDocument();
    fireEvent.click(within(card()).getByRole('link', { name: /আরও দেখুন/ }));
    expect(getUrl().pathname).toBe('/daily');
  });

  test('is a short excerpt, not the whole text of a long one', async () => {
    renderHome();
    const excerpt = await within(card()).findByTestId('home-daily-text');
    expect(excerpt.textContent.length).toBeLessThanOrEqual(190);
  });

  const urlsFetched = () => global.fetch.mock.calls.map(([url]) => url);

  test('picks from the small precomputed file and never loads the 88 KB list', async () => {
    renderHome();
    await within(card()).findByTestId('home-daily-text');
    expect(urlsFetched()).toContain('/json/daily-picks.json');
    expect(urlsFetched()).not.toContain('/json/short-hadis.json');
  });

  test('starts the picks request as soon as the card mounts, before any other request', () => {
    renderHome();
    expect(urlsFetched()[0]).toBe('/json/daily-picks.json');
  });

  test('shows the hadis the daily page shows (the full list) when the picks file is missing', async () => {
    global.fetch = vi.fn((url) => (url.endsWith('daily-picks.json') ? Promise.resolve({ ok: false }) : diskFetch(url)));
    renderHome();
    const pick = today();
    await within(card()).findByTestId('home-daily-text');
    expect(urlsFetched()).toContain('/json/short-hadis.json');
    expect(within(card()).getByText(new RegExp(pick.book.cite))).toBeInTheDocument();
  });

  test('falls back to the full list for a date beyond the precomputed range, with the same pick as /daily', async () => {
    vi.setSystemTime(new Date(2029, 5, 15, 10, 0));
    renderHome();
    const pick = pickDaily(realShortList(), new Date(2029, 5, 15, 10, 0));
    await within(card()).findByTestId('home-daily-text');
    expect(urlsFetched()).toContain('/json/short-hadis.json');
    expect(within(card()).getByText(new RegExp(pick.book.cite))).toBeInTheDocument();
  });

  test('still offers the daily page when the list cannot be loaded', async () => {
    global.fetch = vi.fn(() => Promise.resolve({ ok: false }));
    renderHome();
    expect(await within(card()).findByText(/আজকের হাদীসটি আনা যায়নি/)).toBeInTheDocument();
    expect(within(card()).getByRole('link', { name: /আরও দেখুন/ })).toHaveAttribute('href', '/daily');
  });
});

describe('the new-features row', () => {
  const row = () => screen.getByRole('navigation', { name: 'নতুন সুবিধা' });

  test('links to the daily hadis, the plans and the khutbah sheet', () => {
    renderHome();
    expect(within(row()).getAllByRole('link').map((link) => [link.textContent, link.getAttribute('href')])).toEqual([
      ['আজকের হাদীস', '/daily'],
      ['পরিকল্পনা', '/daily?tab=plans'],
      ['খুতবার তালিকা', '/daily?tab=khutbah'],
    ]);
  });

  test('a link opens that tab', () => {
    renderHome();
    fireEvent.click(within(row()).getByRole('link', { name: 'পরিকল্পনা' }));
    expect(getUrl().pathname + getUrl().search).toBe('/daily?tab=plans');
  });
});

test('sets the home page title', () => {
  renderHome();
  expect(document.title).toBe('BoiKotha - হাদীস সম্ভার');
});

test('counts switch to English digits when chosen', () => {
  localStorage.setItem('boikotha.settings', JSON.stringify({ digits: 'en' }));
  renderHome();
  expect(screen.getByRole('link', { name: /মুসলিম/ })).toHaveTextContent('7,281');
});
