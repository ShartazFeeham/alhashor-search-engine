import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { SettingsProvider } from '../settings/SettingsProvider';
import { ToastProvider } from '../ui/Toast';
import HadisCard from './HadisCard';

const SHORT = '১২। উবায়দুল্লাহ (রহঃ) ... আনাস (রাঃ) থেকে বর্ণিত। তিনি বলেন, সৎকাজ করো।';
const LONG = '৫। রাবী (রহঃ) থেকে বর্ণিত। ' + 'শব্দ '.repeat(400);

function serve(map) {
  global.fetch = vi.fn((url) =>
    url in map
      ? Promise.resolve({ ok: true, json: () => Promise.resolve(map[url]) })
      : Promise.resolve({ ok: false, status: 404 })
  );
}

const show = (bookId, number) =>
  render(
    <SettingsProvider>
      <ToastProvider>
        <HadisCard bookId={bookId} number={number} />
      </ToastProvider>
    </SettingsProvider>
  );

beforeEach(() => {
  Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue() } });
});

test('shows the book and number, then the text without its leading number', async () => {
  serve({ '/json/hadis/Muslim/0012/text.txt': SHORT });
  show('muslim', 12);
  expect(screen.getByRole('heading', { name: 'মুসলিম শরীফ - হাদীস নং ১২' })).toBeInTheDocument();
  expect(await screen.findByText(/সৎকাজ করো/)).toBeInTheDocument();
  expect(screen.queryByText(/^১২।/)).not.toBeInTheDocument();
});

test('shows a placeholder while the text loads', async () => {
  serve({});
  show('muslim', 12);
  expect(screen.getByLabelText('লোড হচ্ছে')).toBeInTheDocument();
  await screen.findByText('এই হাদীসটি পাওয়া যায়নি।'); // let the load settle
});

test('a long hadis is cut with a link to the full page', async () => {
  serve({ '/json/hadis/Bukhari/0005/text.txt': LONG });
  show('bukhari', 5);
  const link = await screen.findByRole('link', { name: 'সম্পূর্ণ হাদীস দেখুন...' });
  expect(link).toHaveAttribute('href', '/hadis/bukhari/5');
  expect(screen.getByText(/শব্দ/).textContent.length).toBeLessThan(700);
});

test('a short hadis has no "full hadis" link', async () => {
  serve({ '/json/hadis/Muslim/0012/text.txt': SHORT });
  show('muslim', 12);
  await screen.findByText(/সৎকাজ করো/);
  expect(screen.queryByRole('link', { name: 'সম্পূর্ণ হাদীস দেখুন...' })).not.toBeInTheDocument();
});

test('the heading links to the hadis page', async () => {
  serve({ '/json/hadis/Muslim/0012/text.txt': SHORT });
  show('muslim', 12);
  await screen.findByText(/সৎকাজ করো/);
  expect(screen.getByRole('link', { name: 'মুসলিম শরীফ - হাদীস নং ১২' })).toHaveAttribute('href', '/hadis/muslim/12');
});

test('copy puts the whole text on the clipboard and says so', async () => {
  serve({ '/json/hadis/Muslim/0012/text.txt': SHORT });
  show('muslim', 12);
  await screen.findByText(/সৎকাজ করো/);
  fireEvent.click(screen.getByRole('button', { name: /কপি/ }));
  await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalledWith(SHORT));
  expect(await screen.findByText('কপি করা হয়েছে')).toBeInTheDocument();
});

test('a number with no file says so', async () => {
  serve({});
  show('bukhari', 63);
  expect(await screen.findByText('এই হাদীসটি পাওয়া যায়নি।')).toBeInTheDocument();
});

test('a network failure offers another try', async () => {
  global.fetch = vi.fn(() => Promise.reject(new Error('offline')));
  show('muslim', 12);
  expect(await screen.findByText(/আনা যায়নি/)).toBeInTheDocument();
  global.fetch = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve(SHORT) }));
  fireEvent.click(screen.getByRole('button', { name: 'আবার চেষ্টা করুন' }));
  expect(await screen.findByText(/সৎকাজ করো/)).toBeInTheDocument();
});
