import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { SettingsProvider } from '../settings/SettingsProvider';
import { ToastProvider } from '../ui/Toast';
import { getUrl, setUrl } from '../test/nextNavigation';
import { serveRealData } from '../test/publicJson';
import TopicsPage from './TopicsPage';

// Hadis texts and search indexes are the real data files; `search` stands in for the lookup of a
// topic's hadis where a test needs a particular list.
beforeEach(() => serveRealData());

// Cards load their text after the test body; let those loads finish inside act().
afterEach(async () => {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  delete global.fetch;
});

// The first `count` Bukhari hadis (1 to 45 all have a file).
const bukhari = (count) => async () => Array.from({ length: count }, (_, i) => `BUK-${i + 1}`);

const curated = {
  ঈমান: [
    { book: 'bukhari', number: 8, note: 'ইসলামের ভিত্তি এখান থেকে।' },
    { book: 'muslim', number: 45, note: 'ঈমানের শাখা।' },
  ],
};

function show(address, props = {}) {
  setUrl(address);
  return render(
    <SettingsProvider>
      <ToastProvider>
        <TopicsPage search={bukhari(45)} curated={{}} {...props} />
      </ToastProvider>
    </SettingsProvider>
  );
}

// A hadis card's title is an h3: it sits under the topic's own h2.
const cardTitles = () =>
  screen
    .queryAllByRole('heading', { level: 3 })
    .map((h) => h.textContent)
    .filter((text) => /হাদীস নং/.test(text));
const address = () => decodeURIComponent(getUrl().pathname + getUrl().search);

describe('with no topic chosen', () => {
  test('is titled as the topics page and asks for a topic', () => {
    show('/topics');
    expect(document.title).toBe('বিষয়ভিত্তিক হাদীস - Alhashor');
    expect(screen.getByRole('heading', { level: 1, name: 'বিষয়ভিত্তিক হাদীস' })).toBeInTheDocument();
    expect(screen.getByText('একটি বিষয় বেছে নিন')).toBeInTheDocument();
  });

  test('shows the topic index and loads no hadis', () => {
    const search = vi.fn();
    show('/topics', { search });
    expect(screen.getByRole('textbox', { name: 'বিষয় খুঁজুন' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'ঈমান' })).toBeInTheDocument();
    expect(search).not.toHaveBeenCalled();
    expect(cardTitles()).toEqual([]);
  });
});

describe('a chosen topic (/topics?topic=<name>)', () => {
  test('is titled with the topic', async () => {
    show('/topics?topic=ঈমান');
    expect(document.title).toBe('ঈমান - বিষয়ভিত্তিক হাদীস - Alhashor');
    await screen.findAllByRole('button', { name: /কপি/ });
  });

  test('names the topic, counts the hadis, and shows the first 20 as shared cards', async () => {
    const search = vi.fn(bukhari(45));
    show('/topics?topic=ঈমান', { search });
    expect(await screen.findByRole('heading', { level: 2, name: 'ঈমান' })).toBeInTheDocument();
    expect(await screen.findByText(/মোট ৪৫ টি হাদীস পাওয়া গেছে/)).toBeInTheDocument();
    expect(screen.getByText('১ - ২০ পর্যন্ত দেখানো হচ্ছে')).toBeInTheDocument();
    expect(cardTitles()).toHaveLength(20);
    expect(cardTitles()[0]).toBe('বুখারী শরীফ - হাদীস নং ১');
    expect(cardTitles()[19]).toBe('বুখারী শরীফ - হাদীস নং ২০');
    expect(search).toHaveBeenCalledWith(['ঈমান'], { requireAll: true });
    expect(global.fetch).not.toHaveBeenCalledWith('/json/hadis/Bukhari/0021/text.txt'); // the rest wait for their page
  });

  test('numbers are shown in the visitor\'s digit style', async () => {
    localStorage.setItem('alhashor.settings', JSON.stringify({ digits: 'en' }));
    show('/topics?topic=ঈমান');
    expect(await screen.findByText(/মোট 45 টি হাদীস/)).toBeInTheDocument();
    expect(screen.getByText('1 - 20 পর্যন্ত দেখানো হচ্ছে')).toBeInTheDocument();
    expect(cardTitles()[0]).toBe('বুখারী শরীফ - হাদীস নং 1');
  });

  test('a count of one thousand or more gets its separators', async () => {
    show('/topics?topic=ঈমান', { search: bukhari(1500) });
    expect(await screen.findByText(/মোট ১,৫০০ টি হাদীস/)).toBeInTheDocument();
  });

  test('announces the count in a live region', async () => {
    show('/topics?topic=ঈমান');
    await screen.findByText(/মোট ৪৫ টি হাদীস/);
    expect(screen.getAllByRole('status').some((region) => /মোট ৪৫ টি হাদীস/.test(region.textContent))).toBe(true);
  });

  test('marks the chosen chip', async () => {
    show('/topics?topic=ঈমান');
    expect(screen.getByRole('link', { name: 'ঈমান' })).toHaveAttribute('aria-current', 'true');
    await screen.findByText(/মোট ৪৫/);
  });

  test('says it is searching while the lookup runs', async () => {
    let finish;
    show('/topics?topic=ঈমান', { search: () => new Promise((resolve) => { finish = resolve; }) });
    expect(screen.getByText('খুঁজছি...')).toBeInTheDocument();
    await act(async () => finish(['BUK-1']));
    expect(screen.queryByText('খুঁজছি...')).not.toBeInTheDocument();
    expect(await screen.findByText(/মোট ১ টি হাদীস/)).toBeInTheDocument();
  });

  test('a topic with no hadis says so instead of loading forever', async () => {
    show('/topics?topic=অজানা', { search: async () => [] });
    expect(await screen.findByText('এই বিষয়ে কোনো হাদীস পাওয়া যায়নি')).toBeInTheDocument();
    expect(screen.queryByText('খুঁজছি...')).not.toBeInTheDocument();
    expect(cardTitles()).toEqual([]);
  });

  test('a failed lookup says so and can be tried again', async () => {
    const search = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(['BUK-1']);
    show('/topics?topic=ঈমান', { search });
    expect(await screen.findByText(/বিষয়টি খোঁজা যায়নি/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'আবার চেষ্টা করুন' }));
    expect(await screen.findByText(/মোট ১ টি হাদীস/)).toBeInTheDocument();
    expect(screen.queryByText(/বিষয়টি খোঁজা যায়নি/)).not.toBeInTheDocument();
  });

  test('a topic of several words looks up all of them', async () => {
    const search = vi.fn(bukhari(1));
    show('/topics?topic=জ্ঞান অর্জন', { search });
    await screen.findByText(/মোট ১ টি হাদীস/);
    expect(search).toHaveBeenCalledWith(['জ্ঞান', 'অর্জন'], { requireAll: true });
    expect(document.title).toBe('জ্ঞান অর্জন - বিষয়ভিত্তিক হাদীস - Alhashor');
  });

  test('shows hadis from the real index, with their real books and numbers', async () => {
    show('/topics?topic=ইল্লীন', { search: undefined });
    expect(await screen.findByRole('heading', { level: 3, name: 'আবু দাউদ শরীফ - হাদীস নং ১,২৮৮' })).toBeInTheDocument();
    expect(cardTitles()).toContain('আবু দাউদ শরীফ - হাদীস নং ৩,৯৪৬');
  });
});

describe('the address is the whole state', () => {
  test('page 2 shows hadis 21 to 40 and says so', async () => {
    show('/topics?topic=ঈমান&page=2');
    await screen.findByText(/মোট ৪৫/);
    expect(cardTitles()[0]).toBe('বুখারী শরীফ - হাদীস নং ২১');
    expect(cardTitles()).toHaveLength(20);
    expect(screen.getByText('২১ - ৪০ পর্যন্ত দেখানো হচ্ছে')).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalledWith('/json/hadis/Bukhari/0001/text.txt');
  });

  test('a page past the end shows the last page', async () => {
    show('/topics?topic=ঈমান&page=99');
    await screen.findByText(/মোট ৪৫/);
    expect(cardTitles()).toHaveLength(5);
    expect(cardTitles()[0]).toBe('বুখারী শরীফ - হাদীস নং ৪১');
    expect(screen.getByText('৪১ - ৪৫ পর্যন্ত দেখানো হচ্ছে')).toBeInTheDocument();
  });

  test('a page that is not a number shows the first page', async () => {
    show('/topics?topic=ঈমান&page=abc');
    await screen.findByText(/মোট ৪৫/);
    expect(cardTitles()[0]).toBe('বুখারী শরীফ - হাদীস নং ১');
  });

  test('"next" goes to the next page, and the address says so', async () => {
    show('/topics?topic=ঈমান');
    await screen.findByText(/মোট ৪৫/);
    fireEvent.click(within(screen.getByRole('navigation', { name: 'পাতা' })).getByRole('link', { name: /পরের/ }));
    expect(address()).toBe('/topics?topic=ঈমান&page=2');
    await waitFor(() => expect(cardTitles()[0]).toBe('বুখারী শরীফ - হাদীস নং ২১'));
  });

  test('there is no pager when everything fits on one page', async () => {
    show('/topics?topic=ঈমান', { search: bukhari(20) });
    await screen.findByText(/মোট ২০ টি হাদীস/);
    expect(screen.queryByRole('navigation', { name: 'পাতা' })).not.toBeInTheDocument();
  });

  test('choosing a chip goes to that topic and shows its hadis', async () => {
    show('/topics');
    fireEvent.click(screen.getByRole('link', { name: 'নামায' }));
    expect(address()).toBe('/topics?topic=নামায');
    expect(await screen.findByText(/মোট ৪৫ টি হাদীস/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'নামায' })).toHaveAttribute('aria-current', 'true');
    expect(document.title).toBe('নামায - বিষয়ভিত্তিক হাদীস - Alhashor');
  });

  test('choosing another topic starts again from its first page', async () => {
    show('/topics?topic=ঈমান&page=2');
    await screen.findByText(/মোট ৪৫/);
    fireEvent.click(screen.getByRole('link', { name: 'নামায' }));
    expect(address()).toBe('/topics?topic=নামায');
    await waitFor(() => expect(cardTitles()[0]).toBe('বুখারী শরীফ - হাদীস নং ১'));
  });

  test('clearing the choice goes back to the plain page', async () => {
    show('/topics?topic=ঈমান');
    await screen.findByText(/মোট ৪৫/);
    fireEvent.click(screen.getByRole('link', { name: 'বাছাই মুছুন' }));
    expect(address()).toBe('/topics');
    expect(await screen.findByText('একটি বিষয় বেছে নিন')).toBeInTheDocument();
    expect(cardTitles()).toEqual([]);
  });
});

test('a slow earlier topic cannot overwrite the topic chosen after it', async () => {
  let releaseSlow;
  const search = (words) =>
    words[0] === 'সুদ'
      ? new Promise((resolve) => { releaseSlow = () => resolve(['MUS-1', 'MUS-2']); })
      : Promise.resolve(['BUK-1']);
  show('/topics', { search });
  fireEvent.click(screen.getByRole('link', { name: 'সুদ' }));
  await waitFor(() => expect(releaseSlow).toBeDefined());
  fireEvent.click(screen.getByRole('link', { name: 'ঘুষ' }));
  expect(await screen.findByText(/মোট ১ টি হাদীস/)).toBeInTheDocument();

  await act(async () => {
    releaseSlow();
    await new Promise((resolve) => setTimeout(resolve, 20));
  });

  expect(screen.getByText(/মোট ১ টি হাদীস/)).toBeInTheDocument();
  expect(cardTitles()).toEqual(['বুখারী শরীফ - হাদীস নং ১']);
});

describe('the "start here" block', () => {
  const startBlock = () => screen.queryByRole('region', { name: 'এখান থেকে শুরু করুন' });

  test('comes first for a topic that has entries, then the full list under its own heading', async () => {
    show('/topics?topic=ঈমান', { curated });
    await screen.findByText(/মোট ৪৫/);
    const block = startBlock();
    expect(block).toBeInTheDocument();
    expect(within(block).getByText('ইসলামের ভিত্তি এখান থেকে।')).toBeInTheDocument();
    expect(within(block).getByText('ঈমানের শাখা।')).toBeInTheDocument();
    expect(within(block).getByRole('heading', { name: 'মুসলিম শরীফ - হাদীস নং ৪৫' })).toBeInTheDocument();

    const all = screen.getByRole('heading', { level: 2, name: 'সব হাদীস' });
    expect(block.compareDocumentPosition(all) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByRole('heading', { level: 3, name: 'বুখারী শরীফ - হাদীস নং ১' })).toBeInTheDocument();
  });

  test('is shown at once, without waiting for the search', async () => {
    show('/topics?topic=ঈমান', { curated, search: () => new Promise(() => {}) });
    expect(startBlock()).toBeInTheDocument();
    await screen.findAllByRole('button', { name: /কপি/ }); // its cards load their texts
  });

  test('is not shown for a topic with no entry, and then there is no "সব হাদীস" heading', async () => {
    show('/topics?topic=নামায', { curated });
    await screen.findByText(/মোট ৪৫/);
    expect(startBlock()).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'সব হাদীস' })).not.toBeInTheDocument();
  });

  test('is not shown with no topic chosen', () => {
    show('/topics', { curated });
    expect(startBlock()).not.toBeInTheDocument();
  });

  test('is shown on the first page only, so it is not repeated on every page', async () => {
    show('/topics?topic=ঈমান&page=2', { curated });
    await screen.findByText(/মোট ৪৫/);
    expect(startBlock()).not.toBeInTheDocument();
  });

  test('works with a topic written in another spelling of the same letters', async () => {
    const other = { 'পয়গাম': [{ book: 'bukhari', number: 1, note: 'পয়গামের টীকা।' }] };
    show(`/topics?topic=${encodeURIComponent('পয়গাম')}`, { curated: other });
    expect(startBlock()).toBeInTheDocument();
    await screen.findByText(/মোট ৪৫/);
  });
});

describe('focus and announcements', () => {
  const name = () => screen.getByRole('heading', { level: 2, name: 'ঈমান' });

  test('the topic heading can take focus, and does not on first view', async () => {
    show('/topics?topic=ঈমান');
    await screen.findByText('মোট ৪৫ টি হাদীস পাওয়া গেছে');
    expect(name()).toHaveAttribute('tabindex', '-1');
    expect(name()).not.toHaveFocus();
  });

  test('moving to the next page focuses the heading and announces the page', async () => {
    show('/topics?topic=ঈমান');
    await screen.findByText('মোট ৪৫ টি হাদীস পাওয়া গেছে');
    fireEvent.click(within(screen.getByRole('navigation', { name: 'পাতা' })).getByRole('link', { name: /পরের/ }));
    await screen.findByText(/২১ - ৪০ পর্যন্ত/);
    expect(name()).toHaveFocus();
    expect(screen.getByText('পাতা ২', { selector: '.sr-only' })).toHaveAttribute('role', 'status');
  });

  test('choosing a topic chip moves focus to that topic\'s heading', async () => {
    show('/topics');
    fireEvent.click(screen.getByRole('link', { name: 'ঈমান' }));
    await screen.findByText('মোট ৪৫ টি হাদীস পাওয়া গেছে');
    expect(name()).toHaveFocus();
  });
});
