import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import HadisView from './HadisView';

const MORE = 'সম্পূর্ণ হাদীস দেখুন...';
const longText = (label) => Array.from({ length: 200 }, (_, i) => `${label}${i}`).join(' ');

function serve(texts) {
  global.fetch = vi.fn((url) => {
    const text = texts[url];
    return Promise.resolve({
      ok: text !== undefined,
      json: () => Promise.resolve(text),
    });
  });
}

afterEach(() => {
  delete global.fetch;
});

test('fetches a hadis text once, however many times it renders', async () => {
  serve({ '/json/hadis/Bukhari/0001/text.txt': 'alpha beta' });
  const { rerender } = render(<HadisView tag="BUK-1" words={[]} />);
  await screen.findByText('alpha');
  rerender(<HadisView tag="BUK-1" words={['beta']} />);
  expect(global.fetch).toHaveBeenCalledTimes(1);
});

test('fetches the new text when the tag changes', async () => {
  serve({
    '/json/hadis/Bukhari/0001/text.txt': 'first hadis',
    '/json/hadis/Bukhari/0002/text.txt': 'second hadis',
  });
  const { rerender } = render(<HadisView tag="BUK-1" words={[]} />);
  await screen.findByText('first');
  rerender(<HadisView tag="BUK-2" words={[]} />);
  await screen.findByText('second');
  expect(global.fetch).toHaveBeenCalledTimes(2);
});

test('expanding one long hadis does not change how another is cut', async () => {
  serve({
    '/json/hadis/Bukhari/0001/text.txt': longText('a'),
    '/json/hadis/Bukhari/0002/text.txt': longText('b'),
    '/json/hadis/Bukhari/0003/text.txt': longText('c'),
  });
  const { rerender } = render(
    <>
      <HadisView tag="BUK-1" words={[]} />
      <HadisView tag="BUK-2" words={[]} />
    </>
  );
  await waitFor(() => expect(screen.getAllByText(MORE)).toHaveLength(2));

  fireEvent.click(screen.getAllByText(MORE)[0]);
  await waitFor(() => expect(screen.getAllByText(MORE)).toHaveLength(1));

  rerender(
    <>
      <HadisView tag="BUK-1" words={[]} />
      <HadisView tag="BUK-2" words={[]} />
      <HadisView tag="BUK-3" words={[]} />
    </>
  );
  await waitFor(() => expect(screen.getAllByText(MORE)).toHaveLength(2));
});

test('shows a message instead of loading forever when the text is missing', async () => {
  serve({});
  render(<HadisView tag="BUK-9999" words={[]} />);
  expect(await screen.findByText(/লোড করা যায়নি/)).toBeInTheDocument();
});

test('copies the text it already loaded without fetching again', async () => {
  serve({ '/json/hadis/Bukhari/0001/text.txt': 'alpha beta' });
  const writeText = vi.fn().mockResolvedValue();
  Object.assign(navigator, { clipboard: { writeText } });
  window.alert = vi.fn();
  render(<HadisView tag="BUK-1" words={[]} />);
  await screen.findByText('alpha');

  fireEvent.click(screen.getByText('Copy'));

  await waitFor(() => expect(writeText).toHaveBeenCalledWith('alpha beta'));
  expect(global.fetch).toHaveBeenCalledTimes(1);
});

test('copying shows a short message instead of an alert', async () => {
  serve({ '/json/hadis/Bukhari/0001/text.txt': 'alpha beta' });
  Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue() } });
  window.alert = vi.fn();
  render(<HadisView tag="BUK-1" words={[]} />);
  await screen.findByText('alpha');

  // fake timers only around the click: the note must disappear by itself
  vi.useFakeTimers();
  try {
    fireEvent.click(screen.getByText('Copy'));
    expect(screen.getByText('কপি করা হয়েছে')).toBeInTheDocument();
    expect(window.alert).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(2500);
    });
    expect(screen.queryByText('কপি করা হয়েছে')).not.toBeInTheDocument();
  } finally {
    vi.useRealTimers();
  }
});

test('copy and see-more work from the keyboard', async () => {
  serve({ '/json/hadis/Bukhari/0001/text.txt': longText('a') });
  const writeText = vi.fn().mockResolvedValue();
  Object.assign(navigator, { clipboard: { writeText } });
  render(<HadisView tag="BUK-1" words={[]} />);
  await screen.findByText(MORE);

  fireEvent.keyDown(screen.getByText('Copy'), { key: 'Enter' });
  expect(writeText).toHaveBeenCalled();

  fireEvent.keyDown(screen.getByText(MORE), { key: 'Enter' });
  expect(screen.queryByText(MORE)).not.toBeInTheDocument();
});
