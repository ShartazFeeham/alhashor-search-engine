import { readFileSync } from 'node:fs';
import path from 'node:path';
import { act, render, screen, within } from '@testing-library/react';
import { BOOKS } from '../lib/books';
import { clearNarratorCache } from '../lib/narrators';
import { SettingsProvider } from '../settings/SettingsProvider';
import { setUrl } from '../test/nextNavigation';
import { serveRealData } from '../test/publicJson';
import { ToastProvider } from '../ui/Toast';
import BookBar from './BookBar';
import NarratorBooks from './NarratorBooks';
import NarratorsPage from './NarratorsPage';

vi.setConfig({ testTimeout: 30000 });
const INDEX = JSON.parse(readFileSync(path.resolve(process.cwd(), 'public/json/narrators/index.json'), 'utf8'));
const digits = (n) => n.toLocaleString('en-US').replace(/\d/g, (d) => '০১২৩৪৫৬৭৮৯'[d]);
const inProvider = (ui) => render(<SettingsProvider>{ui}</SettingsProvider>);
const none = { bukhari: 0, muslim: 0, tirmidhi: 0, abudawud: 0, ibnmajah: 0, nasai: 0 };

describe('BookBar (the thin bar in each menu row)', () => {
  const segments = (bar) => bar.innerHTML.match(/<i /g) ?? [];
  test('has a segment for each book with hadis, as wide as the count, in the book colour, and is decoration only', () => {
    render(<BookBar perBook={{ ...none, bukhari: 30, nasai: 10 }} />);
    const bar = screen.getByTestId('narrator-bar');
    expect(segments(bar)).toHaveLength(2);
    expect(bar.innerHTML).toContain('flex-grow: 30');
    expect(bar.innerHTML).toContain('flex-grow: 10');
    expect(bar.innerHTML).toContain('var(--bk-bukhari)');
    expect(bar.innerHTML).toContain('var(--bk-nasai)');
    expect(bar).toHaveAttribute('aria-hidden', 'true');
  });
});

describe('NarratorBooks (the per-book bars of the chosen narrator)', () => {
  test('one row per book with a count, none for a book without, each with name and number as text', () => {
    inProvider(<NarratorBooks perBook={{ ...none, bukhari: 40, muslim: 10, nasai: 5 }} />);
    const rows = within(screen.getByRole('list', { name: 'বই অনুযায়ী হাদীস' })).getAllByRole('listitem');
    expect(rows).toHaveLength(3);
    expect(rows[0]).toHaveTextContent(`${BOOKS[0].name}${digits(40)}`);
    expect(rows[1]).toHaveTextContent(`${BOOKS[1].name}${digits(10)}`);
    expect(rows[2]).toHaveTextContent(`${BOOKS[5].name}${digits(5)}`);
  });

  test('the widths are proportional to the largest book, in the book colours', () => {
    inProvider(<NarratorBooks perBook={{ ...none, bukhari: 40, muslim: 10, nasai: 5 }} />);
    const fills = screen.getAllByTestId('narrator-book-fill');
    expect(fills.map((fill) => fill.style.width)).toEqual(['100%', '25%', '12.5%']);
    expect(fills[0].style.background).toContain('var(--bk-bukhari)');
    expect(fills[2].style.background).toContain('var(--bk-nasai)');
    expect(screen.getAllByTestId('narrator-book-track')[0]).toHaveAttribute('aria-hidden', 'true');
  });

  test('renders nothing when there are no counts', () => {
    inProvider(<NarratorBooks perBook={none} />);
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });
});

describe('on the page', () => {
  beforeEach(() => {
    clearNarratorCache();
    serveRealData();
    window.matchMedia = (query) => ({ matches: true, media: query, addEventListener() {}, removeEventListener() {} });
  });
  afterEach(async () => {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    delete window.matchMedia;
    delete global.fetch;
  });
  const show = (address) => {
    setUrl(address);
    return render(
      <SettingsProvider>
        <ToastProvider>
          <NarratorsPage />
        </ToastProvider>
      </SettingsProvider>
    );
  };

  test('the chosen narrator shows a bar for each of its books, with the real counts', async () => {
    show('/narrators?name=abu-hurayrah');
    const list = await screen.findByRole('list', { name: 'বই অনুযায়ী হাদীস' });
    const row = INDEX.find((r) => r[0] === 'abu-hurayrah');
    const counts = row.slice(3);
    const rows = within(list).getAllByRole('listitem');
    expect(rows).toHaveLength(counts.filter((n) => n > 0).length);
    const largest = Math.max(...counts);
    counts.forEach((n, i) => {
      if (n === 0) return;
      const item = rows.find((li) => li.textContent === `${BOOKS[i].name}${digits(n)}`);
      expect(item).toBeTruthy();
      expect(within(item).getByTestId('narrator-book-fill').style.width).toBe(`${(n / largest) * 100}%`);
    });
  });

  test('every menu row has its thin bar, and the rows keep their link name (the bar is hidden from screen readers)', async () => {
    show('/narrators?name=abu-hurayrah');
    await screen.findByRole('link', { name: /^আবূ হুরায়রা(?: \(রাঃ\))? [০-৯,]+$/ });
    const nav = screen.getByRole('navigation', { name: 'বর্ণনাকারীসূচি' });
    expect(within(nav).getAllByTestId('narrator-bar')).toHaveLength(INDEX.length);
  });

  test('no chosen narrator, no per-book list', async () => {
    show('/narrators');
    await screen.findByRole('link', { name: /^আবূ হুরায়রা(?: \(রাঃ\))? [০-৯,]+$/ });
    expect(screen.queryByRole('list', { name: 'বই অনুযায়ী হাদীস' })).not.toBeInTheDocument();
  });
});

describe('css', () => {
  const css = readFileSync(path.resolve(process.cwd(), 'src/styles/topics.css'), 'utf8');
  test('bars use the book tokens and the theme tokens only (all three themes), and a row keeps its 36px height', () => {
    const rules = css.split('\n').filter((line) => /narr-/.test(line)).join('\n');
    expect(rules).toMatch(/\.narr-bar\{/);
    expect(rules).toMatch(/\.narr-books\{/);
    expect(rules.replace(/var\(--[a-z0-9-]+\)/g, '')).not.toMatch(/#[0-9a-fA-F]{3,8}\b|\brgba?\(/);
    expect(css).toMatch(/\.topics-row\{[^}]*height:36px/);
    expect(css).toMatch(/\.narr-books-name\{[^}]*min-width:0/);
  });
});
