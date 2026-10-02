import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { renderToStaticMarkup as toMarkup } from 'react-dom/server';
import { clearHadisTextCache } from '../lib/useHadisText';
import { searchClient } from '../search/searchClient';
import { SettingsProvider } from '../settings/SettingsProvider';
import { ToastProvider } from '../ui/Toast';
import { realText } from '../test/hadisFixtures';
import { serveRealData } from '../test/publicJson';
import HadisPage from './HadisPage';

vi.mock('../search/searchClient', () => ({ searchClient: { search: vi.fn() } }));

const wrap = (page) => (
  <SettingsProvider>
    <ToastProvider>{page}</ToastProvider>
  </SettingsProvider>
);
const show = (bookId, number) => render(wrap(<HadisPage bookId={bookId} number={number} />));
// The server markup of the page (the similar list is already there, in its searching state).
const markup = (initialText) => toMarkup(wrap(<HadisPage bookId="bukhari" number={1} initialText={initialText} />));

beforeEach(() => {
  localStorage.clear();
  serveRealData();
  searchClient.search.mockImplementation(() => ({
    promise: Promise.resolve(['BUK-2', 'BUK-3', 'BUK-4', 'BUK-5', 'BUK-6', 'BUK-7']),
    cancel: vi.fn(),
  }));
});

afterEach(() => {
  clearHadisTextCache();
});

test('every block of the page is a card of its own, in reading order', () => {
  const html = markup(realText('bukhari', 1));
  const order = ['hadis-head hadis-card', 'hadis-chain hadis-card', 'hadis-reading hadis-card', 'hadis-actions hadis-card', 'hadis-pn hadis-card', 'related hadis-card'];
  const at = order.map((name) => html.indexOf(`class="${name}`));
  expect(at.every((index) => index >= 0)).toBe(true);
  expect([...at].sort((a, b) => a - b)).toEqual(at);
  expect(html.match(/hadis-card/g)).toHaveLength(order.length);
});

test('the header card holds the breadcrumb and the title; the reading card holds the progress and the text', () => {
  const html = markup(realText('bukhari', 1));
  expect(html).toMatch(/class="hadis-head hadis-card"><nav class="hadis-crumbs"[\s\S]*<h1>[\s\S]*<\/header>/);
  expect(html).toMatch(/class="hadis-reading hadis-card"><div class="hadis-progress"[\s\S]*<p class="hadis-read">/);
});

test('the previous/next block and the similar list carry the card class', async () => {
  show('bukhari', 1);
  expect(await screen.findByRole('region', { name: 'সদৃশ হাদীস' })).toHaveClass('hadis-card');
  expect(screen.getByRole('navigation', { name: 'আগের ও পরের হাদীস' })).toHaveClass('hadis-card');
});

test('the loading, missing and error states are cards too', () => {
  expect(toMarkup(wrap(<HadisPage bookId="bukhari" number={1} />))).toMatch(/hadis-skeleton hadis-card/);
  const missing = toMarkup(wrap(<HadisPage bookId="bukhari" number={63} initialText={null} />));
  expect(missing).toMatch(/hadis-message hadis-card/);
  expect(missing).toMatch(/<div class="hadis-card"><nav class="hadis-crumbs"/);
});

test('there is no permanent-link line, but the link copy button stays', async () => {
  const html = markup(realText('bukhari', 1));
  expect(html).not.toContain('hadis-permalink');
  expect(html).not.toContain('স্থায়ী লিংক');
  show('bukhari', 1);
  await screen.findByRole('button', { name: 'লিংক কপি' });
  expect(screen.queryByText(/স্থায়ী লিংক/)).not.toBeInTheDocument();
  expect(document.body).not.toHaveTextContent('/hadis/bukhari/1');
});

test('the actions row has no next-hadis button; the only next link is in the bottom block', async () => {
  show('bukhari', 1);
  await screen.findByRole('button', { name: 'কপি' });
  expect(screen.queryByRole('link', { name: /পরের হাদীস/ })).not.toBeInTheDocument();
  const nextLinks = screen.getAllByRole('link', { name: /পরের/ });
  expect(nextLinks).toHaveLength(1);
  expect(nextLinks[0]).toHaveAttribute('href', '/hadis/bukhari/2');
});

test('the similar hadis are searched with the page text and load more on the button', async () => {
  show('bukhari', 1);
  const region = await screen.findByRole('region', { name: 'সদৃশ হাদীস' });
  await waitFor(() => expect(searchClient.search).toHaveBeenCalled());
  expect(within(region).getAllByRole('listitem')).toHaveLength(5);
  fireEvent.click(within(region).getByRole('button', { name: 'আরও সদৃশ হাদীস' }));
  expect(within(region).getAllByRole('listitem')).toHaveLength(6);
  expect(within(region).queryByRole('button', { name: 'আরও সদৃশ হাদীস' })).not.toBeInTheDocument();
});
