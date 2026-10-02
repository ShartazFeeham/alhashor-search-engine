import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import HadisArticle from '../hadis/HadisArticle';
import HadisCard from '../hadis/HadisCard';
import { buildMatcher } from '../lib/matchPattern';
import ResultItem from '../search/ResultItem';
import { SettingsProvider } from '../settings/SettingsProvider';
import { diskFetch, realText } from '../test/hadisFixtures';
import { ToastProvider } from '../ui/Toast';
import CompareBar from './CompareBar';
import { CompareProvider } from './CompareProvider';

// The "add to compare" button wherever a hadis is shown, working with the real providers.
const wrap = (ui) =>
  render(
    <SettingsProvider>
      <ToastProvider>
        <CompareProvider>
          {ui}
          <CompareBar />
        </CompareProvider>
      </ToastProvider>
    </SettingsProvider>
  );

beforeEach(() => {
  sessionStorage.clear();
  global.fetch = vi.fn(diskFetch);
});
afterEach(() => {
  delete global.fetch;
});

const book = { id: 'bukhari', full: 'বুখারী শরীফ', cite: 'সহীহ বুখারী' };

test('the hadis page has a pill that adds the hadis to the comparison and shows the bar', () => {
  wrap(<HadisArticle book={book} number={1} text={realText('bukhari', 1)} />);
  fireEvent.click(screen.getByRole('button', { name: 'তুলনায় যোগ করুন', pressed: false }));
  expect(screen.getByRole('button', { name: 'তুলনা থেকে সরান', pressed: true })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /তুলনা \(১\)/ })).toHaveAttribute('href', '/compare?ids=bukhari-1');
});

test('the hadis card has the toggle as a quiet icon button once its text has loaded', async () => {
  wrap(<HadisCard bookId="muslim" number={4774} />);
  const button = await screen.findByRole('button', { name: 'তুলনায় যোগ করুন' });
  fireEvent.click(button);
  expect(button).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('link', { name: /তুলনা \(১\)/ })).toHaveAttribute('href', '/compare?ids=muslim-4774');
});

test('a search result has a quiet text toggle', async () => {
  wrap(
    <ul>
      <ResultItem tag="MAJ-4227" matcher={buildMatcher(['হিজরত'])} />
    </ul>
  );
  const button = await screen.findByRole('button', { name: 'তুলনায় যোগ করুন' });
  fireEvent.click(button);
  await waitFor(() => expect(screen.getByRole('button', { name: 'তুলনা থেকে সরান' })).toHaveAttribute('aria-pressed', 'true'));
});
