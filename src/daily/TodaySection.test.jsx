import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { bookById } from '../lib/books';
import { formatNumber } from '../lib/digits';
import { pickDaily, recentPicks } from '../lib/dailyPick';
import { splitHadis } from '../lib/hadisText';
import { SettingsProvider } from '../settings/SettingsProvider';
import { diskFetch, realShortList, realText } from '../test/hadisFixtures';
import { ToastProvider } from '../ui/Toast';
import TodaySection from './TodaySection';
import { clearShortListCache } from './useShortList';

const TODAY = new Date(2026, 9, 2, 10, 30);
const SHORT = realShortList();

const cite = ({ book, number }) => `${book.cite}, হাদীস নং ${formatNumber(number, 'bn')}`;
const wholeText = ({ book, number }) => {
  const { chain, body } = splitHadis(realText(book.id, number));
  return `${chain} ${body}`.trim().replace(/\s+/g, ' ');
};

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

  test('is the same hadis the pure pick gives, with its book badge and full citation', async () => {
    show();
    const today = pickDaily(SHORT, TODAY);
    await screen.findByText(wholeText(today));
    const card = screen.getByRole('article', { name: 'আজকের হাদীস' });
    expect(within(card).getByText(cite(today))).toBeInTheDocument();
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
    fireEvent.click(within(screen.getByRole('article', { name: 'আজকের হাদীস' })).getByRole('button', { name: /কপি/ }));
    await settle();
    const copied = navigator.clipboard.writeText.mock.calls[0][0];
    expect(copied.replace(/\s+/g, ' ')).toBe(`${wholeText(today)} — ${cite(today)}`);
    expect(screen.getByText('কপি করা হয়েছে')).toBeInTheDocument();
  });

  test('says so when the clipboard is blocked', async () => {
    navigator.clipboard.writeText.mockRejectedValue(new Error('blocked'));
    show();
    await screen.findByText(wholeText(pickDaily(SHORT, TODAY)));
    fireEvent.click(within(screen.getByRole('article', { name: 'আজকের হাদীস' })).getByRole('button', { name: /কপি/ }));
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

describe('the last seven days', () => {
  const section = () => screen.getByRole('region', { name: 'গত ৭ দিন' });

  test('lists the pick of each of the seven days before, newest first, each linking to its page', async () => {
    show();
    const recent = recentPicks(SHORT, TODAY);
    await screen.findByText(wholeText(recent[6].pick));
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
    const body = splitHadis(realText(recent[0].pick.book.id, recent[0].pick.number)).body;
    await screen.findByText(wholeText(recent[0].pick));
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
