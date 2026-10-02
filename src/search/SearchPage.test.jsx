import { render, screen, fireEvent, waitFor, act, within } from '@testing-library/react';
import { StrictMode } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { SettingsProvider } from '../settings/SettingsProvider';
import { setUrl } from '../test/nextNavigation';
import { ToastProvider } from '../ui/Toast';
import SearchPage from './SearchPage';

// These tests type placeholder words (Roman letters stand for word keys in the fake index), so the
// converter is replaced by one that leaves letters as typed. The real converter is tested in
// SearchBox.test.jsx.
vi.mock('../lib/roman', () => ({ loadRoman: () => Promise.resolve(), romanReady: () => true, romanToBangla: (roman) => roman }));

const NOT_FOUND = /কোনো ফলাফল পাওয়া যায়নি। বানান পরিবর্তন করে বা অন্য শব্দ দিয়ে খুঁজুন।/;
const BOX = { name: 'খোঁজার শব্দ' };

function Where() {
  const pathname = usePathname();
  const query = useSearchParams().toString();
  return <div data-testid="where">{decodeURIComponent(pathname + (query ? '?' + query : ''))}</div>;
}

function Page() {
  return (
    <SettingsProvider>
      <ToastProvider>
        <SearchPage />
        <Where />
      </ToastProvider>
    </SettingsProvider>
  );
}

function renderSearch(url = '/search') {
  setUrl(url);
  return render(<Page />);
}

const where = () => screen.getByTestId('where');

function serve(files) {
  global.fetch = vi.fn((url) => {
    const found = url in files;
    return Promise.resolve({ ok: found, json: () => Promise.resolve(files[url]) });
  });
}

// `word` matches `count` hadis (BUK-1 ... BUK-count); hadis n has the text "t<n>".
function servePaged(word, count) {
  global.fetch = vi.fn((url) => {
    const ok = (body) => Promise.resolve({ ok: true, json: () => Promise.resolve(body) });
    if (url === `/json/tags/${word.substring(0, 2)}.json`) {
      return ok({ [word]: Array.from({ length: count }, (_, i) => `BUK-${i + 1}`) });
    }
    const hadis = url.match(/\/json\/hadis\/Bukhari\/(\d+)\/text\.txt/);
    if (hadis) return ok(`t${parseInt(hadis[1], 10)}`);
    return Promise.resolve({ ok: false });
  });
}

function search(text) {
  fireEvent.change(screen.getByRole('textbox', BOX), { target: { value: text } });
  fireEvent.click(screen.getByRole('button', { name: 'খুঁজুন' }));
}

afterEach(() => {
  delete global.fetch;
});

describe('the developer switch ?idx=2|3 stays in the address while searching', () => {
  test('a new search keeps a valid idx', () => {
    serve({});
    renderSearch('/search?q=%E0%A6%A8%E0%A6%BE%E0%A6%AE%E0%A6%BE%E0%A6%AF&idx=2');
    search('রোজা');
    expect(where()).toHaveTextContent(/^\/search\?q=রোজা&idx=2$/);
  });

  test('it stays together with the other options in the address', () => {
    serve({});
    renderSearch('/search?q=%E0%A6%A8%E0%A6%BE%E0%A6%AE%E0%A6%BE%E0%A6%AF&idx=3&near=1');
    search('রোজা নামায');
    expect(where()).toHaveTextContent(/^\/search\?q=রোজা\+নামায&near=1&idx=3$/);
  });

  test('a value that is not 2 or 3 is dropped, and no idx adds none', () => {
    serve({});
    renderSearch('/search?q=x&idx=9');
    search('রোজা');
    expect(where()).toHaveTextContent(/^\/search\?q=রোজা$/);
  });

  test('?sub=2|3 and ?cap= stay too', () => {
    serve({});
    renderSearch('/search?q=x&idx=2&sub=3&cap=0&near=1');
    search('রোজা');
    expect(where()).toHaveTextContent(/^\/search\?q=রোজা&near=1&idx=2&sub=3&cap=0$/);
  });

  test('a sub or cap that is not valid is dropped', () => {
    serve({});
    renderSearch('/search?q=x&sub=7&cap=501');
    search('রোজা');
    expect(where()).toHaveTextContent(/^\/search\?q=রোজা$/);
  });
});

test('an empty search does nothing', () => {
  serve({});
  renderSearch();
  search('   ');
  expect(global.fetch).not.toHaveBeenCalled();
  expect(where()).toHaveTextContent(/^\/search$/);
  expect(screen.queryByText('খুঁজছি...')).not.toBeInTheDocument();
  expect(screen.queryByText(NOT_FOUND)).not.toBeInTheDocument();
});

test('shows the results count and the hadis found', async () => {
  serve({
    '/json/tags/fa.json': { fast: ['BUK-1', 'BUK-2'] },
    '/json/hadis/Bukhari/0001/text.txt': 'first hadis text',
    '/json/hadis/Bukhari/0002/text.txt': 'second hadis text',
  });
  renderSearch();
  search('fast');
  expect(await screen.findByText(/মোট ২ টি হাদিস পাওয়া গেছে/)).toBeInTheDocument();
  expect(await screen.findByText(/first hadis text/)).toBeInTheDocument();
  expect(await screen.findByText(/second hadis text/)).toBeInTheDocument();
});

test('a search with no results shows the not-found note and stops loading', async () => {
  serve({});
  renderSearch();
  search('ghost');
  expect(await screen.findByText(NOT_FOUND)).toBeInTheDocument();
  expect(screen.queryByText('খুঁজছি...')).not.toBeInTheDocument();
});

test('has no outdated "type only Bangla" notes, before or after a search', async () => {
  serve({});
  const { container } = renderSearch();
  expect(container.textContent).not.toContain('শুধু বাংলায় লিখে');
  search('ghost');
  await screen.findByText(NOT_FOUND);
  expect(container.textContent).not.toContain('শুধু বাংলায় লিখে');
  expect(container.textContent).not.toContain('কেবল মাত্র');
});

test('does not show the not-found note while the search is still running', async () => {
  let release;
  global.fetch = vi.fn(() => new Promise((resolve) => { release = () => resolve({ ok: false }); }));
  renderSearch();
  search('pending');
  expect(await screen.findByText('খুঁজছি...')).toBeInTheDocument();
  expect(screen.queryByText(NOT_FOUND)).not.toBeInTheDocument();
  await waitFor(() => expect(release).toBeDefined());
  release();
});

test('a slow earlier search cannot overwrite a newer one', async () => {
  let releaseSlow;
  global.fetch = vi.fn((url) => {
    if (url === '/json/tags/sl.json') {
      return new Promise((resolve) => {
        releaseSlow = () => resolve({ ok: true, json: () => Promise.resolve({ slow: ['BUK-7'] }) });
      });
    }
    if (url === '/json/tags/qu.json') {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ quick: ['BUK-1'] }) });
    }
    if (url === '/json/hadis/Bukhari/0001/text.txt') {
      return Promise.resolve({ ok: true, json: () => Promise.resolve('quick result') });
    }
    return Promise.resolve({ ok: false });
  });
  renderSearch();
  search('slow');
  await waitFor(() => expect(releaseSlow).toBeDefined());
  search('quick');
  expect(await screen.findByText(/result/)).toBeInTheDocument();

  await act(async () => {
    releaseSlow();
    await new Promise((resolve) => setTimeout(resolve, 20));
  });

  expect(screen.getByText(/result/)).toBeInTheDocument();
  expect(screen.queryByText(/এই হাদীসটি পাওয়া যায়নি/)).not.toBeInTheDocument();
});

describe('the address bar', () => {
  test('opening a search link runs the search and fills the search box', async () => {
    servePaged('linkword', 2);
    renderSearch('/search?q=linkword');
    expect(screen.getByRole('textbox', BOX)).toHaveValue('linkword');
    expect(await screen.findByText(/মোট ২ টি হাদিস পাওয়া গেছে/)).toBeInTheDocument();
    expect(await screen.findByText('t1')).toBeInTheDocument();
  });

  test('a submitted search is written to the address', async () => {
    servePaged('submitword', 1);
    renderSearch();
    search('  submitword ');
    await screen.findByText('t1');
    expect(where()).toHaveTextContent(/^\/search\?q=submitword$/);
  });

  test('shows the page named in the address', async () => {
    servePaged('pagedword', 45);
    renderSearch('/search?q=pagedword&page=2');
    expect(await screen.findByText('t21')).toBeInTheDocument();
    expect(screen.getByText('t40')).toBeInTheDocument();
    expect(screen.queryByText('t1')).not.toBeInTheDocument();
    expect(screen.queryByText('t41')).not.toBeInTheDocument();
  });

  test('next writes the page to the address and shows it', async () => {
    servePaged('nextword', 45);
    renderSearch('/search?q=nextword');
    await screen.findByText('t1');

    fireEvent.click(screen.getByRole('button', { name: 'পরের' }));

    expect(await screen.findByText('t21')).toBeInTheDocument();
    expect(screen.queryByText('t1')).not.toBeInTheDocument();
    expect(where()).toHaveTextContent(/^\/search\?q=nextword&page=2$/);
  });

  test('a page number past the end shows the last page', async () => {
    servePaged('clampword', 45);
    renderSearch('/search?q=clampword&page=99');
    expect(await screen.findByText('t45')).toBeInTheDocument();
    expect(screen.getByText('t41')).toBeInTheDocument();
    expect(screen.queryByText('t40')).not.toBeInTheDocument();
  });

  test('a new search goes back to the first page', async () => {
    servePaged('oldword', 45);
    renderSearch('/search?q=oldword&page=2');
    await screen.findByText('t21');

    servePaged('zebra', 3);
    search('zebra');

    expect(await screen.findByText(/মোট ৩ টি হাদিস পাওয়া গেছে/)).toBeInTheDocument();
    expect(where()).toHaveTextContent(/^\/search\?q=zebra$/);
  });

  test('clicking an example fills the search box', () => {
    serve({});
    renderSearch();
    fireEvent.click(screen.getByRole('button', { name: 'আবু হুরায়রা' }));
    expect(screen.getByRole('textbox', BOX)).toHaveValue('আবু হুরায়রা');
  });
});

test('in StrictMode a search still downloads each data file only once', async () => {
  servePaged('strictword', 2);
  setUrl('/search?q=strictword');
  render(
    <StrictMode>
      <Page />
    </StrictMode>
  );
  expect(await screen.findByText(/মোট ২ টি হাদিস পাওয়া গেছে/)).toBeInTheDocument();
  const shardRequests = global.fetch.mock.calls.filter(([url]) => url === '/json/tags/st.json');
  expect(shardRequests).toHaveLength(1);
});

const FILLER = Array.from({ length: 300 }, (_, i) => `শব্দ${i}`).join(' ');

test('filter chips show the count per book and narrow the list (book=<id> in the address)', async () => {
  serve({
    '/json/tags/bo.json': { bookword: ['BUK-1', 'BUK-2', 'MUS-5'] },
    '/json/hadis/Bukhari/0001/text.txt': 'b1',
    '/json/hadis/Bukhari/0002/text.txt': 'b2',
    '/json/hadis/Muslim/0005/text.txt': 'm5',
  });
  renderSearch('/search?q=bookword');
  expect(await screen.findByRole('button', { name: /সব\s*৩/ })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /বুখারী\s*২/ })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /মুসলিম\s*১/ })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /আবু দাউদ\s*০/ })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: /মুসলিম\s*১/ }));
  expect(where()).toHaveTextContent(/^\/search\?q=bookword&book=muslim$/);
  expect(await screen.findByText(/মোট ১ টি হাদিস পাওয়া গেছে/)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /বুখারী\s*২/ })).toBeInTheDocument();
  expect(screen.getByText('m5')).toBeInTheDocument();
  expect(screen.queryByText('b1')).not.toBeInTheDocument();
});

test('a book in the address with no hits says so and keeps the filter row', async () => {
  serve({
    '/json/tags/no.json': { nohitword: ['BUK-1'] },
    '/json/hadis/Bukhari/0001/text.txt': 'b1',
  });
  renderSearch('/search?q=nohitword&book=abudawud');
  expect(await screen.findByText(/এই বইয়ে কোনো হাদীস পাওয়া যায়নি/)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /সব\s*১/ })).toBeInTheDocument();
});

test('a result shows a snippet with the matched word highlighted and links to the hadis page', async () => {
  serve({
    '/json/tags/sn.json': { snipword: ['BUK-1'] },
    '/json/hadis/Bukhari/0001/text.txt': `${FILLER} snipword ${FILLER}`,
  });
  renderSearch('/search?q=snipword');
  const mark = await screen.findByText('snipword', { selector: 'mark' });
  expect(mark).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /সম্পূর্ণ হাদীস দেখুন/ })).toHaveAttribute('href', '/hadis/bukhari/1');
});

test('a short hadis is shown whole, without the "full hadis" link', async () => {
  serve({
    '/json/tags/sh.json': { shortword: ['BUK-1'] },
    '/json/hadis/Bukhari/0001/text.txt': 'shortword only',
  });
  renderSearch('/search?q=shortword');
  await screen.findByText('shortword', { selector: 'mark' });
  expect(screen.queryByRole('link', { name: /সম্পূর্ণ হাদীস দেখুন/ })).not.toBeInTheDocument();
});

test('a word spelled with the other form of a letter is highlighted too (Review Focus 4)', async () => {
  const dataSpelling = 'ম\u09df\u09b2\u09be'; // য় as one character, as in some data files
  const querySpelling = 'ম\u09af\u09bc\u09b2\u09be'; // য + nukta, as typed
  global.fetch = vi.fn((url) => {
    const ok = (body) => Promise.resolve({ ok: true, json: () => Promise.resolve(body) });
    const path = decodeURIComponent(url);
    if (path.startsWith('/json/tags/ম\u09af') || path.startsWith('/json/tags/ম\u09df')) return ok({ [dataSpelling]: ['BUK-1'] });
    if (url === '/json/hadis/Bukhari/0001/text.txt') return ok(`এটা ${dataSpelling} কথা`);
    return Promise.resolve({ ok: false });
  });
  renderSearch('/search?q=' + encodeURIComponent(querySpelling));
  const mark = await screen.findByText(dataSpelling, { selector: 'mark' });
  expect(mark).toBeInTheDocument();
});

test('copy on a result copies the whole hadis and confirms it', async () => {
  Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue() } });
  servePaged('copyword', 1);
  renderSearch('/search?q=copyword');
  await screen.findByText('t1');
  fireEvent.click(screen.getByRole('button', { name: 'কপি' }));
  expect(navigator.clipboard.writeText).toHaveBeenCalledWith('t1');
  await waitFor(() => expect(screen.getAllByRole('status').map((e) => e.textContent).join(' ')).toContain('কপি করা হয়েছে'));
});

test('each result has a quiet "শেয়ার" button that opens the share sheet', async () => {
  const native = vi.fn().mockResolvedValue();
  Object.defineProperty(navigator, 'share', { value: native, configurable: true, writable: true });
  servePaged('copyword', 1);
  renderSearch('/search?q=copyword');
  await screen.findByText('t1');
  fireEvent.click(screen.getByRole('button', { name: 'শেয়ার' }));
  await waitFor(() => expect(native).toHaveBeenCalledTimes(1));
  expect(native.mock.calls[0][0]).toMatchObject({ title: 'সহীহ বুখারী, হাদীস নং ১', url: `${window.location.origin}/hadis/bukhari/1` });
  delete navigator.share;
});

test('typing English letters offers no suggestion list under the box', () => {
  renderSearch();
  fireEvent.change(screen.getByRole('textbox', BOX), { target: { value: 'namaz' } });
  expect(screen.queryByRole('group', { name: 'বাংলা প্রস্তাব' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'নামাজ' })).not.toBeInTheDocument();
});

test('the example chips show before the first search, with no red Bengali-only note', () => {
  renderSearch();
  expect(screen.queryByText(/বাংলায় লিখে সার্চ করুন/)).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'নফল নামায' })).toBeInTheDocument();
});

test('the loading indicator says "খুঁজছি..." while a search runs', async () => {
  global.fetch = vi.fn(() => new Promise(() => {}));
  renderSearch('/search?q=slowword');
  expect(await screen.findByText('খুঁজছি...')).toBeInTheDocument();
});

test('the list is an unboxed list of results', async () => {
  servePaged('ordword', 3);
  renderSearch('/search?q=ordword');
  expect(await screen.findAllByRole('listitem')).toHaveLength(3);
});

test('titles: bare, and with the words searched', () => {
  renderSearch();
  expect(document.title).toBe('হাদীস সার্চ - Alhashor');
  serve({});
  renderSearch('/search?q=রোজা');
  expect(document.title).toBe('রোজা - হাদীস সার্চ - Alhashor');
});

test('a narrator-name search highlights the name in the chain when the saying has no match (Review: narrator search)', async () => {
  global.fetch = vi.fn((url) => {
    const ok = (body) => Promise.resolve({ ok: true, json: () => Promise.resolve(body) });
    if (decodeURIComponent(url).startsWith('/json/tags/হু')) return ok({ 'হুরায়রা': ['BUK-1'] });
    if (url === '/json/hadis/Bukhari/0001/text.txt') return ok('১। আবূ হুরায়রা (রাঃ) থেকে বর্ণিত। তিনি বলেন, সত্য কথা বলো।');
    return Promise.resolve({ ok: false });
  });
  renderSearch('/search?q=' + encodeURIComponent('হুরায়রা'));
  expect(await screen.findByText('হুরায়রা', { selector: 'mark' })).toBeInTheDocument();
});

test('the result count and the not-found note are inside one live region that is always on the page', async () => {
  serve({ '/json/tags/zo.json': { zoneword: ['BUK-1'] }, '/json/hadis/Bukhari/0001/text.txt': 'one' });
  renderSearch();
  const region = screen.getAllByRole('status').find((live) => live.classList.contains('search-live'));
  expect(region).toBeInTheDocument();
  search('zoneword');
  await screen.findByText(/মোট ১ টি হাদিস পাওয়া গেছে/);
  expect(region).toHaveTextContent('মোট ১ টি হাদিস পাওয়া গেছে');
});

describe('headings, focus and announcements', () => {
  test('each result\'s actions are described by its title, so 20 "কপি" buttons can be told apart', async () => {
    servePaged('descword', 2);
    renderSearch('/search?q=descword');
    await screen.findByText('t2');
    const first = within(screen.getAllByRole('listitem')[0]);
    const title = first.getAllByRole('link')[0].textContent;
    expect(title).toMatch(/হাদীস নং ১$/);
    for (const name of ['কপি', 'শেয়ার', 'তুলনায় যোগ করুন']) {
      expect(first.getByRole('button', { name })).toHaveAccessibleDescription(title);
    }
    expect(first.getByRole('link', { name: 'হাদীস পাতা' })).toHaveAccessibleDescription(title);
    // the second result is described by its own title
    const second = within(screen.getAllByRole('listitem')[1]);
    expect(second.getByRole('button', { name: 'কপি' })).toHaveAccessibleDescription(/হাদীস নং ২$/);
  });

  test('the page has exactly one h1, named after the page, ahead of the search box', () => {
    serve({});
    renderSearch();
    const h1s = screen.getAllByRole('heading', { level: 1 });
    expect(h1s).toHaveLength(1);
    expect(h1s[0]).toHaveTextContent('হাদীস সার্চ');
    expect(h1s[0]).toHaveClass('sr-only');
    expect(h1s[0].compareDocumentPosition(screen.getByRole('textbox', BOX)) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  test('it is still the only h1 with results on the page', async () => {
    servePaged('oneheading', 3);
    renderSearch('/search?q=oneheading');
    await screen.findByText('t1');
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });

  test('the examples are a named group', () => {
    serve({});
    renderSearch();
    expect(screen.getByRole('group', { name: 'উদাহরণ' })).toBeInTheDocument();
  });

  test('choosing the next page moves focus to the results list', async () => {
    servePaged('focusword', 45);
    renderSearch('/search?q=focusword');
    await screen.findByText('t1');
    fireEvent.click(screen.getByRole('button', { name: 'পরের' }));
    await screen.findByText('t21');
    const list = screen.getByRole('list', { name: 'ফলাফল' });
    expect(list).toHaveAttribute('tabindex', '-1');
    expect(list).toHaveFocus();
  });

  test('the page says which page it moved to', async () => {
    servePaged('sayword', 45);
    renderSearch('/search?q=sayword');
    await screen.findByText('t1');
    fireEvent.click(screen.getByRole('button', { name: 'পরের' }));
    await screen.findByText('t21');
    const live = screen.getAllByRole('status').find((region) => within(region).queryByText('পাতা ২'));
    expect(live).toBeDefined();
  });

  test('a new search does not pull focus away from the search box', async () => {
    servePaged('firstword', 45);
    renderSearch('/search?q=firstword&page=2');
    await screen.findByText('t21');
    servePaged('secondword', 45);
    const box = screen.getByRole('textbox', BOX);
    fireEvent.change(box, { target: { value: 'secondword' } });
    box.focus();
    fireEvent.click(screen.getByRole('button', { name: 'খুঁজুন' }));
    await screen.findByText('t1');
    expect(screen.getByRole('list', { name: 'ফলাফল' })).not.toHaveFocus();
  });

  test('the first view of a page does not take focus', async () => {
    servePaged('xyquietword', 45);
    renderSearch('/search?q=xyquietword&page=2');
    await screen.findByText('t21');
    expect(screen.getByRole('list', { name: 'ফলাফল' })).not.toHaveFocus();
  });
});

describe('result cards, actions and boxed pager (structure)', () => {
  test('a result is a card holding the title link, the text and the actions (after the text)', async () => {
    servePaged('cardword', 2);
    renderSearch('/search?q=cardword');
    await screen.findByText('t1');
    const card = within(screen.getByRole('list', { name: 'ফলাফল' })).getAllByRole('listitem')[0];
    expect(card).toHaveClass('search-item');
    const title = within(card).getByRole('link', { name: /হাদীস নং ১$/ });
    const text = within(card).getByText('t1');
    const copy = within(card).getByRole('button', { name: 'কপি' });
    expect(title.compareDocumentPosition(text) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(text.compareDocumentPosition(copy) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(within(card).getByRole('button', { name: 'শেয়ার' })).toBeInTheDocument();
    expect(within(card).getByRole('button', { name: 'তুলনায় যোগ করুন' })).toBeInTheDocument();
    expect(within(card).getByRole('link', { name: 'হাদীস পাতা' })).toHaveClass('primary');
  });

  test('the pager is one named container with filled previous and next buttons that have arrow icons', async () => {
    servePaged('qzpager', 45);
    renderSearch('/search?q=qzpager');
    await screen.findByText('t1');
    const nav = screen.getByRole('navigation', { name: 'পাতা' });
    const prev = within(nav).getByRole('button', { name: 'আগের' });
    const next = within(nav).getByRole('button', { name: 'পরের' });
    expect(prev).toHaveClass('search-pager-btn');
    expect(next).toHaveClass('search-pager-btn');
    expect(prev).toBeDisabled();
    expect(within(nav).getAllByRole('button')).toHaveLength(2);
    expect(within(nav).getByText('পাতা ১ / ৩')).toHaveClass('search-pager-label');
  });
});
