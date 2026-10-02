import { render, screen, waitFor, within } from '@testing-library/react';
import { clearRelatedCache } from '../lib/related';
import { clearHadisTextCache } from '../lib/useHadisText';
import { SettingsProvider } from '../settings/SettingsProvider';
import { serveRealData } from '../test/publicJson';
import RelatedList from './RelatedList';

// Real shard-shaped data for real hadis: Nasa'i 903 (the prayer-opening supplication) has the
// same report in Tirmidhi 243 and Ibn Majah 806, and Nasa'i 902 shares words with it.
const SHARD = {
  '903': [['TIR', 243, 's'], ['MAJ', 806, 's'], ['NAS', 902, 'w', 'اسْمُكَ جَدُّكَ']],
  '1109': [['MUS', 988, 'w', 'শুভ্রতা বগলের রাখতেন']],
};

const show = (bookId, number) =>
  render(
    <SettingsProvider>
      <RelatedList bookId={bookId} number={number} />
    </SettingsProvider>
  );

// The list row (li) that holds the link with this name.
const rowOf = (name) => screen.getAllByRole('listitem').find((row) => within(row).queryByRole('link', { name }));
const itemOf = async (name) => {
  await screen.findByRole('link', { name });
  return rowOf(name);
};

const serveShard = (shard = SHARD) =>
  serveRealData((url) =>
    url === '/json/related/NAS-9.json' || url === '/json/related/NAS-11.json'
      ? Promise.resolve({ ok: true, json: () => Promise.resolve(shard) })
      : undefined
  );

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  clearRelatedCache();
  clearHadisTextCache();
  // fetch is not deleted here: the page of a finished test may still start a late request when it unmounts
});

test('lists the related hadis under a labelled heading, as a real list', async () => {
  serveShard();
  show('nasai', 903);
  const section = await screen.findByRole('region', { name: 'এই বিষয়ে আরও হাদীস' });
  expect(within(section).getByRole('heading', { level: 2, name: 'এই বিষয়ে আরও হাদীস' })).toBeInTheDocument();
  expect(within(section).getAllByRole('listitem')).toHaveLength(3);
});

test('each item links to the hadis page with the book name and number', async () => {
  serveShard();
  show('nasai', 903);
  expect(await screen.findByRole('link', { name: 'তিরমিযী ২৪৩' })).toHaveAttribute('href', '/hadis/tirmidhi/243');
  expect(screen.getByRole('link', { name: 'ইবনে মাজাহ ৮০৬' })).toHaveAttribute('href', '/hadis/ibnmajah/806');
  expect(screen.getByRole('link', { name: 'নাসাঈ ৯০২' })).toHaveAttribute('href', '/hadis/nasai/902');
});

test('shows the saying of each hadis, without its number or narrator chain', async () => {
  serveShard();
  show('nasai', 903);
  const item = await itemOf('ইবনে মাজাহ ৮০৬');
  await waitFor(() => expect(within(item).getByText(/সালাত শুরু করে বলতেন/)).toBeInTheDocument());
  expect(within(item).queryByText(/থেকে বর্ণিত/)).not.toBeInTheDocument();
  const tirmidhi = rowOf('তিরমিযী ২৪৩');
  await waitFor(() => expect(within(tirmidhi).getByText(/সালাত শুরু করার পর বলতেন/)).toBeInTheDocument());
  expect(within(tirmidhi).queryByText(/^২৪৩/)).not.toBeInTheDocument();
});

test('a same report in another book says so, and shared words are named', async () => {
  serveShard();
  show('nasai', 903);
  const tirmidhi = await itemOf('তিরমিযী ২৪৩');
  expect(within(tirmidhi).getByText('অন্য গ্রন্থেও একই বর্ণনা')).toBeInTheDocument();
  const nasai = rowOf('নাসাঈ ৯০২');
  expect(within(nasai).getByText('মিল রয়েছে: اسْمُكَ, جَدُّكَ')).toBeInTheDocument();
});

test('no percentages anywhere', async () => {
  serveShard();
  show('nasai', 903);
  await screen.findByRole('region');
  expect(document.body.textContent).not.toMatch(/%|শতাংশ/);
});

test('shows the book badge of each item', async () => {
  serveShard();
  show('nasai', 903);
  const tirmidhi = await itemOf('তিরমিযী ২৪৩');
  expect(within(tirmidhi).getByText('তি')).toBeInTheDocument();
});

test('numbers follow the digit style', async () => {
  serveShard();
  localStorage.setItem('alhashor.settings', JSON.stringify({ digits: 'en' }));
  show('nasai', 903);
  expect(await screen.findByRole('link', { name: 'তিরমিযী 243' })).toBeInTheDocument();
});

test('renders nothing at all while loading', async () => {
  serveShard();
  const { container } = show('nasai', 903);
  expect(container).toBeEmptyDOMElement();
  await screen.findByRole('region'); // let the load finish inside the test
});

test('renders nothing when the hadis has no related ones (no heading, no gap)', async () => {
  serveShard();
  const { container } = show('nasai', 904);
  await waitFor(() => expect(global.fetch).toHaveBeenCalled());
  await new Promise((resolve) => setTimeout(resolve, 20));
  expect(container).toBeEmptyDOMElement();
});

test('renders nothing when the shard does not exist (404)', async () => {
  serveRealData();
  const { container } = show('bukhari', 63);
  await waitFor(() => expect(global.fetch).toHaveBeenCalled());
  await new Promise((resolve) => setTimeout(resolve, 20));
  expect(container).toBeEmptyDOMElement();
});

test('renders nothing after a network error', async () => {
  global.fetch = vi.fn(() => Promise.reject(new Error('offline')));
  const { container } = show('nasai', 903);
  await waitFor(() => expect(global.fetch).toHaveBeenCalled());
  await new Promise((resolve) => setTimeout(resolve, 20));
  expect(container).toBeEmptyDOMElement();
});

test('an item whose text cannot be loaded still shows its link and reason', async () => {
  serveRealData((url) => {
    if (url === '/json/related/NAS-9.json') return Promise.resolve({ ok: true, json: () => Promise.resolve({ '903': [['TIR', 243, 's']] }) });
    if (url.includes('/Tirmiji/0243/')) return Promise.reject(new Error('offline'));
    return undefined;
  });
  show('nasai', 903);
  const item = await itemOf('তিরমিযী ২৪৩');
  expect(within(item).getByText('অন্য গ্রন্থেও একই বর্ণনা')).toBeInTheDocument();
});

test('the item link has the class that stretches it over the whole row (44px tap area, see related.css)', async () => {
  serveShard();
  show('nasai', 903);
  const link = await screen.findByRole('link', { name: 'তিরমিযী ২৪৩' });
  expect(link).toHaveClass('related-link');
});
