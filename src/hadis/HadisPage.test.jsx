import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { SettingsProvider } from '../settings/SettingsProvider';
import { ToastProvider } from '../ui/Toast';
import { getUrl } from '../test/nextNavigation';
import HadisPage from './HadisPage';

const BUKHARI_6628 = '৬৬২৮। আদম ইবনু আবূ ইয়াস (রহঃ) ... হুযায়ফা ইবনুু-ইয়ামান (রাঃ) থেকে বর্ণিত। তিনি বলেন, বর্তমান যুগের মুনাফিকরা নবী সাল্লাল্লাহু আলাইহি ওয়াসাল্লাম এর যুগের মুনাফিকদের চাইতেও জঘন্য।';

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
        <HadisPage bookId={bookId} number={number} />
      </ToastProvider>
    </SettingsProvider>
  );

beforeEach(() => {
  localStorage.clear();
  Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue() } });
});

afterEach(() => {
  delete global.fetch;
});

test('shows the book, the number, the saying first and the chain folded', async () => {
  serve({ '/json/hadis/Bukhari/6628/text.txt': BUKHARI_6628 });
  show('bukhari', 6628);
  expect(await screen.findByRole('heading', { level: 1, name: /বুখারী শরীফ - হাদীস নং ৬,৬২৮/ })).toBeInTheDocument();
  expect(screen.getByText(/তিনি বলেন, বর্তমান যুগের/)).toBeInTheDocument();
  const toggle = screen.getByRole('button', { name: /বর্ণনায়/ });
  expect(toggle).toHaveAttribute('aria-expanded', 'false');
  expect(screen.queryByText(/থেকে বর্ণিত।$/)).not.toBeInTheDocument();
  fireEvent.click(toggle);
  expect(toggle).toHaveAttribute('aria-expanded', 'true');
  expect(screen.getByText(/ইয়ামান \(রাঃ\) থেকে বর্ণিত।/)).toBeInTheDocument();
});

test('a hadis with no recognisable chain shows its whole text and no fold (Review Focus 3)', async () => {
  serve({ '/json/hadis/Muslim/0005/text.txt': 'রাসূলুল্লাহ সাল্লাল্লাহু আলাইহি ওয়াসাল্লাম বলেছেন, সত্য কথা বলো।' });
  show('muslim', 5);
  expect(await screen.findByText(/সত্য কথা বলো/)).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /বর্ণনায়/ })).not.toBeInTheDocument();
});

test('has a breadcrumb with a link to the book and the home page', async () => {
  serve({ '/json/hadis/Bukhari/6628/text.txt': BUKHARI_6628 });
  show('bukhari', 6628);
  await screen.findByRole('heading', { level: 1 });
  const crumbs = screen.getByRole('navigation', { name: 'পথ' });
  expect(crumbs).toHaveTextContent('হোম');
  expect(crumbs).toHaveTextContent('বুখারী শরীফ');
  fireEvent.click(screen.getByRole('link', { name: 'বুখারী শরীফ' }));
  // the book's own page, at the page this hadis is on, pointing at it
  expect(getUrl().pathname).toBe('/books/bukhari');
  expect(getUrl().search).toMatch(/^\?page=\d+&hadis=6628$/);
});

test('shows reading time and the word count', async () => {
  serve({ '/json/hadis/Bukhari/6628/text.txt': BUKHARI_6628 });
  show('bukhari', 6628);
  expect(await screen.findByText(/আধা মিনিটেরও কম/)).toBeInTheDocument();
  expect(screen.getByRole('progressbar', { name: 'পড়ার অগ্রগতি' })).toBeInTheDocument();
});

test('copy, copy citation and copy link put the right text on the clipboard', async () => {
  serve({ '/json/hadis/Bukhari/6628/text.txt': BUKHARI_6628 });
  show('bukhari', 6628);
  await screen.findByRole('heading', { level: 1 });

  fireEvent.click(screen.getByRole('button', { name: 'কপি' }));
  expect(navigator.clipboard.writeText).toHaveBeenLastCalledWith(BUKHARI_6628);

  fireEvent.click(screen.getByRole('button', { name: 'উদ্ধৃতি কপি' }));
  expect(navigator.clipboard.writeText).toHaveBeenLastCalledWith('সহীহ বুখারী, হাদীস নং ৬,৬২৮');

  fireEvent.click(screen.getByRole('button', { name: 'লিংক কপি' }));
  expect(navigator.clipboard.writeText).toHaveBeenLastCalledWith(`${window.location.origin}/hadis/bukhari/6628`);
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('কপি করা হয়েছে'));
});

test('a number with no data file says so and still offers previous and next (Review Focus 2)', async () => {
  serve({});
  show('bukhari', 63);
  expect(await screen.findByText(/এই হাদীসটি পাওয়া যায়নি/)).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /আগের/ })).toHaveAttribute('href', '/hadis/bukhari/62');
  expect(screen.getByRole('link', { name: /পরের/ })).toHaveAttribute('href', '/hadis/bukhari/64');
});

test('a network failure offers a retry instead of a spinner', async () => {
  global.fetch = vi.fn(() => Promise.reject(new Error('offline')));
  show('bukhari', 10);
  expect(await screen.findByRole('button', { name: 'আবার চেষ্টা করুন' })).toBeInTheDocument();
});

test('sets the page title', async () => {
  serve({ '/json/hadis/Bukhari/6628/text.txt': BUKHARI_6628 });
  show('bukhari', 6628);
  await screen.findByRole('heading', { level: 1 });
  expect(document.title).toBe('বুখারী শরীফ - হাদীস নং ৬,৬২৮ - BoiKotha');
});

describe('share', () => {
  afterEach(() => {
    delete navigator.share;
  });

  test('a "শেয়ার" button opens the share sheet with the citation, text and permanent link', async () => {
    const native = vi.fn().mockResolvedValue();
    Object.defineProperty(navigator, 'share', { value: native, configurable: true, writable: true });
    serve({ '/json/hadis/Bukhari/6628/text.txt': BUKHARI_6628 });
    show('bukhari', 6628);
    await screen.findByRole('heading', { level: 1 });
    fireEvent.click(screen.getByRole('button', { name: 'শেয়ার' }));
    await waitFor(() => expect(native).toHaveBeenCalledTimes(1));
    const data = native.mock.calls[0][0];
    expect(data.title).toBe('সহীহ বুখারী, হাদীস নং ৬,৬২৮');
    expect(data.url).toBe(`${window.location.origin}/hadis/bukhari/6628`);
    expect(data.text).toContain('বর্তমান যুগের মুনাফিকরা');
    expect(data.text).not.toMatch(/^৬৬২৮/);
  });

  test('without a share sheet the share text is copied and the toast says so', async () => {
    serve({ '/json/hadis/Bukhari/6628/text.txt': BUKHARI_6628 });
    show('bukhari', 6628);
    await screen.findByRole('heading', { level: 1 });
    fireEvent.click(screen.getByRole('button', { name: 'শেয়ার' }));
    await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalled());
    expect(navigator.clipboard.writeText.mock.calls.at(-1)[0]).toContain(`${window.location.origin}/hadis/bukhari/6628`);
    expect(await screen.findByText('শেয়ার টেক্সট কপি করা হয়েছে')).toBeInTheDocument();
  });

  test('a "ছবি বানান" link goes to the quote-card page', async () => {
    serve({ '/json/hadis/Bukhari/6628/text.txt': BUKHARI_6628 });
    show('bukhari', 6628);
    await screen.findByRole('heading', { level: 1 });
    expect(screen.getByRole('link', { name: 'ছবি বানান' })).toHaveAttribute('href', '/share/bukhari/6628');
  });
});
