import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import Search from './Search';

const NOT_FOUND = /কোনো ফলাফল না পাওয়া গেলে/;

function serve(files) {
  global.fetch = jest.fn((url) => {
    const found = url in files;
    return Promise.resolve({ ok: found, json: () => Promise.resolve(files[url]) });
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
  render(<Search />);
  search('   ');
  expect(global.fetch).not.toHaveBeenCalled();
  expect(screen.queryByAltText('loading...')).not.toBeInTheDocument();
  expect(screen.queryByText(NOT_FOUND)).not.toBeInTheDocument();
});

test('shows the results count and the hadis found', async () => {
  serve({
    '/json/tags/fa.json': { fast: ['BUK-1', 'BUK-2'] },
    '/json/hadis/Bukhari/0001/text.txt': 'first hadis text',
    '/json/hadis/Bukhari/0002/text.txt': 'second hadis text',
  });
  render(<Search />);
  search('fast');
  expect(await screen.findByText(/মোট ২ টি হাদিস পাওয়া গেছে/)).toBeInTheDocument();
  expect(await screen.findByText('first')).toBeInTheDocument();
  expect(await screen.findByText('second')).toBeInTheDocument();
});

test('a search with no results shows the not-found note and stops loading', async () => {
  serve({});
  render(<Search />);
  search('ghost');
  expect(await screen.findByText(NOT_FOUND)).toBeInTheDocument();
  expect(screen.queryByAltText('loading...')).not.toBeInTheDocument();
});

test('does not show the not-found note while the search is still running', async () => {
  let release;
  global.fetch = jest.fn(() => new Promise((resolve) => { release = () => resolve({ ok: false }); }));
  render(<Search />);
  search('pending');
  expect(await screen.findByAltText('loading...')).toBeInTheDocument();
  expect(screen.queryByText(NOT_FOUND)).not.toBeInTheDocument();
  await waitFor(() => expect(release).toBeDefined());
  release();
});

test('a slow earlier search cannot overwrite a newer one', async () => {
  let releaseSlow;
  global.fetch = jest.fn((url) => {
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
  render(<Search />);
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
