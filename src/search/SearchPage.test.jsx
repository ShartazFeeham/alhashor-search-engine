import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { StrictMode } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { SettingsProvider } from '../settings/SettingsProvider';
import { setUrl } from '../test/nextNavigation';
import { ToastProvider } from '../ui/Toast';
import SearchPage from './SearchPage';

const NOT_FOUND = /কোনো ফলাফল না পাওয়া গেলে/;
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

test('typing Roman letters offers Bengali spellings that fill the box', async () => {
  renderSearch();
  fireEvent.change(screen.getByRole('textbox', BOX), { target: { value: 'namaz' } });
  fireEvent.click(await screen.findByRole('button', { name: 'নামাজ' }));
  expect(screen.getByRole('textbox', BOX)).toHaveValue('নামাজ');
});

test('the Bengali-only note and the example chips show before the first search', () => {
  renderSearch();
  expect(screen.getByText(/বাংলায় লিখে সার্চ করুন/)).toBeInTheDocument();
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
  expect(document.title).toBe('হাদীস সার্চ - BoiKotha');
  serve({});
  renderSearch('/search?q=রোজা');
  expect(document.title).toBe('রোজা - হাদীস সার্চ - BoiKotha');
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
  const [region] = screen.getAllByRole('status'); // the page's own region comes before the toast's
  expect(region).toBeInTheDocument();
  search('zoneword');
  await screen.findByText(/মোট ১ টি হাদিস পাওয়া গেছে/);
  expect(region).toHaveTextContent('মোট ১ টি হাদিস পাওয়া গেছে');
});
