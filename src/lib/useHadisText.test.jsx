import { fireEvent, render, screen } from '@testing-library/react';
import { loadHadisText, useHadisText } from './useHadisText';

function Probe({ tag }) {
  const { status, text } = useHadisText(tag);
  return <div data-testid="out">{status}:{text}</div>;
}

afterEach(() => {
  delete global.fetch;
});

function serve(map) {
  global.fetch = vi.fn((url) => {
    if (url in map) return Promise.resolve({ ok: true, json: () => Promise.resolve(map[url]) });
    return Promise.resolve({ ok: false, status: 404 });
  });
}

// Each test uses its own tags: loaded texts are cached for the whole session.

test('loads a hadis text', async () => {
  serve({ '/json/hadis/Bukhari/0001/text.txt': 'এক দুই' });
  render(<Probe tag="BUK-1" />);
  expect(screen.getByTestId('out')).toHaveTextContent('loading:');
  expect(await screen.findByText('ok:এক দুই')).toBeInTheDocument();
});

test('a number with no data file is "missing", not an error or a spinner (Review Focus 2)', async () => {
  serve({});
  render(<Probe tag="BUK-63" />);
  expect(await screen.findByText('missing:')).toBeInTheDocument();
});

test('an unknown book is "missing"', async () => {
  serve({});
  render(<Probe tag="XXX-1" />);
  expect(await screen.findByText('missing:')).toBeInTheDocument();
});

test('a network failure is an "error" and is retried on the next request', async () => {
  let calls = 0;
  global.fetch = vi.fn(() => {
    calls++;
    return calls === 1 ? Promise.reject(new Error('offline')) : Promise.resolve({ ok: true, json: () => Promise.resolve('ok text') });
  });
  expect(await loadHadisText('MUS-7')).toEqual({ status: 'error' });
  expect(await loadHadisText('MUS-7')).toEqual({ status: 'ok', text: 'ok text' });
});

test('a text is fetched once however often it is asked for', async () => {
  serve({ '/json/hadis/Daud/0203/text.txt': 'দাউদ' });
  await loadHadisText('DAU-203');
  await loadHadisText('DAU-203');
  expect(global.fetch).toHaveBeenCalledTimes(1);
});

test('changing the tag loads the new text', async () => {
  serve({
    '/json/hadis/Bukhari/0021/text.txt': 'প্রথম',
    '/json/hadis/Bukhari/0022/text.txt': 'দ্বিতীয়',
  });
  const { rerender } = render(<Probe tag="BUK-21" />);
  await screen.findByText('ok:প্রথম');
  rerender(<Probe tag="BUK-22" />);
  expect(await screen.findByText('ok:দ্বিতীয়')).toBeInTheDocument();
});

test('retry loads the text again after an error', async () => {
  let calls = 0;
  global.fetch = vi.fn(() => {
    calls++;
    return calls === 1 ? Promise.reject(new Error('offline')) : Promise.resolve({ ok: true, json: () => Promise.resolve('back online') });
  });
  function RetryProbe() {
    const { status, text, retry } = useHadisText('MUS-9');
    return (
      <div>
        <div data-testid="out">{status}:{text}</div>
        <button onClick={retry}>retry</button>
      </div>
    );
  }
  render(<RetryProbe />);
  expect(await screen.findByText('error:')).toBeInTheDocument();
  fireEvent.click(screen.getByText('retry'));
  expect(await screen.findByText('ok:back online')).toBeInTheDocument();
});
