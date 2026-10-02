import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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

test('has no lead paragraph under the heading', () => {
  renderHome();
  expect(screen.queryByText(/বাংলায় হাদীস পড়ুন ও খুঁজুন/)).not.toBeInTheDocument();
  expect(screen.queryByText(/ছয়টি প্রধান গ্রন্থ/)).not.toBeInTheDocument();
  expect(screen.queryByText(/৩২,৮৮৬/)).not.toBeInTheDocument();
});

describe('the hero', () => {
  const hero = () => screen.getByRole('region', { name: 'হাদীস সম্ভার' });
  const follows = (first, second) => Boolean(first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING);

  test('holds the eyebrow, the heading, the daily card and the search link, in that order', () => {
    renderHome();
    const eyebrow = within(hero()).getByText('আসসালামু আলাইকুম');
    const heading = within(hero()).getByRole('heading', { level: 1, name: 'হাদীস সম্ভার' });
    const card = within(hero()).getByRole('region', { name: 'আজকের হাদীস' });
    const search = within(hero()).getByRole('link', { name: /হাদীস খুঁজুন/ });
    expect(search).toHaveAttribute('href', '/search');
    expect(follows(eyebrow, heading)).toBe(true);
    expect(follows(heading, card)).toBe(true);
    expect(follows(card, search)).toBe(true);
    expect(card).not.toContainElement(search);
  });

  test('has the card nowhere else on the page: exactly one daily card', () => {
    renderHome();
    expect(screen.getAllByRole('region', { name: 'আজকের হাদীস' })).toHaveLength(1);
    expect(screen.getAllByRole('heading', { name: 'আজকের হাদীস' })).toHaveLength(1);
    expect(within(hero()).getAllByRole('region', { name: 'আজকের হাদীস' })).toHaveLength(1);
  });

  test('keeps the shelf and the quick-link row below the hero', () => {
    renderHome();
    for (const below of [
      screen.getByRole('heading', { name: 'হাদীসের তাক' }),
      screen.getByRole('navigation', { name: 'নতুন সুবিধা' }),
    ]) {
      expect(hero().contains(below)).toBe(false);
      expect(follows(hero(), below)).toBe(true);
    }
  });

  test('leaves no card and no empty gap in the hero when the daily pick cannot load', async () => {
    global.fetch = vi.fn(() => Promise.resolve({ ok: false }));
    renderHome();
    await waitFor(() => expect(screen.queryByRole('region', { name: 'আজকের হাদীস' })).not.toBeInTheDocument());
    expect(hero()).not.toHaveTextContent('আজকের হাদীস');
    const heading = within(hero()).getByRole('heading', { level: 1 });
    const search = within(hero()).getByRole('link', { name: /হাদীস খুঁজুন/ });
    expect(follows(heading, search)).toBe(true);
    expect(within(hero()).queryAllByRole('region')).toHaveLength(0);
  });
});

test('has no tiles block and no "হাদীসের বই" tile: the shelf is the way to the books', () => {
  renderHome();
  const main = screen.getByRole('main');
  expect(within(main).queryByRole('link', { name: /হাদীসের বই/ })).not.toBeInTheDocument();
  expect(within(main).queryByText(/শুরু থেকে শেষ/)).not.toBeInTheDocument();
  expect(within(main).getAllByRole('link').filter((link) => link.getAttribute('href') === '/books')).toHaveLength(0);
  expect(within(main).getAllByRole('link').filter((link) => link.getAttribute('href').startsWith('/books/'))).toHaveLength(6);
});

test('has no search tile: the search bar in the top block is the only way to /search', () => {
  renderHome();
  expect(screen.queryByRole('link', { name: /^সার্চ/ })).not.toBeInTheDocument();
  expect(screen.queryByText('শব্দ, বাক্য, নম্বর বা বর্ণনাকারীর নাম দিয়ে খুঁজুন', { exact: true })).not.toBeInTheDocument();
  const toSearch = screen.getAllByRole('link').filter((link) => link.getAttribute('href') === '/search');
  expect(toSearch).toHaveLength(1);
  expect(toSearch[0]).toHaveTextContent(/হাদীস খুঁজুন/);
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
  const flat = (text) => text.replace(/\s+/g, ' ');

  test('shows the citation above the start of today\'s hadis, without its number', async () => {
    renderHome();
    const pick = today();
    const { chain, body } = splitHadis(realText(pick.book.id, pick.number));
    const whole = flat(`${chain} ${body}`.trim());
    const excerpt = await screen.findByTestId('home-daily-text');
    expect(flat(excerpt.textContent).slice(0, 40)).toBe(whole.slice(0, 40));
    expect(excerpt.textContent).not.toMatch(/^\s*[০-৯0-9]/);
    const cite = within(card()).getByText(new RegExp(pick.book.cite));
    expect(cite).toHaveTextContent(/হাদীস নং/);
    expect(cite.compareDocumentPosition(excerpt) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(within(card()).getByText('২ অক্টোবর ২০২৬')).toBeInTheDocument();
  });

  test('cuts a long real hadis at a word with an ellipsis', async () => {
    renderHome();
    const pick = today();
    const { chain, body } = splitHadis(realText(pick.book.id, pick.number));
    const whole = flat(`${chain} ${body}`.trim());
    const excerpt = flat((await screen.findByTestId('home-daily-text')).textContent);
    expect(whole.length).toBeGreaterThan(excerpt.length);
    expect(excerpt.endsWith('…')).toBe(true);
    expect(excerpt.length).toBeLessThanOrEqual(110);
    const kept = excerpt.slice(0, -1);
    expect(whole.startsWith(kept)).toBe(true);
    expect(whole[kept.length]).toBe(' ');
  });

  test('has a quiet "আরও দেখুন" link to the full hadis page', async () => {
    renderHome();
    const pick = today();
    await screen.findByTestId('home-daily-text');
    const link = within(card()).getByRole('link', { name: 'আরও দেখুন' });
    expect(link).toHaveAttribute('href', `/hadis/${pick.book.id}/${pick.number}`);
    expect(link).toHaveClass('home-daily-more');
    expect(link).toContainHTML('<svg');
    expect(within(card()).queryByRole('button')).not.toBeInTheDocument();
    fireEvent.click(link);
    expect(getUrl().pathname).toBe(`/hadis/${pick.book.id}/${pick.number}`);
  });

  const urlsFetched = () => global.fetch.mock.calls.map(([url]) => url);

  test('picks from the small precomputed file and never loads the 88 KB list', async () => {
    renderHome();
    await screen.findByTestId('home-daily-text');
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
    await screen.findByTestId('home-daily-text');
    expect(urlsFetched()).toContain('/json/short-hadis.json');
    expect(within(card()).getByText(new RegExp(pick.book.cite))).toBeInTheDocument();
  });

  test('falls back to the full list for a date beyond the precomputed range, with the same pick as /daily', async () => {
    vi.setSystemTime(new Date(2029, 5, 15, 10, 0));
    renderHome();
    const pick = pickDaily(realShortList(), new Date(2029, 5, 15, 10, 0));
    await screen.findByTestId('home-daily-text');
    expect(urlsFetched()).toContain('/json/short-hadis.json');
    expect(within(card()).getByText(new RegExp(pick.book.cite))).toBeInTheDocument();
  });
});

describe('the new-features row', () => {
  const row = () => screen.getByRole('navigation', { name: 'নতুন সুবিধা' });

  test('has exactly four cards: topics first, then the daily hadis, the plans and the khutbah sheet', () => {
    renderHome();
    expect(within(row()).getAllByRole('link').map((link) => [link.textContent, link.getAttribute('href')])).toEqual([
      ['বিষয়ভিত্তিক হাদীস', '/topics'],
      ['আজকের হাদীস', '/daily'],
      ['পরিকল্পনা', '/daily?tab=plans'],
      ['খুতবার তালিকা', '/daily?tab=khutbah'],
    ]);
  });

  test('the topics card opens /topics', () => {
    renderHome();
    fireEvent.click(within(row()).getByRole('link', { name: 'বিষয়ভিত্তিক হাদীস' }));
    expect(getUrl().pathname).toBe('/topics');
    expect(screen.getAllByRole('link', { name: /বিষয়ভিত্তিক হাদীস/ })).toHaveLength(1);
  });

  test('the cards sit between the shelf and the end of the page', () => {
    renderHome();
    const shelf = screen.getByRole('heading', { name: 'হাদীসের তাক' });
    expect(shelf.compareDocumentPosition(row()) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  test('a link opens that tab', () => {
    renderHome();
    fireEvent.click(within(row()).getByRole('link', { name: 'পরিকল্পনা' }));
    expect(getUrl().pathname + getUrl().search).toBe('/daily?tab=plans');
  });
});

test('sets the home page title', () => {
  renderHome();
  expect(document.title).toBe('Alhashor - হাদীস সম্ভার');
});

test('counts switch to English digits when chosen', () => {
  localStorage.setItem('alhashor.settings', JSON.stringify({ digits: 'en' }));
  renderHome();
  expect(screen.getByRole('link', { name: /মুসলিম/ })).toHaveTextContent('7,281');
});
