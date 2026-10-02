import { render, screen, fireEvent, waitFor, within, act, configure, getConfig } from '@testing-library/react';
import { usePathname, useSearchParams } from 'next/navigation';
import { SettingsProvider } from '../settings/SettingsProvider';
import { serveRealData } from '../test/publicJson';
import { setUrl } from '../test/nextNavigation';
import { ToastProvider } from '../ui/Toast';
import SearchPage from './SearchPage';

// The search keeps every data file it loads for the life of the page (searchIndex.js), so the tests
// with made-up data files and the ones with the real files use different words (different files).
// Search upgrades: "did you mean" (typos, spellings, synonyms) and the "কাছাকাছি শব্দ" (words near
// each other) option. In these tests there is no Worker (jsdom has none), so the search runs on the
// main thread: the worker's path is covered in searchClient.test.js.

const BOX = { name: 'খোঁজার শব্দ' };
const DID_YOU_MEAN = /আপনি কি বোঝাতে চেয়েছেন/;
const NEAR = { name: 'কাছাকাছি শব্দ' };

function Where() {
  const pathname = usePathname();
  const query = useSearchParams().toString();
  return <div data-testid="where">{decodeURIComponent(pathname + (query ? '?' + query : ''))}</div>;
}

function renderSearch(url) {
  setUrl(url);
  return render(
    <SettingsProvider>
      <ToastProvider>
        <SearchPage />
        <Where />
      </ToastProvider>
    </SettingsProvider>
  );
}

const where = () => screen.getByTestId('where');

function serve(files) {
  global.fetch = vi.fn((url) => {
    const found = url in files;
    return Promise.resolve({ ok: found, json: () => Promise.resolve(files[url]) });
  });
}

const file = (word) => `/json/tags/${word.substring(0, 2)}.json`;
const tags = (n, book = 'BUK') => Array.from({ length: n }, (_, i) => `${book}-${i + 1}`);

afterEach(() => {
  delete global.fetch;
});

describe('did you mean', () => {
  test('a search with no results offers a corrected spelling that re-runs the search', async () => {
    serve({ [file('নামায')]: { নামায: tags(3) } });
    renderSearch('/search?q=' + encodeURIComponent('ণামায'));
    const suggestion = await screen.findByRole('button', { name: 'নামায' });
    expect(screen.getByText(DID_YOU_MEAN)).toBeInTheDocument();

    fireEvent.click(suggestion);

    expect(await screen.findByText(/মোট ৩ টি হাদিস পাওয়া গেছে/)).toBeInTheDocument();
    expect(where()).toHaveTextContent(/^\/search\?q=নামায$/);
    expect(screen.getByRole('textbox', BOX)).toHaveValue('নামায');
    expect(screen.queryByText(DID_YOU_MEAN)).not.toBeInTheDocument();
  });

  test('the suggestion is announced in the page\'s live region and is a real button', async () => {
    serve({ [file('নামায')]: { নামায: tags(3) } });
    renderSearch('/search?q=' + encodeURIComponent('ণামায'));
    const suggestion = await screen.findByRole('button', { name: 'নামায' });
    const region = screen.getAllByRole('status').find((live) => within(live).queryByText(DID_YOU_MEAN));
    expect(region).toBeDefined();
    expect(region).toContainElement(suggestion);
    expect(suggestion.tagName).toBe('BUTTON');
  });

  test('a search with a few results offers a hand-made synonym that has more hadis', async () => {
    serve({
      [file('বেহেশত')]: { বেহেশত: tags(2) },
      [file('জান্নাত')]: { জান্নাত: tags(5, 'MUS') },
    });
    renderSearch('/search?q=' + encodeURIComponent('বেহেশত'));
    expect(await screen.findByRole('button', { name: 'জান্নাত' })).toBeInTheDocument();
    expect(await screen.findByText(/মোট ২ টি হাদিস পাওয়া গেছে/)).toBeInTheDocument();
  });

  test('says nothing when the search found enough and every word matched', async () => {
    serve({ [file('নামায')]: { নামায: tags(3) } });
    renderSearch('/search?q=' + encodeURIComponent('নামায'));
    await screen.findByText(/মোট ৩ টি হাদিস পাওয়া গেছে/);
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 20)); });
    expect(screen.queryByText(DID_YOU_MEAN)).not.toBeInTheDocument();
  });

  test('offers no spelling that has no data to show (the word must be checked first)', async () => {
    serve({});
    renderSearch('/search?q=' + encodeURIComponent('জাকাত'));
    await screen.findByText(/কোনো ফলাফল পাওয়া যায়নি। বানান পরিবর্তন করে বা অন্য শব্দ দিয়ে খুঁজুন।/);
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 20)); });
    expect(screen.queryByText(DID_YOU_MEAN)).not.toBeInTheDocument();
  });

  test('a new search clears the old suggestion at once', async () => {
    serve({ [file('নামায')]: { নামায: tags(3) } });
    renderSearch('/search?q=' + encodeURIComponent('ণামায'));
    await screen.findByRole('button', { name: 'নামায' });
    fireEvent.change(screen.getByRole('textbox', BOX), { target: { value: 'কিছুই' } });
    fireEvent.click(screen.getByRole('button', { name: 'খুঁজুন' }));
    expect(screen.queryByText(DID_YOU_MEAN)).not.toBeInTheDocument();
  });

  test('a corrected search keeps the "near" option and the other words of the query', async () => {
    serve({ [file('নামায')]: { নামায: tags(3) }, [file('সালাত')]: { সালাত: tags(3) } });
    renderSearch('/search?q=' + encodeURIComponent('ণামায সালাত') + '&near=1');
    fireEvent.click(await screen.findByRole('button', { name: 'নামায সালাত' }));
    await waitFor(() => expect(where()).toHaveTextContent(/^\/search\?q=নামায\+সালাত&near=1$/));
  });
});

describe('words near each other (real hadis texts)', () => {
  // রোজা ইফতার finds 510 hadis. In search order the first is BUK-613 (the words are 4 apart);
  // the closest pair in the best 300 is NAS-503 (3 apart). Four hadis have the words within 5.
  const URL = '/search?q=' + encodeURIComponent('রোজা ইফতার');

  // Real files are big: give the page more time than the default second.
  let asyncUtilTimeout;
  beforeEach(() => {
    serveRealData();
    asyncUtilTimeout = getConfig().asyncUtilTimeout;
    configure({ asyncUtilTimeout: 8000 });
  });
  afterEach(() => configure({ asyncUtilTimeout }));

  test('the option is not offered for a single word', async () => {
    renderSearch('/search?q=' + encodeURIComponent('রোজা'));
    await screen.findByText(/মোট ৪০৩ টি হাদিস পাওয়া গেছে/);
    expect(screen.queryByRole('button', NEAR)).not.toBeInTheDocument();
  });

  test('is offered for two words, as an unpressed toggle chip, once the results are in', async () => {
    renderSearch(URL);
    expect(screen.queryByRole('button', NEAR)).not.toBeInTheDocument();
    const toggle = await screen.findByRole('button', NEAR);
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
  });

  test('turning it on writes near=1 to the address, shows "খুঁজছি...", then puts the closest hadis first and says what it looked at', async () => {
    renderSearch(URL);
    await screen.findByText(/মোট ৫১০ টি হাদিস পাওয়া গেছে/);
    expect(await screen.findByRole('link', { name: /বুখারী শরীফ - হাদীস নং ৬১৩/ })).toBeInTheDocument();
    const firstBefore = screen.getAllByRole('listitem')[0];
    expect(within(firstBefore).getByRole('link', { name: /হাদীস নং ৬১৩/ })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', NEAR));

    expect(where()).toHaveTextContent(/^\/search\?q=রোজা\+ইফতার&near=1$/);
    expect(screen.getByRole('button', NEAR)).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('খুঁজছি...')).toBeInTheDocument();

    expect(await screen.findByText(/মোট ৫১০ টির মধ্যে সেরা ৩০০টি ফলাফল দেখা হয়েছে/)).toBeInTheDocument();
    expect(screen.getByText(/সব শব্দ ৫ শব্দের মধ্যে আছে এমন হাদীস: ৪ টি/)).toBeInTheDocument();
    expect(screen.queryByText('খুঁজছি...')).not.toBeInTheDocument();
    await waitFor(() => {
      const first = screen.getAllByRole('listitem')[0];
      expect(within(first).getByRole('link', { name: /নাসাঈ শরীফ - হাদীস নং ৫০৩/ })).toBeInTheDocument();
    });
    // the count is the same: it re-ranks, it does not filter
    expect(screen.getByText(/মোট ৫১০ টি হাদিস পাওয়া গেছে/)).toBeInTheDocument();
  }, 20000);

  test('opening a link with near=1 starts with the option on', async () => {
    renderSearch(URL + '&near=1');
    expect(await screen.findByRole('button', NEAR)).toHaveAttribute('aria-pressed', 'true');
    await screen.findByText(/সেরা ৩০০টি ফলাফল দেখা হয়েছে/);
    await waitFor(() => {
      const first = screen.getAllByRole('listitem')[0];
      expect(within(first).getByRole('link', { name: /হাদীস নং ৫০৩/ })).toBeInTheDocument();
    });
  }, 20000);

  test('turning it off goes back to the search order and drops near from the address', async () => {
    renderSearch(URL + '&near=1');
    await screen.findByText(/সেরা ৩০০টি ফলাফল দেখা হয়েছে/);
    fireEvent.click(screen.getByRole('button', NEAR));
    expect(where()).toHaveTextContent(/^\/search\?q=রোজা\+ইফতার$/);
    expect(screen.getByRole('button', NEAR)).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByText(/সেরা ৩০০টি ফলাফল দেখা হয়েছে/)).not.toBeInTheDocument();
    await waitFor(() => {
      const first = screen.getAllByRole('listitem')[0];
      expect(within(first).getByRole('link', { name: /হাদীস নং ৬১৩/ })).toBeInTheDocument();
    });
  }, 20000);

  test('near=1 on a one-word search is ignored', async () => {
    renderSearch('/search?q=' + encodeURIComponent('রোজা') + '&near=1');
    await screen.findByText(/মোট ৪০৩ টি হাদিস পাওয়া গেছে/);
    expect(screen.queryByRole('button', NEAR)).not.toBeInTheDocument();
    expect(screen.queryByText('খুঁজছি...')).not.toBeInTheDocument();
  });

  test('is a keyboard control: focusable, and Enter turns it on', async () => {
    renderSearch(URL);
    const toggle = await screen.findByRole('button', NEAR);
    toggle.focus();
    expect(toggle).toHaveFocus();
    fireEvent.click(toggle); // a button turns a click into Enter / Space natively
    expect(where()).toHaveTextContent(/near=1/);
  });
});

describe('words near each other: fetching and cancelling', () => {
  // Hadis BUK-1 ... BUK-40 contain both words; their texts are held back until the test lets them go.
  function slowTexts() {
    const held = [];
    const textRequests = [];
    global.fetch = vi.fn((url) => {
      const ok = (body) => Promise.resolve({ ok: true, json: () => Promise.resolve(body) });
      if (url === file('প্রথম')) return ok({ প্রথম: tags(40), দ্বিতীয়: tags(40) });
      if (url === file('দ্বিতীয়')) return ok({ প্রথম: tags(40), দ্বিতীয়: tags(40) });
      if (url === file('অন্য')) return ok({ অন্য: tags(2, 'MUS'), শব্দ: tags(2, 'MUS') });
      const hadis = url.match(/\/json\/hadis\/(\w+)\/(\d+)\/text\.txt/);
      if (hadis) {
        textRequests.push(url);
        return new Promise((resolve) => {
          held.push(() => resolve({ ok: true, json: () => Promise.resolve('প্রথম দ্বিতীয়') }));
        });
      }
      return Promise.resolve({ ok: false });
    });
    return { held, textRequests };
  }

  test('fetches the texts in small batches, not all at once', async () => {
    const { textRequests } = slowTexts();
    renderSearch('/search?q=' + encodeURIComponent('প্রথম দ্বিতীয়') + '&near=1');
    await screen.findByText('খুঁজছি...');
    await waitFor(() => expect(textRequests.length).toBeGreaterThanOrEqual(10));
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 30)); });
    // 20 are shown on the page (their own request each); the batch for the re-ranking is 10 more at most
    const distinct = new Set(textRequests);
    expect(distinct.size).toBeLessThanOrEqual(20);
  });

  test('a new search stops the batches that were still to come', async () => {
    const { held, textRequests } = slowTexts();
    renderSearch('/search?q=' + encodeURIComponent('প্রথম দ্বিতীয়') + '&near=1');
    await screen.findByText('খুঁজছি...');
    await waitFor(() => expect(new Set(textRequests).size).toBeGreaterThanOrEqual(20));
    const before = new Set(textRequests).size;

    fireEvent.change(screen.getByRole('textbox', BOX), { target: { value: 'অন্য শব্দ' } });
    fireEvent.click(screen.getByRole('button', { name: 'খুঁজুন' }));
    await act(async () => {
      held.splice(0).forEach((release) => release());
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    const afterDistinct = textRequests.filter((url) => url.includes('/Bukhari/'));
    // nothing beyond what was already in flight when the search changed
    expect(new Set(afterDistinct).size).toBeLessThanOrEqual(before);
    expect(await screen.findByText(/মোট ২ টি হাদিস পাওয়া গেছে/)).toBeInTheDocument();
  });

  test('a hadis whose text cannot be loaded does not stop the re-ranking', async () => {
    global.fetch = vi.fn((url) => {
      const ok = (body) => Promise.resolve({ ok: true, json: () => Promise.resolve(body) });
      if (url === file('প্রথম')) return ok({ প্রথম: tags(3), দ্বিতীয়: tags(3) });
      if (url === file('দ্বিতীয়')) return ok({ প্রথম: tags(3), দ্বিতীয়: tags(3) });
      if (url.endsWith('/0002/text.txt')) return Promise.reject(new Error('network'));
      if (url.includes('/json/hadis/')) return ok('প্রথম দ্বিতীয়');
      return Promise.resolve({ ok: false });
    });
    renderSearch('/search?q=' + encodeURIComponent('প্রথম দ্বিতীয়') + '&near=1');
    expect(await screen.findByText(/সবগুলো ফলাফল দেখা হয়েছে/, {}, { timeout: 3000 })).toBeInTheDocument();
  });
});

describe('the near-words toggle sits beside the count', () => {
  test('the toggle and the count are in one row, the toggle after the count', async () => {
    serve({
      [file('ঋষিত')]: { ঋষিত: tags(3), ঊষাম: tags(3) },
      [file('ঊষাম')]: { ঋষিত: tags(3), ঊষাম: tags(3) },
    });
    renderSearch('/search?q=' + encodeURIComponent('ঋষিত ঊষাম'));
    const count = await screen.findByText(/মোট ৩ টি হাদিস পাওয়া গেছে/);
    const toggle = screen.getByRole('button', NEAR);
    // eslint-disable-next-line testing-library/no-node-access
    const row = count.closest('.search-summary');
    expect(row).not.toBeNull();
    expect(row).toContainElement(toggle);
    expect(count.compareDocumentPosition(toggle) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
  });
});
