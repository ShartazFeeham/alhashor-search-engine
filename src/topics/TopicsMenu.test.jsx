/* eslint-disable testing-library/no-node-access */
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { SettingsProvider } from '../settings/SettingsProvider';
import { ToastProvider } from '../ui/Toast';
import { getUrl, setUrl } from '../test/nextNavigation';
import TopicsPage from './TopicsPage';

// The menu is one element: a sidebar from 900px wide, a full-screen overlay under it.
let width;
const media = (query) => {
  const min = Number(/min-width:\s*(\d+)px/.exec(query)?.[1] ?? 0);
  return { matches: width >= min, media: query, addEventListener() {}, removeEventListener() {} };
};

beforeEach(() => {
  serveTwo();
  window.matchMedia = media;
});
afterEach(async () => {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  delete window.matchMedia;
  delete global.fetch;
  document.body.style.overflow = '';
});

// Every topic is a search: two Bukhari hadis match whatever word is searched.
function serveTwo() {
  global.fetch = vi.fn((url) => {
    const ok = (body) => Promise.resolve({ ok: true, json: () => Promise.resolve(body) });
    const tags = url.match(/\/json\/tags\/(.+)\.json$/);
    if (tags) return ok(Object.fromEntries(['ঈমান', 'নামায'].map((word) => [word, ['BUK-1', 'BUK-2']])));
    if (/\/text\.txt$/.test(url)) return ok('একটি হাদীস');
    return Promise.resolve({ ok: false });
  });
}
function show(address, w) {
  width = w;
  setUrl(address);
  return render(
    <SettingsProvider>
      <ToastProvider>
        <TopicsPage />
      </ToastProvider>
    </SettingsProvider>
  );
}
const dialog = () => screen.queryByRole('dialog', { name: 'বিষয়সূচি' });
const opener = () => screen.queryByRole('button', { name: 'বিষয়সূচি' });
const address = () => decodeURIComponent(getUrl().pathname + getUrl().search);

describe('on a desktop (900px and wider)', () => {
  test('the menu is always open once, with no overlay and no opener button', () => {
    show('/topics?topic=ঈমান', 1470);
    expect(dialog()).not.toBeInTheDocument();
    expect(opener()).not.toBeInTheDocument();
    expect(screen.getAllByRole('textbox', { name: 'বিষয় খুঁজুন' })).toHaveLength(1);
    expect(screen.getAllByRole('combobox', { name: 'সাজান' })).toHaveLength(1);
    expect(screen.getAllByRole('navigation', { name: 'বিষয়সূচি' })).toHaveLength(1);
    expect(screen.getByRole('link', { name: 'ঈমান' })).toHaveAttribute('aria-current', 'page');
  });

  test('is there too with no topic chosen, with the prompt on the right', () => {
    show('/topics', 900);
    expect(screen.getAllByRole('navigation', { name: 'বিষয়সূচি' })).toHaveLength(1);
    expect(screen.getByText('একটি বিষয় বেছে নিন')).toBeInTheDocument();
    expect(opener()).not.toBeInTheDocument();
  });

  test('choosing a topic goes to /topics?topic=... and keeps the menu', async () => {
    show('/topics', 1200);
    fireEvent.click(screen.getByRole('link', { name: 'নামায' }));
    expect(address()).toBe('/topics?topic=নামায');
    expect(screen.getAllByRole('navigation', { name: 'বিষয়সূচি' })).toHaveLength(1);
    expect(await screen.findByText(/মোট ২ টি হাদিস/)).toBeInTheDocument();
  });

  test('the sort stays in the address and the pager links and the topic links keep it', async () => {
    show('/topics?topic=ঈমান', 1200);
    fireEvent.change(screen.getByRole('combobox', { name: 'সাজান' }), { target: { value: 'desc' } });
    expect(address()).toBe('/topics?topic=ঈমান&sort=desc');
    expect(screen.getByRole('combobox', { name: 'সাজান' })).toHaveValue('desc');
    expect(decodeURIComponent(screen.getByRole('link', { name: 'নামায' }).getAttribute('href'))).toBe('/topics?topic=নামায&sort=desc');
    await screen.findByText(/মোট ২ টি হাদিস/);
  });
});

describe('on a phone (under 900px)', () => {
  test('with no topic the overlay is open by default: a modal dialog with focus inside, background scroll locked', () => {
    show('/topics', 390);
    const box = dialog();
    expect(box).toBeInTheDocument();
    expect(box).toHaveAttribute('aria-modal', 'true');
    expect(box).toContainElement(document.activeElement);
    expect(within(box).getByRole('textbox', { name: 'বিষয় খুঁজুন' })).toBeInTheDocument();
    expect(within(box).getByRole('button', { name: 'বন্ধ করুন' })).toHaveTextContent('×');
    expect(document.body.style.overflow).toBe('hidden');
    expect(screen.getAllByRole('textbox', { name: 'বিষয় খুঁজুন' })).toHaveLength(1);
  });

  test('with a topic the overlay is closed, the page shows its hadis and a slim button at the top reopens it', async () => {
    show('/topics?topic=ঈমান', 390);
    expect(dialog()).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: 'বিষয় খুঁজুন' })).not.toBeInTheDocument();
    expect(document.body.style.overflow).not.toBe('hidden');
    expect(await screen.findByText(/মোট ২ টি হাদিস/)).toBeInTheDocument();
    const main = screen.getByRole('main');
    const button = opener();
    expect(button).toBeInTheDocument();
    // the button comes before the topic's heading
    expect(button.compareDocumentPosition(screen.getByRole('heading', { level: 2, name: 'ঈমান' })) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(main).toContainElement(button);
    fireEvent.click(button);
    expect(dialog()).toBeInTheDocument();
    expect(document.body.style.overflow).toBe('hidden');
  });

  test('choosing a topic in the overlay closes it and shows that topic', async () => {
    show('/topics', 390);
    fireEvent.click(within(dialog()).getByRole('link', { name: 'নামায' }));
    expect(address()).toBe('/topics?topic=নামায');
    expect(dialog()).not.toBeInTheDocument();
    expect(await screen.findByText(/মোট ২ টি হাদিস/)).toBeInTheDocument();
    expect(opener()).toBeInTheDocument();
  });

  test('Escape closes the overlay and focus returns to the button that opened it', async () => {
    show('/topics?topic=ঈমান', 390);
    const button = opener();
    button.focus();
    fireEvent.click(button);
    fireEvent.keyDown(dialog(), { key: 'Escape' });
    expect(dialog()).not.toBeInTheDocument();
    expect(opener()).toHaveFocus();
    await screen.findByText(/মোট ২ টি হাদিস/);
  });

  test('the × button closes it too', () => {
    show('/topics?topic=ঈমান', 390);
    fireEvent.click(opener());
    fireEvent.click(within(dialog()).getByRole('button', { name: 'বন্ধ করুন' }));
    expect(dialog()).not.toBeInTheDocument();
    expect(opener()).toHaveFocus();
  });

  test('closing it with no topic chosen leaves a prompt with the same button', () => {
    show('/topics', 390);
    fireEvent.click(within(dialog()).getByRole('button', { name: 'বন্ধ করুন' }));
    expect(dialog()).not.toBeInTheDocument();
    expect(screen.getByText('একটি বিষয় বেছে নিন')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'বিষয়সূচি' })).toHaveLength(1);
    expect(opener()).toHaveFocus();
    fireEvent.click(opener());
    expect(dialog()).toBeInTheDocument();
  });

  test('Tab inside the overlay stays inside it', () => {
    show('/topics', 390);
    const box = dialog();
    const last = [...box.querySelectorAll('a[href],button,input,select')].pop();
    last.focus();
    fireEvent.keyDown(box, { key: 'Tab' });
    expect(box).toContainElement(document.activeElement);
    expect(document.activeElement).not.toBe(last);
  });
});
