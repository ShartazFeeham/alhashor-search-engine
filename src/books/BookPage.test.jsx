import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { SettingsProvider } from '../settings/SettingsProvider';
import { ToastProvider } from '../ui/Toast';
import { getLastPushOptions, getUrl, setUrl } from '../test/nextNavigation';
import BookPage from './BookPage';
import BookPageFallback from './BookPageFallback';

// Every hadis file "contains" its own path, so a card shows which file it loaded.
// jsdom cannot scroll; the page scrolls to a pointed-at hadis, so give it something to call.
beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
  global.fetch = vi.fn((url) => Promise.resolve({ ok: true, json: () => Promise.resolve(`১। ${url}`) }));
});

// Cards load their text after the test body; let those loads finish inside act().
afterEach(async () => {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  delete global.fetch;
  delete Element.prototype.scrollIntoView;
});

const file = (folder, number) => `/json/hadis/${folder}/${String(number).padStart(4, '0')}/text.txt`;

function show(bookId, address) {
  setUrl(address ?? `/books/${bookId}`);
  return render(
    <SettingsProvider>
      <ToastProvider>
        <BookPage bookId={bookId} />
      </ToastProvider>
    </SettingsProvider>
  );
}

const cardNumbers = () =>
  screen
    .getAllByRole('heading', { level: 2 })
    .map((h) => h.textContent)
    .filter((text) => /হাদীস নং/.test(text));

describe('the page', () => {
  test('is titled with the book on every page (the pre-built title cannot know the page)', async () => {
    const { unmount } = show('muslim');
    expect(document.title).toBe('মুসলিম শরীফ - হাদীসের বই - BoiKotha');
    await screen.findByText(file('Muslim', 20));
    unmount();
    show('muslim', '/books/muslim?page=3');
    expect(document.title).toBe('মুসলিম শরীফ - হাদীসের বই - BoiKotha');
    await screen.findByText(file('Muslim', 60));
  });

  test('names the book and its real hadis count', async () => {
    show('bukhari');
    expect(screen.getByRole('heading', { level: 1, name: 'বুখারী শরীফ' })).toBeInTheDocument();
    expect(screen.getByText(/মোট ৬,৭১৯ টি হাদীস/)).toBeInTheDocument();
    await screen.findByText(file('Bukhari', 20));
  });

  test('the first page shows hadis 1 to 20 and loads no more', async () => {
    show('muslim');
    expect(await screen.findByText(file('Muslim', 20))).toBeInTheDocument();
    expect(cardNumbers()).toHaveLength(20);
    expect(cardNumbers()[0]).toBe('মুসলিম শরীফ - হাদীস নং ১');
    expect(global.fetch).not.toHaveBeenCalledWith(file('Muslim', 21));
  });

  test('a later page skips numbers that have no file', async () => {
    show('bukhari', '/books/bukhari?page=4');
    await screen.findByText(file('Bukhari', 81));
    const numbers = cardNumbers();
    expect(numbers[0]).toBe('বুখারী শরীফ - হাদীস নং ৬১');
    expect(numbers).toContain('বুখারী শরীফ - হাদীস নং ৬২');
    expect(numbers).not.toContain('বুখারী শরীফ - হাদীস নং ৬৩');
    expect(numbers).toHaveLength(20);
    expect(global.fetch).not.toHaveBeenCalledWith(file('Bukhari', 63));
    expect(screen.getByText('হাদীস নং ৬১ - ৮১')).toBeInTheDocument();
  });

  test('a page past the end shows the last page, and a bad page shows the first', async () => {
    const { unmount } = show('tirmidhi', '/books/tirmidhi?page=999');
    await screen.findByText(file('Tirmiji', 3608));
    expect(cardNumbers()).toHaveLength(8);
    expect(screen.getByText('হাদীস নং ৩,৬০১ - ৩,৬০৮')).toBeInTheDocument();
    unmount();
    show('tirmidhi', '/books/tirmidhi?page=abc');
    expect(await screen.findByText(file('Tirmiji', 1))).toBeInTheDocument();
  });

  test('gives each hadis an anchor named after its number', async () => {
    show('muslim');
    await screen.findByText(file('Muslim', 20));
    const ids = screen.getAllByRole('listitem').map((item) => item.id);
    expect(ids).toHaveLength(20);
    expect(ids[0]).toBe('h1');
    expect(ids).toContain('h7');
    expect(ids).not.toContain('h45');
  });
});

describe('the pager', () => {
  // These tests are about the controls, not the texts: the texts simply never arrive.
  beforeEach(() => {
    global.fetch = vi.fn(() => new Promise(() => {}));
  });

  const pagers = () => screen.getAllByRole('navigation', { name: /^পাতা/ });

  test('links to the neighbouring pages and ten pages either way', () => {
    show('bukhari', '/books/bukhari?page=20');
    const pager = within(pagers()[0]);
    expect(pager.getByRole('link', { name: /আগের/ })).toHaveAttribute('href', '/books/bukhari?page=19');
    expect(pager.getByRole('link', { name: /পরের/ })).toHaveAttribute('href', '/books/bukhari?page=21');
    expect(pager.getByRole('link', { name: '১০ পাতা পিছনে' })).toHaveAttribute('href', '/books/bukhari?page=10');
    expect(pager.getByRole('link', { name: '১০ পাতা সামনে' })).toHaveAttribute('href', '/books/bukhari?page=30');
    expect(pagers()[0]).toHaveTextContent('পাতা ২০ / ৩৩৬');
  });

  test('the first page has no plain "page" in its address', () => {
    show('bukhari', '/books/bukhari?page=2');
    expect(within(pagers()[0]).getByRole('link', { name: /আগের/ })).toHaveAttribute('href', '/books/bukhari');
  });

  test('on the first page the backward controls are off', () => {
    show('bukhari');
    const pager = within(pagers()[0]);
    expect(pager.queryByRole('link', { name: /আগের/ })).not.toBeInTheDocument();
    expect(pager.getByText(/আগের/)).toHaveAttribute('aria-disabled', 'true');
    expect(pager.getByText('−১০')).toHaveAttribute('aria-disabled', 'true');
  });

  test('a control that cannot be used is plain dimmed text, not a "button" that cannot be reached', () => {
    show('bukhari');
    const pager = within(pagers()[0]);
    expect(pager.queryByRole('button')).not.toBeInTheDocument();
    expect(pager.getByText(/আগের/)).not.toHaveAttribute('role');
  });

  test('on the last page the forward controls are off', () => {
    show('tirmidhi', '/books/tirmidhi?page=181');
    const pager = within(pagers()[0]);
    expect(pager.queryByRole('link', { name: /পরের/ })).not.toBeInTheDocument();
    expect(pager.getByText('+১০')).toHaveAttribute('aria-disabled', 'true');
  });

  test('ten pages never go past either end', () => {
    show('tirmidhi', '/books/tirmidhi?page=175');
    expect(within(pagers()[0]).getByRole('link', { name: '১০ পাতা সামনে' })).toHaveAttribute('href', '/books/tirmidhi?page=181');
    expect(within(pagers()[0]).getByRole('link', { name: '১০ পাতা পিছনে' })).toHaveAttribute('href', '/books/tirmidhi?page=165');
  });

  test('the same pager sits above and below the list, with different names', () => {
    show('bukhari', '/books/bukhari?page=2');
    expect(pagers()).toHaveLength(2);
    expect(screen.getByRole('navigation', { name: 'পাতা (উপরে)' })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'পাতা (নিচে)' })).toBeInTheDocument();
  });
});

describe('the book switcher', () => {
  // These tests are about the controls, not the texts: the texts simply never arrive.
  beforeEach(() => {
    global.fetch = vi.fn(() => new Promise(() => {}));
  });

  test('has a link per book and marks the open one', () => {
    show('muslim');
    const group = screen.getByRole('navigation', { name: 'গ্রন্থ বাছুন' });
    const links = within(group).getAllByRole('link');
    expect(links.map((l) => l.getAttribute('href'))).toEqual([
      '/books/bukhari', '/books/muslim', '/books/tirmidhi', '/books/abudawud', '/books/ibnmajah', '/books/nasai',
    ]);
    expect(within(group).getByRole('link', { name: /মুসলিম/ })).toHaveAttribute('aria-current', 'page');
    expect(within(group).getByRole('link', { name: /বুখারী/ })).not.toHaveAttribute('aria-current');
  });
});

describe('the range grid', () => {
  // These tests are about the controls, not the texts: the texts simply never arrive.
  beforeEach(() => {
    global.fetch = vi.fn(() => new Promise(() => {}));
  });

  const grid = () => screen.getByRole('navigation', { name: 'পরিসর' });

  test('has a range per hundred numbers, each linking to its page', () => {
    show('tirmidhi');
    const links = within(grid()).getAllByRole('link');
    expect(links).toHaveLength(37);
    expect(within(grid()).getByRole('link', { name: '১-১০০' })).toHaveAttribute('href', '/books/tirmidhi');
    expect(within(grid()).getByRole('link', { name: '১০১-২০০' })).toHaveAttribute('href', '/books/tirmidhi?page=6');
    expect(within(grid()).getByRole('link', { name: '৩,৬০১-৩,৬০৮' })).toHaveAttribute('href', '/books/tirmidhi?page=181');
  });

  test('marks the range the page is in', () => {
    show('tirmidhi', '/books/tirmidhi?page=6');
    expect(within(grid()).getByRole('link', { name: '১০১-২০০' })).toHaveAttribute('aria-current', 'true');
    expect(within(grid()).getByRole('link', { name: '১-১০০' })).not.toHaveAttribute('aria-current');
  });

  test('a range with no hadis at all is shown but cannot be opened', () => {
    show('bukhari');
    expect(within(grid()).queryByRole('link', { name: '২,০০১-২,১০০' })).not.toBeInTheDocument();
    expect(within(grid()).getByText('২,০০১-২,১০০')).toHaveAttribute('aria-disabled', 'true');
  });
});

describe('jump to a number', () => {
  // These tests are about the controls, not the texts: the texts simply never arrive.
  beforeEach(() => {
    global.fetch = vi.fn(() => new Promise(() => {}));
  });

  const box = () => screen.getByRole('textbox', { name: 'হাদীস নম্বরে যান' });
  const go = (text) => {
    fireEvent.change(box(), { target: { value: text } });
    fireEvent.click(screen.getByRole('button', { name: 'যান' }));
  };

  test('"মুসলিম ৪৫" opens the page of that hadis, in that book, and points at it', () => {
    show('bukhari');
    go('মুসলিম ৪৫');
    expect(getUrl().pathname + getUrl().search).toBe('/books/muslim?page=3&hadis=45');
  });

  test('a hadis on the first page has no page in the address', () => {
    show('muslim', '/books/muslim?page=5');
    go('মুসলিম ৫');
    expect(getUrl().pathname + getUrl().search).toBe('/books/muslim?hadis=5');
  });

  test('a number alone means the book that is open, and English digits work', () => {
    show('muslim');
    go('45');
    expect(getUrl().pathname + getUrl().search).toBe('/books/muslim?page=3&hadis=45');
  });

  test('Roman-letter book names work', () => {
    show('muslim');
    go('Bukhari 64');
    expect(getUrl().pathname + getUrl().search).toBe('/books/bukhari?page=4&hadis=64');
  });

  test('explains what to type when it cannot read the text, and stays put', () => {
    show('muslim');
    go('রোজা');
    expect(screen.getByText(/গ্রন্থের নাম আর নম্বর লিখুন, যেমন: বুখারী ১২৩৪/)).toBeInTheDocument();
    expect(getUrl().pathname).toBe('/books/muslim');
  });

  test('a number past the end names the highest one', () => {
    show('muslim');
    go('বুখারী ৯৯৯৯');
    expect(screen.getByText('বুখারী শরীফে সর্বোচ্চ ৭,০৫৩ নম্বর পর্যন্ত আছে।')).toBeInTheDocument();
    expect(getUrl().pathname).toBe('/books/muslim');
  });

  test('a number with no file says so and offers the hadis either side', () => {
    show('muslim');
    go('বুখারী ৬৩');
    expect(screen.getByText(/বুখারী শরীফে ৬৩ নম্বরের কোনো হাদীস নেই/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'হাদীস নং ৬২' })).toHaveAttribute('href', '/books/bukhari?page=4&hadis=62');
    expect(screen.getByRole('link', { name: 'হাদীস নং ৬৪' })).toHaveAttribute('href', '/books/bukhari?page=4&hadis=64');
  });

  test('a jump leaves the scrolling to the page, so it can wait for the hadis', () => {
    show('muslim');
    go('মুসলিম ৪৫');
    expect(getLastPushOptions()).toEqual({ scroll: false });
  });

  test('the message goes away as soon as the box is edited', () => {
    show('muslim');
    go('রোজা');
    expect(screen.getByText(/গ্রন্থের নাম আর নম্বর/)).toBeInTheDocument();
    fireEvent.change(box(), { target: { value: 'মুসলিম ১' } });
    expect(screen.queryByText(/গ্রন্থের নাম আর নম্বর/)).not.toBeInTheDocument();
  });

  test('the examples are plain buttons, not toggles', () => {
    show('muslim');
    expect(screen.getByRole('button', { name: 'বুখারী ১২৩৪' })).not.toHaveAttribute('aria-pressed');
  });

  test('the message goes away once a jump works', () => {
    show('muslim');
    go('রোজা');
    go('মুসলিম ৪৫');
    expect(screen.queryByText(/গ্রন্থের নাম আর নম্বর/)).not.toBeInTheDocument();
  });

  test('an example fills the box and does not jump', () => {
    show('muslim');
    fireEvent.click(screen.getByRole('button', { name: 'বুখারী ১২৩৪' }));
    expect(box()).toHaveValue('বুখারী ১২৩৪');
    expect(getUrl().pathname).toBe('/books/muslim');
  });
});

describe('pointing at a hadis (?hadis=45)', () => {
  beforeEach(() => {
    global.fetch = vi.fn(() => new Promise(() => {}));
  });
  const marked = () => screen.getAllByRole('listitem').filter((item) => item.dataset.target === 'true').map((item) => item.id);

  test('marks that hadis and scrolls it into view', () => {
    show('muslim', '/books/muslim?page=3&hadis=45');
    expect(marked()).toEqual(['h45']);
    expect(Element.prototype.scrollIntoView).toHaveBeenCalledTimes(1);
    expect(Element.prototype.scrollIntoView.mock.contexts[0].id).toBe('h45');
  });

  test('marks nothing and does not scroll without it', () => {
    show('muslim', '/books/muslim?page=3');
    expect(marked()).toEqual([]);
    expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
  });

  test('a number that is not on this page is ignored', () => {
    show('muslim', '/books/muslim?page=1&hadis=45');
    expect(marked()).toEqual([]);
    expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
  });

  test('moving to another page with the pager goes to the top, by itself', () => {
    show('muslim', '/books/muslim?page=3&hadis=45');
    document.documentElement.scrollTop = 500;
    const next = within(screen.getAllByRole('navigation', { name: /^পাতা/ })[0]).getByRole('link', { name: /পরের/ });
    expect(next).toHaveAttribute('data-scroll', 'false'); // Next's own scrolling is off
    fireEvent.click(next);
    expect(document.documentElement.scrollTop).toBe(0);
    expect(getUrl().search).toBe('?page=4'); // and the pointer does not follow
  });
});

describe('focus and announcements after paging', () => {
  const nextLink = () => within(screen.getAllByRole('navigation', { name: /^পাতা/ })[1]).getByRole('link', { name: /পরের/ });

  test('the list takes focus after a pager link is used, but not on first view', async () => {
    show('muslim', '/books/muslim?page=3');
    const list = screen.getByRole('list', { name: 'হাদীসের তালিকা' });
    expect(list).toHaveAttribute('tabindex', '-1');
    expect(list).not.toHaveFocus();
    fireEvent.click(nextLink());
    expect(list).toHaveFocus();
    await screen.findByText(file('Muslim', 80));
  });

  test('the new page is announced in a status region', async () => {
    show('muslim', '/books/muslim?page=3');
    fireEvent.click(nextLink());
    const note = screen.getByText('পাতা ৪', { selector: '.sr-only' });
    expect(note).toHaveAttribute('role', 'status');
    await screen.findByText(file('Muslim', 80));
  });

  test('choosing a range focuses the list too', async () => {
    show('muslim', '/books/muslim');
    fireEvent.click(within(screen.getByRole('navigation', { name: 'পরিসর' })).getAllByRole('link')[2]);
    expect(screen.getByRole('list', { name: 'হাদীসের তালিকা' })).toHaveFocus();
    await screen.findByText(file('Muslim', 201));
  });
});

describe('the book page before its address is read (the pre-built page)', () => {
  test('already names the book, shows the count and the switcher', () => {
    render(
      <SettingsProvider>
        <BookPageFallback bookId="muslim" />
      </SettingsProvider>
    );
    expect(screen.getByRole('heading', { level: 1, name: 'মুসলিম শরীফ' })).toBeInTheDocument();
    expect(screen.getByText(/মোট ৭,২৮১ টি হাদীস/)).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'গ্রন্থ বাছুন' })).toBeInTheDocument();
  });
});
