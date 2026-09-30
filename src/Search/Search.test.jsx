import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import Search from './Search';

const NOT_FOUND = /কোনো ফলাফল না পাওয়া গেলে/;

function Where() {
  const location = useLocation();
  return <div data-testid="where">{decodeURIComponent(location.pathname + location.search)}</div>;
}

function renderSearch(url = '/search') {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <Search />
      <Where />
    </MemoryRouter>
  );
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
  fireEvent.change(screen.getByRole('textbox'), { target: { value: text } });
  fireEvent.click(screen.getByDisplayValue('Search'));
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
  expect(screen.queryByAltText('loading...')).not.toBeInTheDocument();
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
  expect(await screen.findByText('first')).toBeInTheDocument();
  expect(await screen.findByText('second')).toBeInTheDocument();
});

test('a search with no results shows the not-found note and stops loading', async () => {
  serve({});
  renderSearch();
  search('ghost');
  expect(await screen.findByText(NOT_FOUND)).toBeInTheDocument();
  expect(screen.queryByAltText('loading...')).not.toBeInTheDocument();
});

test('does not show the not-found note while the search is still running', async () => {
  let release;
  global.fetch = vi.fn(() => new Promise((resolve) => { release = () => resolve({ ok: false }); }));
  renderSearch();
  search('pending');
  expect(await screen.findByAltText('loading...')).toBeInTheDocument();
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
  expect(await screen.findByText('result')).toBeInTheDocument();

  await act(async () => {
    releaseSlow();
    await new Promise((resolve) => setTimeout(resolve, 20));
  });

  expect(screen.getByText('result')).toBeInTheDocument();
  expect(screen.queryByText(/লোড করা যায়নি/)).not.toBeInTheDocument();
});

describe('the address bar', () => {
  test('opening a search link runs the search and fills the search box', async () => {
    servePaged('linkword', 2);
    renderSearch('/search?q=linkword');
    expect(screen.getByRole('textbox')).toHaveValue('linkword');
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

    fireEvent.click(screen.getByText(/পরের পৃষ্ঠা/));

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

  test('clicking a suggestion fills the search box', () => {
    serve({});
    renderSearch();
    fireEvent.click(screen.getByText('আবু হুরায়রা'));
    expect(screen.getByRole('textbox')).toHaveValue('আবু হুরায়রা');
  });
});
