/* eslint-disable testing-library/no-node-access */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { normalizeBengali } from '../Helpers/bengali';
import { clearNarratorCache } from '../lib/narrators';
import { groupTopics } from '../lib/topicBlocks';
import { SettingsProvider } from '../settings/SettingsProvider';
import { getUrl, setUrl } from '../test/nextNavigation';
import { serveRealData } from '../test/publicJson';
import { ToastProvider } from '../ui/Toast';
import NarratorsPage from './NarratorsPage';

// The same menu as /topics (see src/topics/TopicsMenu.test.jsx), with the real narrators.
vi.setConfig({ testTimeout: 30000 });
const INDEX = JSON.parse(readFileSync(path.resolve(process.cwd(), 'public/json/narrators/index.json'), 'utf8'));
const ABU_HURAYRAH = INDEX.find((row) => row[0] === 'abu-hurayrah');
const NAMES = INDEX.map((row) => row[1]);
const digits = (n) => n.toLocaleString('en-US').replace(/\d/g, (d) => '০১২৩৪৫৬৭৮৯'[d]);

let width;
const media = (query) => {
  const min = Number(/min-width:\s*(\d+)px/.exec(query)?.[1] ?? 0);
  return { matches: width >= min, media: query, addEventListener() {}, removeEventListener() {} };
};

beforeEach(() => {
  clearNarratorCache();
  serveRealData();
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

function show(address, w) {
  width = w;
  setUrl(address);
  return render(
    <SettingsProvider>
      <ToastProvider>
        <NarratorsPage />
      </ToastProvider>
    </SettingsProvider>
  );
}
const dialog = () => screen.queryByRole('dialog', { name: 'বর্ণনাকারীসূচি' });
const opener = () => screen.queryByRole('button', { name: 'বর্ণনাকারীসূচি' });
const address = () => decodeURIComponent(getUrl().pathname + getUrl().search);
const menu = () => screen.getByRole('navigation', { name: 'বর্ণনাকারীসূচি' });
const chips = () => within(menu()).getAllByRole('link');
const box = () => screen.getByRole('textbox', { name: 'বর্ণনাকারী খুঁজুন' });
const sortBox = () => screen.getByRole('combobox', { name: 'সাজান' });
const headings = () => within(menu()).getAllByRole('heading', { level: 3 }).map((h) => h.textContent);
const loaded = () => screen.findByRole('link', { name: 'আবূ হুরায়রা' });

describe('the menu on a desktop (900px and wider)', () => {
  test('is always open, once, with the search, the sort and no overlay or opener button', async () => {
    show('/narrators?name=abu-hurayrah', 1470);
    await loaded();
    expect(dialog()).not.toBeInTheDocument();
    expect(opener()).not.toBeInTheDocument();
    expect(screen.getAllByRole('textbox', { name: 'বর্ণনাকারী খুঁজুন' })).toHaveLength(1);
    expect(screen.getAllByRole('combobox', { name: 'সাজান' })).toHaveLength(1);
    expect(screen.getAllByRole('navigation', { name: 'বর্ণনাকারীসূচি' })).toHaveLength(1);
    expect(box().getAttribute('placeholder')).toBe('বর্ণনাকারী খুঁজুন');
  });

  test('lists every narrator once as a compact chip, in blocks with a heading for the first letter', async () => {
    show('/narrators', 1200);
    await loaded();
    expect(chips()).toHaveLength(INDEX.length);
    expect(chips().every((chip) => chip.classList.contains('topics-chip'))).toBe(true);
    const names = chips().map((chip) => normalizeBengali(chip.textContent));
    expect(new Set(names).size).toBe(names.length);
    const shown = headings();
    expect(shown[0]).toBe('অ');
    expect(shown.indexOf('আ')).toBeGreaterThan(0);
    expect(new Set(shown).size).toBe(shown.length);
    const blocks = groupTopics(NAMES, 'asc');
    expect(shown).toEqual(blocks.map((block) => block.letter));
  });

  test('marks the chosen narrator with aria-current="page", and only that one', async () => {
    show('/narrators?name=abu-hurayrah', 1200);
    const chip = await loaded();
    expect(chip).toHaveAttribute('aria-current', 'page');
    expect(chips().filter((link) => link.hasAttribute('aria-current'))).toHaveLength(1);
  });

  test('the sort is ascending by default and descending with &sort=desc', async () => {
    const first = (blocks) => blocks.flatMap((block) => block.names);
    const asc = first(groupTopics(NAMES, 'asc'));
    const desc = first(groupTopics(NAMES, 'desc'));
    const view = show('/narrators', 1200);
    await loaded();
    expect(sortBox()).toHaveValue('asc');
    expect(chips().slice(0, 5).map((c) => c.textContent)).toEqual(asc.slice(0, 5));
    view.unmount();
    show('/narrators?sort=desc', 1200);
    await loaded();
    expect(sortBox()).toHaveValue('desc');
    expect(chips().slice(0, 5).map((c) => c.textContent)).toEqual(desc.slice(0, 5));
  });

  test('changing the sort keeps the narrator and puts &sort=desc in the address; the links keep it', async () => {
    show('/narrators?name=abu-hurayrah', 1200);
    await loaded();
    fireEvent.change(sortBox(), { target: { value: 'desc' } });
    expect(address()).toBe('/narrators?name=abu-hurayrah&sort=desc');
    expect(sortBox()).toHaveValue('desc');
    expect(decodeURIComponent(screen.getByRole('link', { name: 'আয়িশা' }).getAttribute('href'))).toBe('/narrators?name=aisha&sort=desc');
  });

  test('the search filters live, hides empty blocks and says so when nothing is found', async () => {
    show('/narrators', 1200);
    await loaded();
    const before = headings().length;
    fireEvent.change(box(), { target: { value: 'আয়িশা' } });
    expect(chips().every((chip) => /আয়িশা/.test(chip.textContent.normalize('NFC')))).toBe(true);
    expect(headings().length).toBeLessThan(before);
    expect(headings()).toHaveLength(1);
    fireEvent.change(box(), { target: { value: 'ঝঝঝঝঝ' } });
    expect(screen.getByText('কোনো বর্ণনাকারী পাওয়া যায়নি')).toBeInTheDocument();
    expect(within(menu()).queryAllByRole('link')).toHaveLength(0);
    expect(within(menu()).queryAllByRole('heading', { level: 3 })).toHaveLength(0);
  });

  test('choosing a narrator goes to /narrators?name=<id> and keeps the menu', async () => {
    show('/narrators', 1200);
    fireEvent.click(await screen.findByRole('link', { name: 'আয়িশা' }));
    expect(address()).toBe('/narrators?name=aisha');
    expect(screen.getAllByRole('navigation', { name: 'বর্ণনাকারীসূচি' })).toHaveLength(1);
    expect(await screen.findByRole('heading', { level: 2, name: /আয়িশা/ })).toBeInTheDocument();
  });

  test('with no narrator chosen a prompt stands on the right', async () => {
    show('/narrators', 900);
    await loaded();
    expect(screen.getByText('একজন বর্ণনাকারী বেছে নিন')).toBeInTheDocument();
  });
});

describe('the menu on a phone (under 900px)', () => {
  test('with no narrator the overlay is open by default: a modal dialog, focus inside, scroll locked, rendered once', async () => {
    show('/narrators', 390);
    const box1 = dialog();
    expect(box1).toBeInTheDocument();
    expect(box1).toHaveAttribute('aria-modal', 'true');
    expect(box1).toContainElement(document.activeElement);
    expect(within(box1).getByRole('button', { name: 'বন্ধ করুন' })).toHaveTextContent('×');
    expect(document.body.style.overflow).toBe('hidden');
    expect(screen.getAllByRole('textbox', { name: 'বর্ণনাকারী খুঁজুন' })).toHaveLength(1);
    await within(box1).findByRole('link', { name: 'আয়িশা' });
  });

  test('with a narrator the overlay is closed and a slim button at the top reopens it', async () => {
    show('/narrators?name=abu-hurayrah', 390);
    expect(dialog()).not.toBeInTheDocument();
    expect(document.body.style.overflow).not.toBe('hidden');
    const button = opener();
    expect(button).toBeInTheDocument();
    expect(screen.getByRole('main')).toContainElement(button);
    expect(await screen.findByRole('heading', { level: 2, name: /আবূ হুরায়রা/ })).toBeInTheDocument();
    expect(button.compareDocumentPosition(screen.getByRole('heading', { level: 2, name: /আবূ হুরায়রা/ })) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    fireEvent.click(button);
    expect(dialog()).toBeInTheDocument();
    expect(document.body.style.overflow).toBe('hidden');
  });

  test('choosing a narrator closes the overlay and shows that narrator', async () => {
    show('/narrators', 390);
    fireEvent.click(await within(dialog()).findByRole('link', { name: 'আয়িশা' }));
    expect(address()).toBe('/narrators?name=aisha');
    expect(dialog()).not.toBeInTheDocument();
    expect(opener()).toBeInTheDocument();
    expect(await screen.findByText(/মোট .* টি হাদিস পাওয়া গেছে/)).toBeInTheDocument();
  });

  test('Escape closes the overlay and focus returns to the button that opened it', async () => {
    show('/narrators?name=abu-hurayrah', 390);
    const button = opener();
    button.focus();
    fireEvent.click(button);
    fireEvent.keyDown(dialog(), { key: 'Escape' });
    expect(dialog()).not.toBeInTheDocument();
    expect(opener()).toHaveFocus();
    await screen.findByText(/মোট .* টি হাদিস পাওয়া গেছে/);
  });

  test('the × button closes it too, and the button then reopens it', async () => {
    show('/narrators', 390);
    fireEvent.click(within(dialog()).getByRole('button', { name: 'বন্ধ করুন' }));
    expect(dialog()).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'বর্ণনাকারীসূচি' })).toHaveLength(1);
    expect(opener()).toHaveFocus();
    fireEvent.click(opener());
    expect(dialog()).toBeInTheDocument();
    await within(dialog()).findByRole('link', { name: 'আয়িশা' });
  });
});

describe('the listing (the one of /search and /topics)', () => {
  test('shows the count line, the book chips with counts, 20 plain cards and the boxed pager', async () => {
    show('/narrators?name=abu-hurayrah', 1200);
    expect(await screen.findByText(`মোট ${digits(ABU_HURAYRAH[2])} টি হাদিস পাওয়া গেছে`, { exact: false })).toBeInTheDocument();
    expect(screen.getByText(/১ - ২০ পর্যন্ত দেখানো হচ্ছে/)).toBeInTheDocument();
    const filter = screen.getByRole('group', { name: 'বই অনুযায়ী ছাঁকুন' });
    expect(within(filter).getByRole('button', { name: new RegExp(`সব ${digits(ABU_HURAYRAH[2])}`) })).toBeInTheDocument();
    expect(within(filter).getByRole('button', { name: new RegExp(`বুখারী ${digits(ABU_HURAYRAH[3])}`) })).toBeInTheDocument();
    const list = await screen.findByRole('list', { name: 'ফলাফল' });
    await within(list).findAllByText(/হাদীস নং/);
    expect(list.querySelectorAll(':scope > li.search-item')).toHaveLength(20);
    expect(list.querySelector('mark')).toBeNull();
    const pager = screen.getByRole('navigation', { name: 'পাতা' });
    expect(pager).toHaveClass('search-pager');
    expect(pager).toHaveTextContent(`১ / ${digits(Math.ceil(ABU_HURAYRAH[2] / 20))}`);
  });

  test('a book chip and the pager change the address (keeping the sort)', async () => {
    show('/narrators?name=abu-hurayrah&sort=desc', 1200);
    const filter = await screen.findByRole('group', { name: 'বই অনুযায়ী ছাঁকুন' });
    fireEvent.click(within(filter).getByRole('button', { name: /মুসলিম/ }));
    expect(address()).toBe('/narrators?name=abu-hurayrah&book=muslim&sort=desc');
    fireEvent.click(within(screen.getByRole('navigation', { name: 'পাতা' })).getByRole('button', { name: /পরের/ }));
    expect(address()).toBe('/narrators?name=abu-hurayrah&page=2&book=muslim&sort=desc');
  });
});
