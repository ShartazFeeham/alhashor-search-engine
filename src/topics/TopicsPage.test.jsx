import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { CURATED_TOPICS } from '../data/curatedTopics';
import { SettingsProvider } from '../settings/SettingsProvider';
import { ToastProvider } from '../ui/Toast';
import { getUrl, setUrl } from '../test/nextNavigation';
import TopicsPage from './TopicsPage';

// A topic is a search for its name, so the files are the search's: `word` matches `count` Bukhari
// hadis (BUK-1 ... BUK-count) and hadis n reads "<word> <n>".
function serve(word, count, extra = {}) {
  global.fetch = vi.fn((url) => {
    const ok = (body) => Promise.resolve({ ok: true, json: () => Promise.resolve(body) });
    if (url === `/json/tags/${word.substring(0, 2)}.json`) {
      return ok({ [word]: Array.from({ length: count }, (_, i) => `BUK-${i + 1}`), ...extra });
    }
    const hadis = url.match(/\/json\/hadis\/Bukhari\/(\d+)\/text\.txt/);
    if (hadis) return ok(`এই হাদীসে ${word} আছে ${parseInt(hadis[1], 10)}`);
    return Promise.resolve({ ok: false });
  });
}

afterEach(async () => {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  delete global.fetch;
});

function show(address) {
  setUrl(address);
  return render(
    <SettingsProvider>
      <ToastProvider>
        <TopicsPage />
      </ToastProvider>
    </SettingsProvider>
  );
}

const items = () => within(screen.getByRole('list', { name: 'ফলাফল' })).getAllByRole('listitem');
const address = () => decodeURIComponent(getUrl().pathname + getUrl().search);

describe('with no topic chosen', () => {
  test('is titled as the topics page and asks for a topic, and looks nothing up', () => {
    serve('ঈমান', 5);
    show('/topics');
    expect(document.title).toBe('বিষয়ভিত্তিক হাদীস - Alhashor');
    expect(screen.getByRole('heading', { level: 1, name: 'বিষয়ভিত্তিক হাদীস' })).toBeInTheDocument();
    expect(screen.getByText('একটি বিষয় বেছে নিন')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'বিষয় খুঁজুন' })).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });
});

describe('a chosen topic (/topics?topic=<name>) is a search for its name', () => {
  test('is titled with the topic and names it in a heading', async () => {
    serve('ঈমান', 45);
    show('/topics?topic=ঈমান');
    expect(document.title).toBe('ঈমান - বিষয়ভিত্তিক হাদীস - Alhashor');
    expect(screen.getByRole('heading', { level: 2, name: 'ঈমান' })).toBeInTheDocument();
    await screen.findByText(/মোট ৪৫ টি হাদিস পাওয়া গেছে/);
  });

  test('has the listing of the search page: count line, book chips with counts, 20 cards, boxed pager', async () => {
    serve('ঈমান', 45);
    show('/topics?topic=ঈমান');
    expect(screen.getByText('খুঁজছি...')).toBeInTheDocument();
    expect(await screen.findByText(/মোট ৪৫ টি হাদিস পাওয়া গেছে/)).toBeInTheDocument();
    expect(screen.getByText('১ - ২০ পর্যন্ত দেখানো হচ্ছে')).toBeInTheDocument();
    expect(items()).toHaveLength(20);
    const filter = screen.getByRole('group', { name: 'বই অনুযায়ী ছাঁকুন' });
    expect(within(filter).getByRole('button', { name: /^সব ৪৫$/ })).toHaveAttribute('aria-pressed', 'true');
    expect(within(filter).getByRole('button', { name: /বুখারী.*৪৫/ })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'পাতা' })).toHaveTextContent('পাতা ১ / ৩');
    expect(screen.getByRole('button', { name: /পরের/ })).toBeEnabled();
  });

  test('the cards are the search cards: the topic words are highlighted', async () => {
    serve('রোযা', 3);
    show('/topics?topic=রোযা');
    await screen.findByText(/মোট ৩ টি হাদিস/);
    const marks = await screen.findAllByText('রোযা', { selector: 'mark' });
    expect(marks).toHaveLength(3);
    expect(within(items()[0]).getByRole('link', { name: /হাদীস নং ১/ })).toBeInTheDocument();
    expect(within(items()[0]).getByRole('button', { name: 'কপি' })).toBeInTheDocument();
  });

  test('a topic of several words looks up all of them like the search box does', async () => {
    serve('মক্কা', 2);
    show('/topics?topic=মক্কা বিজয়');
    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith('/json/tags/বি.json'));
    expect(global.fetch).toHaveBeenCalledWith('/json/tags/মক.json');
    expect(global.fetch).toHaveBeenCalledWith('/json/tags/বি.json');
  });

  test('a topic with no hadis says so, as the search page does', async () => {
    serve('যাকাত', 0);
    show('/topics?topic=যাকাত');
    expect(await screen.findByText(/কোনো ফলাফল পাওয়া যায়নি। বানান পরিবর্তন করে/)).toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'ফলাফল' })).not.toBeInTheDocument();
  });

  test('the "start here" block is switched off: nothing of it is shown, even for a topic with picks', async () => {
    expect(CURATED_TOPICS['ঈমান'].length).toBeGreaterThan(0);
    expect(CURATED_TOPICS['নামায'].length).toBeGreaterThan(0);
    for (const topic of ['ঈমান', 'নামায']) {
      serve(topic, 45);
      const { unmount } = show(`/topics?topic=${encodeURIComponent(topic)}`);
      await screen.findByRole('list', { name: 'ফলাফল' });
      expect(screen.queryByText('এখান থেকে শুরু করুন')).not.toBeInTheDocument();
      expect(screen.queryByText('সম্পাদকের বাছাই')).not.toBeInTheDocument();
      expect(screen.queryByText('সব হাদীস')).not.toBeInTheDocument();
      unmount();
    }
  });
});

describe('the address is the whole state', () => {
  test('page 2 shows hadis 21 to 40', async () => {
    serve('ঈমান', 45);
    show('/topics?topic=ঈমান&page=2');
    expect(await screen.findByText('২১ - ৪০ পর্যন্ত দেখানো হচ্ছে')).toBeInTheDocument();
    expect(items()).toHaveLength(20);
  });

  test('a page past the end shows the last page', async () => {
    serve('ঈমান', 45);
    show('/topics?topic=ঈমান&page=9');
    expect(await screen.findByText('৪১ - ৪৫ পর্যন্ত দেখানো হচ্ছে')).toBeInTheDocument();
  });

  test('"next" goes to the next page, keeping the sort, and focuses the list', async () => {
    serve('ঈমান', 45);
    show('/topics?topic=ঈমান&sort=desc');
    await screen.findByText(/মোট ৪৫ টি হাদিস/);
    fireEvent.click(screen.getByRole('button', { name: /পরের/ }));
    expect(address()).toBe('/topics?topic=ঈমান&page=2&sort=desc');
    expect(await screen.findByText('২১ - ৪০ পর্যন্ত দেখানো হচ্ছে')).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'ফলাফল' })).toHaveFocus();
  });

  test('a book chip filters by book and goes into the address as &book=', async () => {
    serve('ঈমান', 45);
    show('/topics?topic=ঈমান&page=2');
    await screen.findByText(/মোট ৪৫ টি হাদিস/);
    fireEvent.click(within(screen.getByRole('group', { name: 'বই অনুযায়ী ছাঁকুন' })).getByRole('button', { name: /বুখারী/ }));
    expect(address()).toBe('/topics?topic=ঈমান&book=bukhari');
  });

  test('a book in the address filters the list, and the sort select keeps it', async () => {
    serve('ঈমান', 45);
    show('/topics?topic=ঈমান&book=muslim');
    expect(await screen.findByText(/এই বইয়ে কোনো হাদীস পাওয়া যায়নি/)).toBeInTheDocument();
    fireEvent.change(screen.getByRole('combobox', { name: 'সাজান' }), { target: { value: 'desc' } });
    expect(address()).toBe('/topics?topic=ঈমান&book=muslim&sort=desc');
  });

  test('choosing another topic starts again from its first page and drops the book', async () => {
    serve('ঈমান', 45);
    show('/topics?topic=ঈমান&page=2&book=bukhari');
    await screen.findByText(/মোট ৪৫ টি হাদিস/);
    fireEvent.click(screen.getByRole('link', { name: 'নামায' }));
    expect(address()).toBe('/topics?topic=নামায');
  });
});

describe('focus', () => {
  test('choosing a topic in the menu moves focus to that topic\'s heading', async () => {
    serve('কবর', 5);
    show('/topics');
    fireEvent.click(screen.getByRole('link', { name: 'কবর' }));
    await screen.findByText(/মোট ৫ টি হাদিস/);
    expect(screen.getByRole('heading', { level: 2, name: 'কবর' })).toHaveFocus();
  });

  test('the heading can take focus, and does not on first view', async () => {
    serve('আরশ', 5);
    show('/topics?topic=আরশ');
    await screen.findByText(/মোট ৫ টি হাদিস/);
    expect(screen.getByRole('heading', { level: 2, name: 'আরশ' })).toHaveAttribute('tabindex', '-1');
    expect(screen.getByRole('heading', { level: 2, name: 'আরশ' })).not.toHaveFocus();
  });
});
