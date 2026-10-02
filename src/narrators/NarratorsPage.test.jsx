import { readFileSync } from 'node:fs';
import path from 'node:path';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { clearNarratorCache } from '../lib/narrators';
import { SettingsProvider } from '../settings/SettingsProvider';
import { ToastProvider } from '../ui/Toast';
import { getUrl, setUrl } from '../test/nextNavigation';
import { serveRealData } from '../test/publicJson';
import NarratorsPage from './NarratorsPage';
import { STEP } from './NarratorList';

// The index and the lists are the real files built by scripts/build-narrators.mjs, and the cards
// load real hadis texts.
const readJson = (file) => JSON.parse(readFileSync(path.resolve(process.cwd(), 'public/json/narrators', file), 'utf8'));
const INDEX = readJson('index.json');
const row = (id) => INDEX.find((entry) => entry[0] === id);
const ABU_HURAYRAH = row('abu-hurayrah');
const AISHA = row('aisha');
const AH_PAIRS = readJson('abu-hurayrah.json');
const BOOK_IDS = ['bukhari', 'muslim', 'tirmidhi', 'abudawud', 'ibnmajah', 'nasai'];

// Pages of real hadis cards are slow to draw on a busy machine: allow for it.
vi.setConfig({ testTimeout: 30000 });

beforeEach(() => {
  clearNarratorCache();
  serveRealData();
});

// Cards load their text after the test body; let those loads finish inside act().
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
const cardTitles = () =>
  screen
    .queryAllByRole('heading', { level: 2 })
    .map((h) => h.textContent)
    .filter((text) => /হাদীস নং/.test(text));
const pagerLink = (name) => within(screen.getByRole('navigation', { name: 'পাতা' })).getByRole('link', { name });
const rows = () => within(screen.getByRole('list', { name: 'বর্ণনাকারী' })).getAllByRole('link');
const box = () => screen.getByRole('textbox', { name: 'বর্ণনাকারী খুঁজুন' });
const digits = (n) => String(n).replace(/\d/g, (d) => '০১২৩৪৫৬৭৮৯'[d]);
const withSeparators = (n) => digits(n.toLocaleString('en-US'));

describe('/narrators (the list)', () => {
  test('is titled, has one h1 and a filter box', async () => {
    show('/narrators');
    expect(document.title).toBe('বর্ণনাকারী - BoiKotha');
    expect(screen.getByRole('heading', { level: 1, name: 'বর্ণনাকারী' })).toBeInTheDocument();
    expect(box()).toBeInTheDocument();
    await screen.findByRole('list', { name: 'বর্ণনাকারী' });
  });

  test('says honestly that the names are sorted by a program', async () => {
    show('/narrators');
    expect(screen.getByText('নামগুলো স্বয়ংক্রিয়ভাবে বাছাই করা, কিছু বানান আলাদা থাকতে পারে।')).toBeInTheDocument();
    await screen.findByRole('list', { name: 'বর্ণনাকারী' });
  });

  test('says it is looking while the index loads, then counts the narrators', async () => {
    show('/narrators');
    expect(screen.getByText('খুঁজছি...')).toBeInTheDocument();
    expect(await screen.findByText(`মোট ${digits(INDEX.length)} জন বর্ণনাকারী`)).toBeInTheDocument();
    expect(screen.queryByText('খুঁজছি...')).not.toBeInTheDocument();
  });

  test('shows the narrators with the most hadis first, each with its count, as a link to its page', async () => {
    show('/narrators');
    await screen.findByRole('list', { name: 'বর্ণনাকারী' });
    const first = rows()[0];
    expect(first).toHaveTextContent(ABU_HURAYRAH[1]);
    expect(first).toHaveTextContent(`${withSeparators(ABU_HURAYRAH[2])} টি হাদীস`);
    expect(first).toHaveAttribute('href', '/narrators?name=abu-hurayrah');
    expect(rows()[1]).toHaveAttribute('href', '/narrators?name=aisha');
  });

  test('draws only the first batch, and "show more" adds the next', async () => {
    show('/narrators');
    await screen.findByRole('list', { name: 'বর্ণনাকারী' });
    expect(rows()).toHaveLength(STEP);
    fireEvent.click(screen.getByRole('button', { name: `আরও দেখান (${digits(INDEX.length - STEP)} জন বাকি)` }));
    expect(rows()).toHaveLength(STEP * 2);
    expect(rows()[STEP]).toHaveAttribute('href', `/narrators?name=${INDEX[STEP][0]}`);
  });

  test('the button is gone when everything is shown', async () => {
    show('/narrators');
    await screen.findByRole('list', { name: 'বর্ণনাকারী' });
    for (let shown = STEP; shown < INDEX.length; shown += STEP) {
      fireEvent.click(screen.getByRole('button', { name: /আরও দেখান/ }));
    }
    expect(rows()).toHaveLength(INDEX.length);
    expect(screen.queryByRole('button', { name: /আরও দেখান/ })).not.toBeInTheDocument();
  });

  test('each row has a bar split by book that screen readers skip', async () => {
    show('/narrators');
    await screen.findByRole('list', { name: 'বর্ণনাকারী' });
    const bars = screen.getAllByTestId('narrator-bar');
    expect(bars).toHaveLength(STEP);
    expect(bars[0]).toHaveAttribute('aria-hidden', 'true');
    expect((bars[0].innerHTML.match(/<i /g) ?? []).length).toBe(ABU_HURAYRAH.slice(3).filter((n) => n > 0).length);
  });

  test('the filter narrows the list as you type, and announces how many match', async () => {
    show('/narrators');
    await screen.findByRole('list', { name: 'বর্ণনাকারী' });
    fireEvent.change(box(), { target: { value: 'আয়িশা' } });
    expect(rows()[0]).toHaveAttribute('href', '/narrators?name=aisha');
    expect(rows().every((link) => /আয়িশা/.test(link.textContent.normalize('NFC')))).toBe(true);
    expect(screen.getAllByRole('status').some((region) => /জন বর্ণনাকারী পাওয়া গেছে/.test(region.textContent))).toBe(true);
  });

  test('the filter finds a name spelled another way (হুরাইরা, ইবনে, আয়েশা)', async () => {
    show('/narrators');
    await screen.findByRole('list', { name: 'বর্ণনাকারী' });
    fireEvent.change(box(), { target: { value: 'হুরাইরা' } });
    expect(rows()[0]).toHaveAttribute('href', '/narrators?name=abu-hurayrah');
    fireEvent.change(box(), { target: { value: 'আয়েশা' } });
    expect(rows()[0]).toHaveAttribute('href', '/narrators?name=aisha');
    fireEvent.change(box(), { target: { value: 'ইবনে আব্বাস' } });
    expect(rows()[0]).toHaveAttribute('href', '/narrators?name=ibn-abbas');
  });

  test('says so when nothing matches, and clearing the box brings the list back', async () => {
    show('/narrators');
    await screen.findByRole('list', { name: 'বর্ণনাকারী' });
    fireEvent.change(box(), { target: { value: 'zzzz' } });
    expect(screen.getByText('কোনো বর্ণনাকারী মেলেনি। অন্য বানান লিখে দেখুন।')).toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'বর্ণনাকারী' })).not.toBeInTheDocument();
    fireEvent.change(box(), { target: { value: '' } });
    expect(rows()).toHaveLength(STEP);
  });

  test('typing starts the batch again from 50', async () => {
    show('/narrators');
    await screen.findByRole('list', { name: 'বর্ণনাকারী' });
    fireEvent.click(screen.getByRole('button', { name: /আরও দেখান/ }));
    expect(rows()).toHaveLength(STEP * 2);
    fireEvent.change(box(), { target: { value: 'ইবনু' } });
    expect(rows().length).toBeLessThanOrEqual(STEP);
  });

  test('Enter in the box does nothing (there is nothing to submit)', async () => {
    show('/narrators');
    await screen.findByRole('list', { name: 'বর্ণনাকারী' });
    const notPrevented = fireEvent.keyDown(box(), { key: 'Enter' });
    expect(notPrevented).toBe(false);
  });

  test('numbers are shown in the visitor\'s digit style', async () => {
    localStorage.setItem('boikotha.settings', JSON.stringify({ digits: 'en' }));
    show('/narrators');
    await screen.findByRole('list', { name: 'বর্ণনাকারী' });
    expect(rows()[0]).toHaveTextContent(`${ABU_HURAYRAH[2].toLocaleString('en-US')} টি হাদীস`);
  });

  test('a failed index says so and can be tried again', async () => {
    serveRealData((url) => (url === '/json/narrators/index.json' ? Promise.reject(new Error('offline')) : undefined));
    show('/narrators');
    expect(await screen.findByText(/বর্ণনাকারীদের তালিকা আনা যায়নি/)).toBeInTheDocument();
    serveRealData();
    fireEvent.click(screen.getByRole('button', { name: 'আবার চেষ্টা করুন' }));
    expect(await screen.findByRole('list', { name: 'বর্ণনাকারী' })).toBeInTheDocument();
    expect(screen.queryByText(/বর্ণনাকারীদের তালিকা আনা যায়নি/)).not.toBeInTheDocument();
  });

  test('choosing a row goes to that narrator, and asks for the page to scroll to the top', async () => {
    show('/narrators');
    await screen.findByRole('list', { name: 'বর্ণনাকারী' });
    const link = rows()[1];
    expect(link).toHaveAttribute('data-scroll', 'false');
    document.documentElement.scrollTop = 500;
    fireEvent.click(link);
    expect(document.documentElement.scrollTop).toBe(0);
    expect(address()).toBe('/narrators?name=aisha');
    expect(await screen.findByRole('heading', { level: 1, name: AISHA[1] })).toBeInTheDocument();
  });
});

describe('one narrator (/narrators?name=<id>)', () => {
  test('names the narrator as the h1, and titles the page with the name', async () => {
    show('/narrators?name=abu-hurayrah');
    expect(await screen.findByRole('heading', { level: 1, name: ABU_HURAYRAH[1] })).toBeInTheDocument();
    expect(document.title).toBe(`${ABU_HURAYRAH[1]} - বর্ণনাকারী - BoiKotha`);
    await screen.findAllByRole('button', { name: /কপি/ });
  });

  test('counts the hadis, and shows the first 20 as shared cards in book order', async () => {
    show('/narrators?name=abu-hurayrah');
    expect(await screen.findByText(`মোট ${withSeparators(ABU_HURAYRAH[2])} টি হাদীস পাওয়া গেছে`, { exact: false })).toBeInTheDocument();
    expect(screen.getByText('১ - ২০ পর্যন্ত দেখানো হচ্ছে')).toBeInTheDocument();
    expect(cardTitles()).toHaveLength(20);
    expect(cardTitles()[0]).toBe(`বুখারী শরীফ - হাদীস নং ${withSeparators(AH_PAIRS[0][1])}`);
    expect(global.fetch).not.toHaveBeenCalledWith(expect.stringContaining('/Bukhari/' + String(AH_PAIRS[20][1]).padStart(4, '0')));
  });

  test('gives the honest note about the names and about the hadis whose chain is not known', async () => {
    show('/narrators?name=aisha');
    await screen.findByRole('heading', { level: 1, name: AISHA[1] });
    expect(screen.getByText(/নামগুলো স্বয়ংক্রিয়ভাবে বাছাই করা, কিছু বানান আলাদা থাকতে পারে।/)).toBeInTheDocument();
    expect(screen.getByText(/যে হাদীসের সনদ চেনা যায়নি, সেগুলো এখানে নেই/)).toBeInTheDocument();
    await screen.findAllByRole('button', { name: /কপি/ });
  });

  test('links back to the list of narrators', async () => {
    show('/narrators?name=aisha');
    await screen.findByRole('heading', { level: 1, name: AISHA[1] });
    expect(screen.getByRole('link', { name: /সব বর্ণনাকারী/ })).toHaveAttribute('href', '/narrators');
    await screen.findAllByRole('button', { name: /কপি/ });
  });

  test('has one chip per book with its count, and "all" with the total', async () => {
    show('/narrators?name=aisha');
    await screen.findByRole('heading', { level: 1, name: AISHA[1] });
    const filter = screen.getByRole('navigation', { name: 'বই অনুযায়ী ছাঁকুন' });
    expect(within(filter).getAllByRole('link')).toHaveLength(7);
    expect(within(filter).getByRole('link', { name: new RegExp(`^সব ${withSeparators(AISHA[2])}$`) })).toHaveAttribute('aria-current', 'true');
    BOOK_IDS.forEach((id, i) => {
      const chip = within(filter).getByRole('link', { name: new RegExp(`${withSeparators(AISHA[3 + i])}$`) });
      expect(decodeURIComponent(chip.getAttribute('href'))).toBe(`/narrators?name=aisha&book=${id}`);
    });
    await screen.findAllByRole('button', { name: /কপি/ });
  });

  test('a book with none of the narrator\'s hadis is dimmed and cannot be followed', async () => {
    const buraydah = INDEX.find((entry) => entry[1] === 'বুরায়দা');
    show(`/narrators?name=${buraydah[0]}`);
    await screen.findByRole('heading', { level: 1, name: 'বুরায়দা' });
    const filter = screen.getByRole('navigation', { name: 'বই অনুযায়ী ছাঁকুন' });
    expect(within(filter).getAllByRole('link')).toHaveLength(6); // "all" and five books
    expect(within(filter).getByText(/বুখারী/)).toHaveAttribute('aria-disabled', 'true');
    await screen.findAllByRole('button', { name: /কপি/ });
  });

  test('choosing a book shows only that book and starts at its first page', async () => {
    show('/narrators?name=aisha&page=2');
    await screen.findByText(/মোট/);
    fireEvent.click(within(screen.getByRole('navigation', { name: 'বই অনুযায়ী ছাঁকুন' })).getByRole('link', { name: /মুসলিম/ }));
    expect(address()).toBe('/narrators?name=aisha&book=muslim');
    expect(await screen.findByText(`মোট ${withSeparators(AISHA[4])} টি হাদীস পাওয়া গেছে`, { exact: false })).toBeInTheDocument();
    await waitFor(() => expect(cardTitles().length).toBeGreaterThan(0));
    expect(cardTitles().every((title) => title.startsWith('মুসলিম শরীফ'))).toBe(true);
    expect(within(screen.getByRole('navigation', { name: 'বই অনুযায়ী ছাঁকুন' })).getByRole('link', { name: /মুসলিম/ })).toHaveAttribute('aria-current', 'true');
  });

  test('?book= in the address narrows the list, and a book that does not exist means all', async () => {
    show('/narrators?name=aisha&book=nasai');
    await screen.findByText(`মোট ${withSeparators(AISHA[8])} টি হাদীস পাওয়া গেছে`, { exact: false });
    await waitFor(() => expect(cardTitles().length).toBeGreaterThan(0));
    expect(cardTitles().every((title) => title.startsWith('নাসাঈ শরীফ'))).toBe(true);
  });

  test('an unknown book in the address shows every book', async () => {
    show('/narrators?name=aisha&book=nobook');
    expect(await screen.findByText(`মোট ${withSeparators(AISHA[2])} টি হাদীস পাওয়া গেছে`, { exact: false })).toBeInTheDocument();
    await screen.findAllByRole('button', { name: /কপি/ });
  });

  test('a book with none says so instead of an empty page', async () => {
    const buraydah = INDEX.find((entry) => entry[1] === 'বুরায়দা');
    show(`/narrators?name=${buraydah[0]}&book=bukhari`);
    expect(await screen.findByText('এই বইয়ে এই বর্ণনাকারীর কোনো হাদীস পাওয়া যায়নি')).toBeInTheDocument();
    expect(cardTitles()).toEqual([]);
  });

  test('an unknown narrator says so and links back to the list', async () => {
    show('/narrators?name=no-such-narrator');
    expect(await screen.findByText('এই বর্ণনাকারীকে পাওয়া যায়নি।')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'সব বর্ণনাকারী দেখুন' })).toHaveAttribute('href', '/narrators');
    expect(document.title).toBe('বর্ণনাকারী - BoiKotha');
    expect(cardTitles()).toEqual([]);
  });

  test('a narrator whose list cannot be loaded says so and can be tried again', async () => {
    serveRealData((url) => (url === '/json/narrators/aisha.json' ? Promise.reject(new Error('offline')) : undefined));
    show('/narrators?name=aisha');
    expect(await screen.findByText(/হাদীসের তালিকা আনা যায়নি/)).toBeInTheDocument();
    serveRealData();
    fireEvent.click(screen.getByRole('button', { name: 'আবার চেষ্টা করুন' }));
    expect(await screen.findByText(/মোট/)).toBeInTheDocument();
    expect(screen.queryByText(/হাদীসের তালিকা আনা যায়নি/)).not.toBeInTheDocument();
  });

  test('a failed index says so and can be tried again', async () => {
    serveRealData((url) => (url === '/json/narrators/index.json' ? Promise.resolve({ ok: false, status: 500 }) : undefined));
    show('/narrators?name=aisha');
    expect(await screen.findByText(/বর্ণনাকারীকে খোঁজা যায়নি/)).toBeInTheDocument();
    serveRealData();
    fireEvent.click(screen.getByRole('button', { name: 'আবার চেষ্টা করুন' }));
    expect(await screen.findByRole('heading', { level: 1, name: AISHA[1] })).toBeInTheDocument();
    await screen.findAllByRole('button', { name: /কপি/ });
  });
});

describe('paging', () => {
  test('page 2 shows hadis 21 to 40 and says so', async () => {
    show('/narrators?name=abu-hurayrah&page=2');
    await screen.findByText(/মোট/);
    expect(cardTitles()).toHaveLength(20);
    expect(cardTitles()[0]).toBe(`বুখারী শরীফ - হাদীস নং ${withSeparators(AH_PAIRS[20][1])}`);
    expect(screen.getByText('২১ - ৪০ পর্যন্ত দেখানো হচ্ছে')).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalledWith(expect.stringContaining('/Bukhari/' + String(AH_PAIRS[0][1]).padStart(4, '0')));
  });

  test('a page past the end shows the last page', async () => {
    show('/narrators?name=abu-hurayrah&page=9999');
    await screen.findByText(/মোট/);
    const last = Math.floor((ABU_HURAYRAH[2] - 1) / 20) * 20;
    const count = ABU_HURAYRAH[2] - last;
    expect(cardTitles()).toHaveLength(count);
    expect(screen.getByText(`${withSeparators(last + 1)} - ${withSeparators(ABU_HURAYRAH[2])} পর্যন্ত দেখানো হচ্ছে`)).toBeInTheDocument();
  });

  test('a page that is not a number shows the first page', async () => {
    show('/narrators?name=abu-hurayrah&page=abc');
    await screen.findByText(/মোট/);
    expect(screen.getByText('১ - ২০ পর্যন্ত দেখানো হচ্ছে')).toBeInTheDocument();
  });

  test('"next" goes to the next page, keeping the book, and the address says so', async () => {
    show('/narrators?name=abu-hurayrah&book=muslim');
    await screen.findByText(/মোট/);
    fireEvent.click(pagerLink(/পরের/));
    expect(address()).toBe('/narrators?name=abu-hurayrah&page=2&book=muslim');
    expect(await screen.findByText('২১ - ৪০ পর্যন্ত দেখানো হচ্ছে')).toBeInTheDocument();
  });

  test('"previous" on page 2 goes back to the first page with no "page" in the address', async () => {
    show('/narrators?name=abu-hurayrah&page=2');
    await screen.findByText(/মোট/);
    fireEvent.click(pagerLink(/আগের/));
    expect(address()).toBe('/narrators?name=abu-hurayrah');
    await screen.findByText('১ - ২০ পর্যন্ত দেখানো হচ্ছে');
    await screen.findAllByRole('button', { name: /কপি/ });
  });

  test('the pager shows "page n / m" and the links go to the top without Next\'s own scrolling', async () => {
    show('/narrators?name=abu-hurayrah');
    await screen.findByText(/মোট/);
    const lastPage = Math.ceil(ABU_HURAYRAH[2] / 20);
    expect(screen.getByRole('navigation', { name: 'পাতা' })).toHaveTextContent(`পাতা ১ / ${withSeparators(lastPage)}`);
    const next = pagerLink(/পরের/);
    expect(next).toHaveAttribute('data-scroll', 'false');
    document.documentElement.scrollTop = 500;
    fireEvent.click(next);
    expect(document.documentElement.scrollTop).toBe(0);
    await screen.findByText('২১ - ৪০ পর্যন্ত দেখানো হচ্ছে');
    await screen.findAllByRole('button', { name: /কপি/ });
  });

  test('there is no pager when everything fits on one page', async () => {
    const small = INDEX.find((entry) => entry[2] >= 5 && entry[2] <= 20);
    show(`/narrators?name=${small[0]}`);
    await screen.findByText(/মোট/);
    expect(screen.queryByRole('navigation', { name: 'পাতা' })).not.toBeInTheDocument();
    expect(cardTitles()).toHaveLength(small[2]);
    await screen.findAllByRole('button', { name: /কপি/ });
  });

  test('a slow narrator cannot overwrite the one chosen after it', async () => {
    let releaseSlow;
    serveRealData((url) =>
      url === '/json/narrators/abu-hurayrah.json'
        ? new Promise((resolve) => {
            releaseSlow = () => resolve({ ok: true, json: () => Promise.resolve([[0, 13], [0, 34]]) });
          })
        : undefined
    );
    show('/narrators?name=abu-hurayrah');
    await waitFor(() => expect(releaseSlow).toBeDefined());
    act(() => setUrl('/narrators?name=aisha&page=1'));
    expect(await screen.findByRole('heading', { level: 1, name: AISHA[1] })).toBeInTheDocument();
    await screen.findByText(/মোট/);
    await act(async () => {
      releaseSlow();
      await new Promise((resolve) => setTimeout(resolve, 20));
    });
    expect(screen.getByRole('heading', { level: 1, name: AISHA[1] })).toBeInTheDocument();
    expect(cardTitles()).toHaveLength(20);
  });
});

describe('focus and announcements', () => {
  const heading = () => screen.getByRole('heading', { level: 1 });

  test('the heading can take focus, and does not on first view', async () => {
    show('/narrators?name=aisha');
    await screen.findByText(/মোট/);
    expect(heading()).toHaveAttribute('tabindex', '-1');
    expect(heading()).not.toHaveFocus();
  });

  test('moving to the next page focuses the heading and announces the page', async () => {
    show('/narrators?name=aisha');
    await screen.findByText(/মোট/);
    fireEvent.click(pagerLink(/পরের/));
    await waitFor(() => expect(heading()).toHaveFocus());
    expect(screen.getAllByRole('status').some((region) => region.textContent === 'পাতা ২')).toBe(true);
  });

  test('choosing a book chip focuses the heading', async () => {
    show('/narrators?name=aisha');
    await screen.findByText(/মোট/);
    fireEvent.click(within(screen.getByRole('navigation', { name: 'বই অনুযায়ী ছাঁকুন' })).getByRole('link', { name: /নাসাঈ/ }));
    await waitFor(() => expect(heading()).toHaveFocus());
  });

  test('choosing a row in the list focuses the narrator\'s heading', async () => {
    show('/narrators');
    await screen.findByRole('list', { name: 'বর্ণনাকারী' });
    fireEvent.click(rows()[0]);
    await waitFor(() => expect(heading()).toHaveFocus());
    await screen.findAllByRole('button', { name: /কপি/ });
  });

  test('focus does not move when the address changes without a link asking for it', async () => {
    show('/narrators?name=aisha');
    await screen.findByText(/মোট/);
    act(() => setUrl('/narrators?name=aisha&page=2'));
    await screen.findByText('২১ - ৪০ পর্যন্ত দেখানো হচ্ছে');
    expect(heading()).not.toHaveFocus();
  });

  test('the page has one main landmark with the skip-link target', async () => {
    show('/narrators?name=aisha');
    expect(screen.getAllByRole('main')).toHaveLength(1);
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main');
    await screen.findByText(/মোট/);
  });
});
