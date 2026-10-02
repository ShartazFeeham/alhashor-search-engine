/* eslint-disable testing-library/no-node-access */
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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
const moreButton = () => screen.queryByRole('button', { name: 'আরও সদৃশ হাদীস' });

beforeEach(() => {
  localStorage.clear();
  serveRealData();
});

afterEach(() => {
  clearHadisTextCache();
});

test('searches with the meaningful words of the whole text, and shows the first 5 results', async () => {
  stubSearch(buk(30));
  show();
  await screen.findByRole('region', { name: 'সদৃশ হাদীস' });
  const [words] = searchClient.search.mock.calls[0];
  expect(words.length).toBeGreaterThan(0);
  expect(words.length).toBeLessThanOrEqual(25);
  expect(words).not.toContain('বলতেন');
  expect(items()).toHaveLength(5);
  expect(screen.getByRole('link', { name: 'বুখারী ১' })).toHaveAttribute('href', '/hadis/bukhari/1');
});

test('the hadis being read is never in its own list', async () => {
  stubSearch(buk(8));
  show();
  await screen.findByRole('link', { name: 'বুখারী ১' });
  expect(screen.queryByRole('link', { name: 'নাসাঈ ৯০৩' })).not.toBeInTheDocument();
});

test('the button shows the next 5 each time: 5, 10, 15, 20, then it is gone', async () => {
  stubSearch(buk(30));
  show();
  await screen.findByRole('region', { name: 'সদৃশ হাদীস' });
  for (const shown of [10, 15, 20]) {
    fireEvent.click(moreButton());
    expect(items()).toHaveLength(shown);
  }
  expect(moreButton()).not.toBeInTheDocument();
  expect(screen.queryByRole('link', { name: 'বুখারী ২১' })).not.toBeInTheDocument(); // only the top 20 are kept
});

test('with fewer than 20 results the button goes away when all are shown', async () => {
  stubSearch(buk(8));
  show();
  await screen.findByRole('region', { name: 'সদৃশ হাদীস' });
  fireEvent.click(moreButton());
  expect(items()).toHaveLength(8);
  expect(moreButton()).not.toBeInTheDocument();
});

test('with 5 results or fewer there is no button at all', async () => {
  stubSearch(buk(5));
  show();
  await screen.findByRole('region', { name: 'সদৃশ হাদীস' });
  expect(items()).toHaveLength(5);
  expect(moreButton()).not.toBeInTheDocument();
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

test('the items are list items with the separator class, inside one card', async () => {
  stubSearch(buk(8));
  show();
  const region = await screen.findByRole('region', { name: 'সদৃশ হাদীস' });
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
