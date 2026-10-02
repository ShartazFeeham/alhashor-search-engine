import { readFileSync } from 'node:fs';
import path from 'node:path';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { clearNarratorCache } from '../lib/narrators';
import { SettingsProvider } from '../settings/SettingsProvider';
import { ToastProvider } from '../ui/Toast';
import { getUrl, setUrl } from '../test/nextNavigation';
import { serveRealData } from '../test/publicJson';
import NarratorsPage from './NarratorsPage';

// The index and the lists are the real files built by scripts/build-narrators.mjs, and the cards
// load real hadis texts. The menu is tested in NarratorsMenu.test.jsx.
const readJson = (file) => JSON.parse(readFileSync(path.resolve(process.cwd(), 'public/json/narrators', file), 'utf8'));
const INDEX = readJson('index.json');
const AISHA = INDEX.find((entry) => entry[0] === 'aisha');
const AH = INDEX.find((entry) => entry[0] === 'abu-hurayrah');
const digits = (n) => n.toLocaleString('en-US').replace(/\d/g, (d) => '০১২৩৪৫৬৭৮৯'[d]);

vi.setConfig({ testTimeout: 30000 });

beforeEach(() => {
  clearNarratorCache();
  serveRealData();
});
afterEach(async () => {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
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
const address = () => decodeURIComponent(getUrl().pathname + getUrl().search);
const NOTE = 'নামগুলো স্বয়ংক্রিয়ভাবে বাছাই করা, কিছু বানান আলাদা থাকতে পারে।';
const cards = () => within(screen.getByRole('list', { name: 'ফলাফল' })).getAllByRole('listitem');

describe('/narrators with no narrator chosen', () => {
  test('is titled, has one h1 and the honest note beside the prompt', async () => {
    show('/narrators');
    expect(document.title).toBe('বর্ণনাকারী - Alhashor');
    expect(screen.getByRole('heading', { level: 1, name: 'বর্ণনাকারী' })).toBeInTheDocument();
    expect(screen.getByText(NOTE)).toBeInTheDocument();
    expect(screen.getByText('একজন বর্ণনাকারী বেছে নিন')).toBeInTheDocument();
    await screen.findByRole('link', { name: /^আয়িশা(?: \(রাঃ\))? [০-৯,]+$/ });
  });

  test('says it is looking while the index loads', async () => {
    show('/narrators');
    expect(screen.getByText('খুঁজছি...')).toBeInTheDocument();
    await screen.findByRole('link', { name: /^আয়িশা(?: \(রাঃ\))? [০-৯,]+$/ });
    expect(screen.queryByText('খুঁজছি...')).not.toBeInTheDocument();
  });

  test('a failed index says so in the menu and can be tried again', async () => {
    serveRealData((url) => (url === '/json/narrators/index.json' ? Promise.reject(new Error('offline')) : undefined));
    show('/narrators');
    expect(await screen.findByText(/বর্ণনাকারীদের তালিকা আনা যায়নি/)).toBeInTheDocument();
    serveRealData();
    fireEvent.click(screen.getByRole('button', { name: 'আবার চেষ্টা করুন' }));
    expect(await screen.findByRole('link', { name: /^আয়িশা(?: \(রাঃ\))? [০-৯,]+$/ })).toBeInTheDocument();
    expect(screen.queryByText(/বর্ণনাকারীদের তালিকা আনা যায়নি/)).not.toBeInTheDocument();
  });
});

describe('one narrator (/narrators?name=<id>)', () => {
  test('names the narrator with the hadis count, titles the page and gives the note', async () => {
    show('/narrators?name=aisha');
    expect(await screen.findByRole('heading', { level: 2, name: `${AISHA[1]} (রাঃ) ${digits(AISHA[2])} টি হাদীস` })).toBeInTheDocument();
    expect(screen.getByText(NOTE)).toBeInTheDocument();
    await waitFor(() => expect(document.title).toBe(`${AISHA[1]} - বর্ণনাকারী - Alhashor`));
    await screen.findByRole('list', { name: 'ফলাফল' });
  });

  test('lists the first 20 hadis in book order, with the count line and nothing highlighted', async () => {
    show('/narrators?name=aisha');
    expect(await screen.findByText(`মোট ${digits(AISHA[2])} টি হাদিস পাওয়া গেছে`, { exact: false })).toBeInTheDocument();
    expect(screen.getByText(/১ - ২০ পর্যন্ত দেখানো হচ্ছে/)).toBeInTheDocument();
    await screen.findAllByText(/হাদীস নং/);
    expect(cards()).toHaveLength(20);
    expect(screen.getAllByText(/হাদীস নং/)[0].textContent).toMatch(/বুখারী/);
  });

  test('?book= narrows the list to that book, and an unknown book means all', async () => {
    show('/narrators?name=aisha&book=muslim');
    expect(await screen.findByText(`মোট ${digits(AISHA[4])} টি হাদিস পাওয়া গেছে`, { exact: false })).toBeInTheDocument();
    await screen.findAllByText(/হাদীস নং/);
    expect(screen.getAllByText(/হাদীস নং/).every((link) => /মুসলিম/.test(link.textContent))).toBe(true);
  });

  test('page 2 shows hadis 21 to 40; a page past the end shows the last page', async () => {
    show('/narrators?name=aisha&page=2');
    expect(await screen.findByText(/২১ - ৪০ পর্যন্ত দেখানো হচ্ছে/)).toBeInTheDocument();
    await screen.findAllByText(/হাদীস নং/);
  });

  test('the pager keeps the book and the sort in the address', async () => {
    show('/narrators?name=aisha&book=bukhari&sort=name-desc');
    const pager = await screen.findByRole('navigation', { name: 'পাতা' });
    fireEvent.click(within(pager).getByRole('button', { name: /পরের/ }));
    expect(address()).toBe('/narrators?name=aisha&page=2&book=bukhari&sort=name-desc');
    await screen.findAllByText(/হাদীস নং/);
  });

  test('numbers follow the abstract of the real data: Abu Hurayrah has his count', async () => {
    show('/narrators?name=abu-hurayrah');
    expect(await screen.findByText(`মোট ${digits(AH[2])} টি হাদিস পাওয়া গেছে`, { exact: false })).toBeInTheDocument();
    await screen.findAllByText(/হাদীস নং/);
  });

  test('an unknown narrator says so and links back', async () => {
    show('/narrators?name=no-such-narrator');
    expect(await screen.findByText('এই বর্ণনাকারীকে পাওয়া যায়নি।')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'সব বর্ণনাকারী দেখুন' })).toHaveAttribute('href', '/narrators');
    expect(document.title).toBe('বর্ণনাকারী - Alhashor');
  });

  test('a narrator whose list cannot be loaded says so and can be tried again', async () => {
    serveRealData((url) => (url === '/json/narrators/aisha.json' ? Promise.reject(new Error('offline')) : undefined));
    show('/narrators?name=aisha');
    expect(await screen.findByText(/হাদীসের তালিকা আনা যায়নি/)).toBeInTheDocument();
    serveRealData();
    fireEvent.click(screen.getByRole('button', { name: 'আবার চেষ্টা করুন' }));
    expect(await screen.findByText(/মোট/)).toBeInTheDocument();
    expect(screen.queryByText(/হাদীসের তালিকা আনা যায়নি/)).not.toBeInTheDocument();
    await screen.findAllByText(/হাদীস নং/);
  });

  test('a failed index says so and can be tried again', async () => {
    serveRealData((url) => (url === '/json/narrators/index.json' ? Promise.resolve({ ok: false, status: 500 }) : undefined));
    show('/narrators?name=aisha');
    expect(await screen.findByText(/বর্ণনাকারীকে খোঁজা যায়নি/)).toBeInTheDocument();
    serveRealData();
    fireEvent.click(screen.getAllByRole('button', { name: 'আবার চেষ্টা করুন' })[0]);
    expect(await screen.findByRole('heading', { level: 2, name: new RegExp(AISHA[1]) })).toBeInTheDocument();
    await screen.findAllByText(/হাদীস নং/);
  });
});

describe('focus', () => {
  test('choosing a narrator in the menu focuses its heading; the first view does not', async () => {
    show('/narrators?name=aisha');
    const heading = await screen.findByRole('heading', { level: 2, name: new RegExp(AISHA[1]) });
    expect(heading).toHaveAttribute('tabindex', '-1');
    expect(heading).not.toHaveFocus();
    fireEvent.click(screen.getByRole('link', { name: /^আবূ হুরায়রা(?: \(রাঃ\))? [০-৯,]+$/ }));
    await waitFor(() => expect(screen.getByRole('heading', { level: 2, name: /আবূ হুরায়রা/ })).toHaveFocus());
    await screen.findAllByText(/হাদীস নং/);
  });

  test('the page has one main landmark with the skip-link target', async () => {
    show('/narrators?name=aisha');
    expect(screen.getAllByRole('main')).toHaveLength(1);
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main');
    await screen.findAllByText(/হাদীস নং/);
  });
});
