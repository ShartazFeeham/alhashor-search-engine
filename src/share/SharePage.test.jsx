import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { bookById } from '../lib/books';
import { shareText } from '../lib/share';
import { SettingsProvider } from '../settings/SettingsProvider';
import { stubCanvas } from '../test/canvasStub';
import { ToastProvider } from '../ui/Toast';
import SharePage from './SharePage';

const BUKHARI_6628 = JSON.parse(readFileSync('public/json/hadis/Bukhari/6628/text.txt', 'utf8'));
const BUKHARI_6 = JSON.parse(readFileSync('public/json/hadis/Bukhari/0006/text.txt', 'utf8'));
const bukhari = bookById('bukhari');
const URL_6628 = `${window.location.origin}/hadis/bukhari/6628`;
const CITE = 'সহীহ বুখারী, হাদীস নং ৬,৬২৮';

function serve(map) {
  global.fetch = vi.fn((url) =>
    url in map
      ? Promise.resolve({ ok: true, json: () => Promise.resolve(map[url]) })
      : Promise.resolve({ ok: false, status: 404 })
  );
}

const show = (bookId = 'bukhari', number = 6628) =>
  render(
    <SettingsProvider>
      <ToastProvider>
        <SharePage bookId={bookId} number={number} />
      </ToastProvider>
    </SettingsProvider>
  );

const setNavigator = (name, value) => Object.defineProperty(navigator, name, { value, configurable: true, writable: true });

let stub;
let anchors;
beforeEach(() => {
  stub = stubCanvas();
  anchors = [];
  URL.createObjectURL = vi.fn(() => 'blob:card');
  URL.revokeObjectURL = vi.fn();
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function click() {
    anchors.push({ href: this.href, download: this.download });
  });
  Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue() } });
  serve({ '/json/hadis/Bukhari/6628/text.txt': BUKHARI_6628, '/json/hadis/Bukhari/0006/text.txt': BUKHARI_6 });
});

afterEach(() => {
  vi.restoreAllMocks();
  delete navigator.share;
  delete navigator.canShare;
  delete document.fonts;
  delete URL.createObjectURL;
  delete URL.revokeObjectURL;
  delete global.fetch;
});

// The card is drawn once the fonts are ready; the image buttons wait for that.
const ready = () => waitFor(() => expect(screen.getByRole('button', { name: 'ছবি ডাউনলোড' })).toBeEnabled());

test('names the page and the hadis, shows a placeholder while the text loads', async () => {
  show();
  expect(screen.getByLabelText('লোড হচ্ছে')).toBeInTheDocument();
  expect(await screen.findByRole('heading', { level: 1, name: 'শেয়ার করুন' })).toBeInTheDocument();
  expect(screen.getByText('বুখারী শরীফ - হাদীস নং ৬,৬২৮')).toBeInTheDocument();
  expect(document.title).toBe('শেয়ার - বুখারী শরীফ - হাদীস নং ৬,৬২৮ - Alhashor');
});

test('previews the card as a picture described by its text', async () => {
  show();
  const preview = await screen.findByRole('img');
  expect(preview.tagName).toBe('CANVAS');
  expect(preview.getAttribute('aria-label')).toContain('বর্তমান যুগের মুনাফিকরা');
  await ready();
});

test('links back to the hadis page', async () => {
  show();
  expect(await screen.findByRole('link', { name: /হাদীসে ফিরুন/ })).toHaveAttribute('href', '/hadis/bukhari/6628');
});

test('a number with no file says so and offers no card', async () => {
  serve({});
  show('bukhari', 63);
  expect(await screen.findByText(/এই হাদীসটি পাওয়া যায়নি/)).toBeInTheDocument();
  expect(screen.queryByRole('img')).not.toBeInTheDocument();
});

test('a network failure offers another try', async () => {
  global.fetch = vi.fn(() => Promise.reject(new Error('offline')));
  show();
  expect(await screen.findByRole('button', { name: 'আবার চেষ্টা করুন' })).toBeInTheDocument();
  serve({ '/json/hadis/Bukhari/6628/text.txt': BUKHARI_6628 });
  fireEvent.click(screen.getByRole('button', { name: 'আবার চেষ্টা করুন' }));
  expect(await screen.findByRole('img')).toBeInTheDocument();
});

describe('card size', () => {
  test('has no size or shape control: the width is fixed and the height follows the text', async () => {
    show();
    const canvas = await screen.findByRole('img');
    await ready();
    expect(canvas).toHaveAttribute('width', '1080');
    expect(screen.queryByRole('group', { name: 'কার্ডের মাপ' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /বর্গ|লম্বা|মাপ/ })).not.toBeInTheDocument();
    expect(screen.queryByText(/১,০৮০|1080/)).not.toBeInTheDocument();
    expect(Number(canvas.getAttribute('height'))).toBeGreaterThan(0);
  });
});

describe('image buttons', () => {
  test('wait until the card is drawn, so no half-empty picture is saved', async () => {
    let release;
    const loading = new Promise((resolve) => { release = resolve; });
    document.fonts = { load: vi.fn(() => loading) };
    show();
    await screen.findByRole('img');
    expect(screen.getByRole('button', { name: 'ছবি ডাউনলোড' })).toBeDisabled();
    release([]);
    await ready();
  });

  test('download saves the card as a PNG named for the hadis and says so', async () => {
    show();
    await ready();
    fireEvent.click(screen.getByRole('button', { name: 'ছবি ডাউনলোড' }));
    await waitFor(() => expect(anchors).toHaveLength(1));
    expect(anchors[0]).toEqual({ href: 'blob:card', download: 'alhashor-bukhari-6628.png' });
    expect(HTMLCanvasElement.prototype.toBlob).toHaveBeenCalledWith(expect.any(Function), 'image/png');
    expect(await screen.findByText('ছবি ডাউনলোড হচ্ছে')).toBeInTheDocument();
  });

  test('download says so when the browser cannot make the picture', async () => {
    HTMLCanvasElement.prototype.toBlob.mockImplementation((callback) => callback(null));
    show();
    await ready();
    fireEvent.click(screen.getByRole('button', { name: 'ছবি ডাউনলোড' }));
    expect(await screen.findByText('ছবি বানানো যায়নি')).toBeInTheDocument();
    expect(anchors).toHaveLength(0);
  });

  test('image share is not offered where the browser cannot share files', async () => {
    show();
    await ready();
    expect(screen.queryByRole('button', { name: 'ছবি শেয়ার' })).not.toBeInTheDocument();
  });

  test('image share is not offered when canShare says no to files', async () => {
    setNavigator('share', vi.fn());
    setNavigator('canShare', vi.fn(() => false));
    show();
    await ready();
    expect(screen.queryByRole('button', { name: 'ছবি শেয়ার' })).not.toBeInTheDocument();
  });

  test('image share sends the picture as a file with the citation and link', async () => {
    const native = vi.fn().mockResolvedValue();
    setNavigator('share', native);
    setNavigator('canShare', vi.fn(({ files }) => Array.isArray(files) && files.length > 0));
    show();
    await ready();
    fireEvent.click(await screen.findByRole('button', { name: 'ছবি শেয়ার' }));
    await waitFor(() => expect(native).toHaveBeenCalledTimes(1));
    const data = native.mock.calls[0][0];
    expect(data.files).toHaveLength(1);
    expect(data.files[0]).toBeInstanceOf(File);
    expect(data.files[0].name).toBe('alhashor-bukhari-6628.png');
    expect(data.files[0].type).toBe('image/png');
    expect(data.title).toBe(CITE);
    expect(data.text).toBe(`${CITE}\n${URL_6628}`);
  });

  test('a cancelled image share says nothing', async () => {
    setNavigator('share', vi.fn().mockRejectedValue(new DOMException('cancelled', 'AbortError')));
    setNavigator('canShare', vi.fn(() => true));
    show();
    await ready();
    fireEvent.click(await screen.findByRole('button', { name: 'ছবি শেয়ার' }));
    await waitFor(() => expect(navigator.share).toHaveBeenCalled());
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(screen.getByRole('status').textContent).toBe('');
  });

  test('a failed image share says so', async () => {
    setNavigator('share', vi.fn().mockRejectedValue(new Error('boom')));
    setNavigator('canShare', vi.fn(() => true));
    show();
    await ready();
    fireEvent.click(await screen.findByRole('button', { name: 'ছবি শেয়ার' }));
    expect(await screen.findByText('ছবি শেয়ার করা যায়নি')).toBeInTheDocument();
  });
});

describe('text and link', () => {
  test('shows the share text that "টেক্সট কপি" copies, with the permanent link', async () => {
    show();
    await screen.findByRole('img');
    const expected = shareText({ book: bukhari, number: 6628, text: BUKHARI_6628, url: URL_6628 });
    expect(screen.getByTestId('share-text').textContent).toBe(expected);
    fireEvent.click(screen.getByRole('button', { name: 'টেক্সট কপি' }));
    await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalledWith(expected));
    expect(await screen.findByText('টেক্সট কপি করা হয়েছে')).toBeInTheDocument();
    await ready();
  });

  test('"লিংক কপি" copies the permanent link', async () => {
    show();
    await screen.findByRole('img');
    fireEvent.click(screen.getByRole('button', { name: 'লিংক কপি' }));
    await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalledWith(URL_6628));
    expect(await screen.findByText('লিংক কপি করা হয়েছে')).toBeInTheDocument();
    await ready();
  });

  test('the citation box shows the citation and copies it', async () => {
    show();
    await screen.findByRole('img');
    expect(screen.getByTestId('citebox')).toHaveTextContent(CITE);
    fireEvent.click(screen.getByRole('button', { name: 'উদ্ধৃতি কপি' }));
    await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalledWith(CITE));
    await ready();
  });

  test('a blocked clipboard says so', async () => {
    navigator.clipboard.writeText.mockRejectedValue(new Error('blocked'));
    show();
    await screen.findByRole('img');
    fireEvent.click(screen.getByRole('button', { name: 'লিংক কপি' }));
    expect(await screen.findByText('কপি করা যায়নি')).toBeInTheDocument();
    await ready();
  });
});

test('a long hadis is on the picture whole, so there is no excerpt note and no link line', async () => {
  show('bukhari', 6);
  await ready();
  expect(screen.queryByText(/ছবিতে হাদীসের শুরুর অংশ/)).not.toBeInTheDocument();
  expect(stub.texts.some((t) => t.text.startsWith('সম্পূর্ণ হাদীস:'))).toBe(false);
  expect(Number(screen.getByRole('img').getAttribute('height'))).toBeGreaterThan(1080);
});

test('a short hadis has no excerpt note', async () => {
  show();
  await ready();
  expect(screen.queryByText(/ছবিতে হাদীসের শুরুর অংশ/)).not.toBeInTheDocument();
});
