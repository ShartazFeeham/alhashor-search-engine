/* eslint-disable testing-library/no-node-access */
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { clearHadisTextCache } from '../lib/useHadisText';
import { searchClient } from '../search/searchClient';
import { SettingsProvider } from '../settings/SettingsProvider';
import { getHistory, getUrl } from '../test/nextNavigation';
import { normalizeBengali } from '../Helpers/bengali';
import { splitHadis } from '../lib/hadisText';
import { realText } from '../test/hadisFixtures';
import { serveRealData } from '../test/publicJson';
import RelatedList from './RelatedList';

vi.mock('../search/searchClient', () => ({ searchClient: { search: vi.fn() } }));

// The hadis being read: Nasa'i 903 (the prayer-opening supplication). The stubbed search answers
// with real Bukhari 1..N and Nasa'i 903 itself, in a fixed order, so the flow is deterministic.
const TEXT = realText('nasai', 903);
const stubSearch = (tags) => {
  searchClient.search.mockImplementation(() => ({ promise: Promise.resolve(tags), cancel: vi.fn() }));
};
const buk = (count, withSelf = true) => {
  const tags = Array.from({ length: count }, (_, i) => `BUK-${i + 1}`);
  return withSelf ? ['NAS-903', ...tags] : tags;
};
const show = (number = 903, text = TEXT) =>
  render(
    <SettingsProvider>
      <RelatedList bookId="nasai" number={number} text={text} />
    </SettingsProvider>
  );
const items = () => within(screen.getByRole('region', { name: 'সদৃশ হাদীস' })).getAllByRole('listitem');
// The list row (li) that holds the link with this name.
const rowOf = (name) => screen.getAllByRole('listitem').find((row) => within(row).queryByRole('link', { name }));
const loader = () => screen.queryByTestId('related-loader');

// The end of the list coming into view is played by hand.
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
const reachEnd = async () => {
  await waitFor(() => expect(observers.some((o) => o.targets.size > 0)).toBe(true));
  await act(async () => {
    observers.filter((o) => o.targets.size > 0).forEach((o) => o.callback([...o.targets].map((target) => ({ target, isIntersecting: true }))));
  });
};

beforeEach(() => {
  localStorage.clear();
  serveRealData();
  observers = [];
  window.IntersectionObserver = FakeObserver;
});

afterEach(() => {
  clearHadisTextCache();
  delete window.IntersectionObserver;
});

test('searches with the meaningful words of the whole text, and shows the first 5 results', async () => {
  stubSearch(buk(30));
  show();
  await screen.findByRole('region', { name: 'সদৃশ হাদীস' });
  await screen.findAllByRole('listitem');
  const [words] = searchClient.search.mock.calls[0];
  expect(words.length).toBeGreaterThan(0);
  expect(words.length).toBeLessThanOrEqual(25);
  expect(words).not.toContain('বলতেন');
  expect(items()).toHaveLength(5);
  // the first 5 of the (reordered) top 20: any of them links to its own hadis page
  for (const row of items()) {
    const link = within(row).getAllByRole('link')[0];
    expect(link).toHaveAttribute('href', expect.stringMatching(/^\/hadis\/bukhari\/\d+$/));
  }
});

test('the hadis being read is never in its own list', async () => {
  stubSearch(buk(8));
  show();
  await screen.findByRole('link', { name: 'বুখারী ১' });
  expect(screen.queryByRole('link', { name: 'নাসাঈ ৯০৩' })).not.toBeInTheDocument();
});

test('there is no "show more" button: the next 5 load when the end of the list comes into view, 5, 10, 15, 20, then the loader is gone', async () => {
  stubSearch(buk(30));
  show();
  await screen.findByRole('region', { name: 'সদৃশ হাদীস' });
  expect(screen.queryByRole('button', { name: /আরও/ })).not.toBeInTheDocument();
  expect(screen.queryByRole('button')).not.toBeInTheDocument();
  for (const shown of [10, 15, 20]) {
    expect(loader()).toBeInTheDocument();
    await reachEnd();
    expect(items()).toHaveLength(shown);
  }
  expect(loader()).not.toBeInTheDocument();
  expect(screen.queryByRole('link', { name: 'বুখারী ২১' })).not.toBeInTheDocument(); // only the top 20 are kept
});

test('the loader is a small spinner row after the list, announced politely, and it is what the observer watches', async () => {
  stubSearch(buk(30));
  show();
  await screen.findByRole('region', { name: 'সদৃশ হাদীস' });
  const row = loader();
  expect(row).toHaveClass('related-loader');
  expect(row).toHaveAttribute('role', 'status');
  expect(row.querySelector('.related-spinner')).not.toBeNull();
  expect(row.compareDocumentPosition(screen.getByRole('list')) & Node.DOCUMENT_POSITION_PRECEDING).toBeTruthy(); // after the list
  await waitFor(() => expect(observers.some((o) => o.targets.has(row))).toBe(true));
});

test('with fewer than 20 results the loader goes away when all are shown', async () => {
  stubSearch(buk(8));
  show();
  await screen.findByRole('region', { name: 'সদৃশ হাদীস' });
  await reachEnd();
  expect(items()).toHaveLength(8);
  expect(loader()).not.toBeInTheDocument();
});

test('with 5 results or fewer there is no loader and nothing is watched', async () => {
  stubSearch(buk(5));
  show();
  await screen.findByRole('region', { name: 'সদৃশ হাদীস' });
  await screen.findAllByRole('listitem');
  expect(items()).toHaveLength(5);
  expect(loader()).not.toBeInTheDocument();
  expect(observers.every((o) => o.targets.size === 0)).toBe(true);
});

test('without IntersectionObserver every kept result is shown at once, and there is no loader', async () => {
  delete window.IntersectionObserver;
  stubSearch(buk(30));
  show();
  await screen.findByRole('region', { name: 'সদৃশ হাদীস' });
  await screen.findAllByRole('listitem');
  expect(items()).toHaveLength(20);
  expect(loader()).not.toBeInTheDocument();
});

test('a new hadis starts again from the first 5', async () => {
  stubSearch(buk(30));
  const { rerender } = show();
  await screen.findByRole('region', { name: 'সদৃশ হাদীস' });
  await reachEnd();
  expect(items()).toHaveLength(10);
  rerender(
    <SettingsProvider>
      <RelatedList bookId="nasai" number={904} text={realText('nasai', 904)} />
    </SettingsProvider>
  );
  await waitFor(() => expect(items()).toHaveLength(5));
});

test('the texts of results 6 to 20 are fetched in the background, right after the first 5 show', async () => {
  stubSearch(buk(30));
  show();
  await screen.findByRole('region', { name: 'সদৃশ হাদীস' });
  await waitFor(() => {
    const asked = global.fetch.mock.calls.map((call) => String(call[0]));
    expect(asked.some((url) => url.includes('/Bukhari/0020/'))).toBe(true);
  });
  const asked = global.fetch.mock.calls.map((call) => String(call[0]));
  expect(asked.some((url) => url.includes('/Bukhari/0021/'))).toBe(false);
});

test('each item has the book badge, a link, the saying and the number of shared words', async () => {
  stubSearch(['TIR-243']);
  show();
  const link = await screen.findByRole('link', { name: 'তিরমিযী ২৪৩' });
  expect(link).toHaveAttribute('href', '/hadis/tirmidhi/243');
  const item = rowOf('তিরমিযী ২৪৩');
  expect(within(item).getByText('তি')).toBeInTheDocument();
  await waitFor(() => expect(item.querySelector('.related-text')).toHaveTextContent(/সালাত শুরু করার পর বলতেন/));
  expect(within(item).getByText(/^[০-৯]+ টি শব্দ মিলেছে$/)).toBeInTheDocument();
  expect(within(item).queryByText(/%/)).not.toBeInTheDocument();
});

test('the word count is on the right of the same row as the book and the number (not under the text)', async () => {
  stubSearch(['TIR-243']);
  show();
  const link = await screen.findByRole('link', { name: 'তিরমিযী ২৪৩' });
  const item = rowOf('তিরমিযী ২৪৩');
  const count = await within(item).findByText(/^[০-৯]+ টি শব্দ মিলেছে$/);
  const head = link.parentElement;
  expect(head).toHaveClass('related-head');
  expect(head).toContainElement(count);
  expect(link.compareDocumentPosition(count) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy(); // link first, count after it
  expect(head.children).toHaveLength(2);
  // and the text comes after that row
  await waitFor(() => expect(item.querySelector('.related-text')).not.toBeNull());
  expect(head.compareDocumentPosition(item.querySelector('.related-text')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});

test('the items are list items with the separator class, inside one card', async () => {
  stubSearch(buk(8));
  show();
  const region = await screen.findByRole('region', { name: 'সদৃশ হাদীস' });
  await screen.findAllByRole('listitem');
  expect(region).toHaveClass('hadis-card');
  for (const item of items()) expect(item).toHaveClass('related-item');
});

test('a plain click on the text or an empty part opens the hadis; a selection or a link click does not add one', async () => {
  stubSearch(['TIR-243']);
  show();
  await screen.findByRole('link', { name: 'তিরমিযী ২৪৩' });
  const item = rowOf('তিরমিযী ২৪৩');
  await waitFor(() => expect(item.querySelector('.related-text')).not.toBeNull());
  const text = item.querySelector('.related-text');

  vi.spyOn(window, 'getSelection').mockReturnValue({ toString: () => 'সালাত' });
  fireEvent.click(text);
  expect(getUrl().pathname).toBe('/');

  window.getSelection.mockReturnValue({ toString: () => '' });
  fireEvent.click(text);
  expect(getUrl().pathname).toBe('/hadis/tirmidhi/243');
});

test('a click on the title link is left to the link itself (no second navigation)', async () => {
  stubSearch(['TIR-243']);
  show();
  const link = await screen.findByRole('link', { name: 'তিরমিযী ২৪৩' });
  fireEvent.click(link);
  expect(getUrl().pathname).toBe('/hadis/tirmidhi/243');
  expect(getHistory()).toHaveLength(1); // the link navigated once; the item's click handler stayed out
});

test('while searching a quiet line says so', async () => {
  searchClient.search.mockImplementation(() => ({ promise: new Promise(() => {}), cancel: vi.fn() }));
  show();
  expect(screen.getByText('খুঁজছি...')).toBeInTheDocument();
});

test('renders nothing at all when there are no similar hadis (no heading, no gap)', async () => {
  stubSearch(['NAS-903']);
  const { container } = show();
  await waitFor(() => expect(searchClient.search).toHaveBeenCalled());
  await waitFor(() => expect(container).toBeEmptyDOMElement());
});

test('renders nothing when the text has no searchable word', async () => {
  stubSearch(buk(8));
  const { container } = show(903, '১২৩ এবং তিনি');
  await waitFor(() => expect(container).toBeEmptyDOMElement());
  expect(searchClient.search).not.toHaveBeenCalled();
});

test('a failed search shows a quiet error line and no list', async () => {
  searchClient.search.mockImplementation(() => ({ promise: Promise.reject(new Error('worker')), cancel: vi.fn() }));
  show();
  expect(await screen.findByText('সদৃশ হাদীস আনা যায়নি।')).toBeInTheDocument();
  expect(screen.queryByRole('listitem')).not.toBeInTheDocument();
});

test('numbers follow the digit style', async () => {
  stubSearch(['TIR-243']);
  localStorage.setItem('alhashor.settings', JSON.stringify({ digits: 'en' }));
  show();
  expect(await screen.findByRole('link', { name: 'তিরমিযী 243' })).toBeInTheDocument();
});

test('a new hadis searches again and the old results are not shown for it', async () => {
  stubSearch(buk(8));
  const { rerender } = show();
  await screen.findByRole('link', { name: 'বুখারী ১' });
  stubSearch(['TIR-243']);
  rerender(
    <SettingsProvider>
      <RelatedList bookId="nasai" number={904} text={realText('nasai', 904)} />
    </SettingsProvider>
  );
  await screen.findByRole('link', { name: 'তিরমিযী ২৪৩' });
  expect(screen.queryByRole('link', { name: 'বুখারী ১' })).not.toBeInTheDocument();
});

test('the words a similar hadis shares with the page are bold (strong), the text itself is unchanged', async () => {
  stubSearch(['TIR-243']);
  show();
  await screen.findByRole('link', { name: 'তিরমিযী ২৪৩' });
  const item = rowOf('তিরমিযী ২৪৩');
  await waitFor(() => expect(item.querySelector('.related-text')).not.toBeNull());
  const [words] = searchClient.search.mock.calls[0];
  const matches = [...item.querySelectorAll('.related-text strong.related-match')];
  expect(matches.length).toBeGreaterThan(0);
  // each bold word is a whole word that contains a searched word
  for (const match of matches) {
    expect(words.some((word) => normalizeBengali(match.textContent).includes(word))).toBe(true);
    expect(match.textContent).not.toMatch(/\s/);
  }
  const saying = splitHadis(realText('tirmidhi', 243)).body || realText('tirmidhi', 243);
  expect(item.querySelector('.related-text').textContent).toBe(saying);
  expect(item.querySelector('.related-text mark')).toBeNull();
});

test('the bold words count as many words as the hadis shares with the page (at most)', async () => {
  stubSearch(['TIR-243']);
  show();
  await screen.findByRole('link', { name: 'তিরমিযী ২৪৩' });
  const item = rowOf('তিরমিযী ২৪৩');
  await waitFor(() => expect(item.querySelector('.related-text strong')).not.toBeNull());
  const shared = Number(/^([০-৯]+)/.exec(within(item).getByText(/টি শব্দ মিলেছে/).textContent)[0].replace(/[০-৯]/g, (d) => '০১২৩৪৫৬৭৮৯'.indexOf(d)));
  expect(item.querySelectorAll('.related-text strong').length).toBeGreaterThan(0);
  expect(shared).toBeGreaterThan(0);
});

test('hadis with the same number of shared words are listed shortest first; more shared words still come first', async () => {
  stubSearch(buk(12, false));
  show();
  await screen.findByRole('region', { name: 'সদৃশ হাদীস' });
  await screen.findAllByRole('listitem');
  const [words] = searchClient.search.mock.calls[0];
  const names = items().map((row) => within(row).getAllByRole('link')[0].textContent);
  const digit = (n) => String(n).replace(/\d/g, (d) => '০১২৩৪৫৬৭৮৯'[d]);
  const rows = Array.from({ length: 12 }, (_, i) => {
    const text = realText('bukhari', i + 1);
    return { name: `বুখারী ${digit(i + 1)}`, matched: words.filter((w) => normalizeBengali(text).includes(w)).length, length: text.length };
  });
  const expected = rows.sort((a, b) => b.matched - a.matched || a.length - b.length).slice(0, 5).map((row) => row.name);
  expect(names).toEqual(expected);
});
