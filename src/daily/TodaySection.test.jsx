/* eslint-disable testing-library/no-node-access, testing-library/no-container */
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { bookById } from '../lib/books';
import { formatNumber } from '../lib/digits';
import { pickDaily, recentPicks } from '../lib/dailyPick';
import { stripChain } from '../lib/hadisCore';
import { splitHadis } from '../lib/hadisText';
import { SettingsProvider } from '../settings/SettingsProvider';
import { diskFetch, realShortList, realText } from '../test/hadisFixtures';
import { ToastProvider } from '../ui/Toast';
import TodaySection from './TodaySection';
import { clearShortListCache } from './useShortList';

// These tests pin the fallback (the short-hadis list). The pool of the featured top-picks sets is
// tested in lib/dailyPool.test.js; here it is empty, whatever the owner's sets hold today.
vi.mock('../lib/dailyPool', async (importOriginal) => ({ ...(await importOriginal()), getDailyPool: () => [] }));

const TODAY = new Date(2026, 9, 2, 10, 30);
const SHORT = realShortList();

const cite = ({ book, number }) => `${book.cite}, হাদীস নং ${formatNumber(number, 'bn')}`;
// The day's article and the seven-day list show the core of the hadis only: no number, no chain of
// narrators (the full hadis page has them).
const listText = ({ book, number }) => stripChain(realText(book.id, number)).core.replace(/\s+/g, ' ');
const wholeText = listText;

const show = () =>
  render(
    <SettingsProvider>
      <ToastProvider>
        <TodaySection />
      </ToastProvider>
    </SettingsProvider>
  );

// The page loads texts after the test body; let those loads finish inside act().
async function settle() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(TODAY);
  clearShortListCache();
  global.fetch = vi.fn(diskFetch);
  Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue() } });
});

afterEach(async () => {
  await settle();
  vi.useRealTimers();
  delete global.fetch;
});

describe('the hadis of the day', () => {
  test('shows a loading note first, then the day, the weekday and the hadis', async () => {
    show();
    expect(screen.getByLabelText('লোড হচ্ছে')).toBeInTheDocument();
    const today = pickDaily(SHORT, TODAY);
    expect(await screen.findByText(wholeText(today))).toBeInTheDocument();
    const card = screen.getByRole('article', { name: 'আজকের হাদীস' });
    expect(within(card).getByText('২ অক্টোবর ২০২৬')).toBeInTheDocument();
    expect(within(card).getByText('শুক্রবার')).toBeInTheDocument();
  });

  test('is the same hadis the pure pick gives, with its book badge and full title', async () => {
    show();
    const today = pickDaily(SHORT, TODAY);
    await screen.findByText(wholeText(today));
    const card = screen.getByRole('article', { name: 'আজকের হাদীস' });
    expect(within(card).getByRole('heading', { level: 2, name: `${today.book.full} - হাদীস নং ${formatNumber(today.number, 'bn')}` })).toBeInTheDocument();
    expect(within(card).getByText(bookById(today.book.id).badge)).toBeInTheDocument();
  });

  test('links to the full hadis page', async () => {
    show();
    const today = pickDaily(SHORT, TODAY);
    await screen.findByText(wholeText(today));
    const card = screen.getByRole('article', { name: 'আজকের হাদীস' });
    expect(within(card).getByRole('link', { name: 'পুরো হাদীস' })).toHaveAttribute('href', `/hadis/${today.book.id}/${today.number}`);
  });

  test('copies the hadis with its citation and says so', async () => {
    show();
    const today = pickDaily(SHORT, TODAY);
    await screen.findByText(wholeText(today));
    fireEvent.click(within(screen.getByRole('article', { name: 'আজকের হাদীস' })).getByRole('button', { name: 'কপি' }));
    await settle();
    const copied = navigator.clipboard.writeText.mock.calls[0][0];
    const [saying, cite] = copied.split('\n\n');
    expect(saying.replace(/\s+/g, ' ')).toBe(realText(today.book.id, today.number).replace(/\s+/g, ' '));
    expect(cite).toBe(`${today.book.cite}, হাদীস নং ${formatNumber(today.number, 'bn')}`);
    expect(screen.getByText('কপি করা হয়েছে')).toBeInTheDocument();
  });

  test('says so when the clipboard is blocked', async () => {
    navigator.clipboard.writeText.mockRejectedValue(new Error('blocked'));
    show();
    await screen.findByText(wholeText(pickDaily(SHORT, TODAY)));
    fireEvent.click(within(screen.getByRole('article', { name: 'আজকের হাদীস' })).getByRole('button', { name: 'কপি' }));
    await settle();
    expect(screen.getByText('কপি করা যায়নি')).toBeInTheDocument();
  });

  test('a different date shows a different hadis', async () => {
    const { unmount } = show();
    const first = pickDaily(SHORT, TODAY);
    await screen.findByText(wholeText(first));
    unmount();
    vi.setSystemTime(new Date(2026, 9, 3, 9, 0));
    show();
    const second = pickDaily(SHORT, new Date(2026, 9, 3, 9, 0));
    await screen.findByText(wholeText(second));
    // yesterday's hadis is now in the list of past days, no longer in the card
    const card = screen.getByRole('article', { name: 'আজকের হাদীস' });
    expect(within(card).getByText(wholeText(second))).toBeInTheDocument();
    expect(within(card).queryByText(wholeText(first))).not.toBeInTheDocument();
  });

  test('moves to the new day when the visitor comes back after midnight', async () => {
    show();
    await screen.findByText(wholeText(pickDaily(SHORT, TODAY)));
    const tomorrow = new Date(2026, 9, 3, 0, 5);
    vi.setSystemTime(tomorrow);
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(await screen.findByText(wholeText(pickDaily(SHORT, tomorrow)))).toBeInTheDocument();
    expect(screen.getByText('৩ অক্টোবর ২০২৬')).toBeInTheDocument();
  });

  test('says so when the list of short hadis cannot be loaded, and tries again on request', async () => {
    global.fetch = vi.fn(() => Promise.resolve({ ok: false }));
    show();
    expect(await screen.findByText(/আনা যায়নি/)).toBeInTheDocument();
    global.fetch = vi.fn(diskFetch);
    fireEvent.click(screen.getByRole('button', { name: 'আবার চেষ্টা করুন' }));
    expect(await screen.findByText(wholeText(pickDaily(SHORT, TODAY)))).toBeInTheDocument();
  });

  test('says so when there is nothing to pick from', async () => {
    global.fetch = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({}) }));
    show();
    expect(await screen.findByText('আজকের জন্য কোনো হাদীস পাওয়া যায়নি।')).toBeInTheDocument();
  });
});

// The page reuses the hadis page's article instead of a look of its own.
describe('the shared hadis article', () => {
  test('has the hadis page structure: header card, reading card with progress, actions card (and no chain card)', async () => {
    const { container } = show();
    await screen.findByText(wholeText(pickDaily(SHORT, TODAY)));
    const article = container.querySelector('article.hadis-article');
    expect(article).toBe(screen.getByRole('article', { name: 'আজকের হাদীস' }));
    expect(article.querySelector('header.hadis-head.hadis-card')).toBeInTheDocument();
    expect(article.querySelector('.hadis-reading.hadis-card p.hadis-read')).toBeInTheDocument();
    expect(article.querySelector('.hadis-reading .hadis-progress')).toBeInTheDocument();
    expect(article.querySelector('.hadis-actions.hadis-card')).toBeInTheDocument();
    expect(container.querySelector('.daily-card, .daily-text, .daily-actions')).toBeNull();
  });

  test('keeps one h1 on the page: the article title is an h2, the date line is above it', async () => {
    const { container } = show();
    await screen.findByText(wholeText(pickDaily(SHORT, TODAY)));
    const article = screen.getByRole('article', { name: 'আজকের হাদীস' });
    expect(article.querySelector('h1')).toBeNull();
    expect(within(article).getByText(/আজকের হাদীস ·/)).toHaveClass('daily-date');
    expect(container.querySelector('.hadis-head .daily-date')).toBeInTheDocument();
  });

  test('offers the same actions as the hadis page, plus the full page first', async () => {
    show();
    await screen.findByText(wholeText(pickDaily(SHORT, TODAY)));
    const actions = screen.getByRole('article', { name: 'আজকের হাদীস' }).querySelector('.hadis-actions');
    expect(within(actions).getAllByRole('link').map((l) => l.textContent)).toEqual(['পুরো হাদীস', 'ছবি বানান']);
    expect(within(actions).getAllByRole('button').map((b) => b.textContent)).toEqual(expect.arrayContaining(['কপি', 'লিংক কপি']));
    expect(within(actions).queryByRole('button', { name: /উদ্ধৃতি/ })).not.toBeInTheDocument();
  });
});

describe('the core of the hadis only', () => {
  test('the article shows the saying without the chain of narrators, and has no chain block', async () => {
    const { container } = show();
    const today = pickDaily(SHORT, TODAY);
    await screen.findByText(wholeText(today));
    const { chain } = splitHadis(realText(today.book.id, today.number));
    const article = screen.getByRole('article', { name: 'আজকের হাদীস' });
    expect(container.querySelector('.hadis-chain')).toBeNull();
    expect(within(article).queryByText('বর্ণনায়:')).not.toBeInTheDocument();
    expect(within(article).getByText(wholeText(today))).toHaveClass('hadis-read');
    if (chain) expect(article).not.toHaveTextContent(chain.replace(/\s+/g, ' ').slice(0, 25));
  });

  test('the full text with its chain is still what copy takes', async () => {
    show();
    const today = pickDaily(SHORT, TODAY);
    await screen.findByText(wholeText(today));
    fireEvent.click(within(screen.getByRole('article', { name: 'আজকের হাদীস' })).getByRole('button', { name: 'কপি' }));
    await settle();
    expect(navigator.clipboard.writeText.mock.calls[0][0].split('\n\n')[0].replace(/\s+/g, ' ')).toBe(realText(today.book.id, today.number).replace(/\s+/g, ' '));
  });
});

describe('the last seven days', () => {
  const section = () => screen.getByRole('region', { name: 'গত ৭ দিন' });

  test('lists the pick of each of the seven days before, newest first, each linking to its page', async () => {
    show();
    const recent = recentPicks(SHORT, TODAY);
    await screen.findByText(listText(recent[6].pick));
    const items = within(section()).getAllByRole('listitem');
    expect(items).toHaveLength(7);
    items.forEach((item, index) => {
      const { pick } = recent[index];
      const link = within(item).getByRole('link', { name: cite(pick) });
      expect(link).toHaveAttribute('href', `/hadis/${pick.book.id}/${pick.number}`);
    });
    expect(within(items[0]).getByText(/১ অক্টোবর/)).toBeInTheDocument();
    expect(within(items[6]).getByText(/২৫ সেপ্টেম্বর/)).toBeInTheDocument();
  });

  test('shows the start of each hadis', async () => {
    show();
    const recent = recentPicks(SHORT, TODAY);
    const body = stripChain(realText(recent[0].pick.book.id, recent[0].pick.number)).core;
    await screen.findByText(listText(recent[0].pick));
    expect(within(section()).getAllByRole('listitem')[0]).toHaveTextContent(body.slice(0, 20));
  });
});

describe('the hadis of the day has no khutbah list button', () => {
  test('only the full page and copy actions are there', async () => {
    show();
    await screen.findByText(wholeText(pickDaily(SHORT, TODAY)));
    const card = screen.getByRole('article', { name: 'আজকের হাদীস' });
    expect(within(card).queryByRole('button', { name: /খুতবার তালিকা/ })).not.toBeInTheDocument();
  });
});
