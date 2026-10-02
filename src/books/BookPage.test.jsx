/* eslint-disable testing-library/no-node-access -- the layout checks look at class names and containers */
import { readFileSync } from 'node:fs';
import path from 'node:path';
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

// The title links of the cards (the cards are the search result cards).
const cardNumbers = () => [...document.querySelectorAll('.search-item-head a')].map((a) => a.textContent);

const css = readFileSync(path.resolve(process.cwd(), 'src/styles/books.css'), 'utf8');
// The declarations of the first rule whose selector is exactly `selector`.
function rule(selector) {
  const start = css.indexOf(`${selector}{`);
  if (start === -1) throw new Error(`no rule ${selector}`);
  return css.slice(start + selector.length + 1, css.indexOf('}', start));
}
const px = (declarations, property) => Number(new RegExp(`(?:^|;)${property}:(\\d+(?:\\.\\d+)?)px`).exec(declarations)?.[1]);

describe('the page', () => {
  test('is titled with the book on every page (the pre-built title cannot know the page)', async () => {
    const { unmount } = show('muslim');
    expect(document.title).toBe('মুসলিম শরীফ - হাদীসের বই - Alhashor');
    await screen.findByText(file('Muslim', 20));
    unmount();
    show('muslim', '/books/muslim?page=3');
    expect(document.title).toBe('মুসলিম শরীফ - হাদীসের বই - Alhashor');
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
  const type = (text) => fireEvent.change(box(), { target: { value: text } });
  const go = (text) => {
    type(text);
    fireEvent.click(screen.getByRole('button', { name: 'যান' }));
  };
  const note = () => document.querySelector('.books-jump-msg');
  const warning = () => document.querySelector('.books-jump-warn');

  test('a number opens the page of that hadis in the open book, and points at it', () => {
    show('muslim');
    go('45');
    expect(getUrl().pathname + getUrl().search).toBe('/books/muslim?page=3&hadis=45');
  });

  test('Bangla digits work, and the box keeps the digits as typed', () => {
    show('bukhari');
    go('৬৪');
    expect(getUrl().pathname + getUrl().search).toBe('/books/bukhari?page=4&hadis=64');
    expect(box()).toHaveValue('৬৪');
  });

  test('mixed Bangla and English digits work', () => {
    show('muslim');
    go('4৫');
    expect(getUrl().pathname + getUrl().search).toBe('/books/muslim?page=3&hadis=45');
  });

  test('a hadis on the first page has no page in the address', () => {
    show('muslim', '/books/muslim?page=5');
    go('5');
    expect(getUrl().pathname + getUrl().search).toBe('/books/muslim?hadis=5');
  });

  test('the box wants a number: numeric keyboard, short placeholder', () => {
    show('muslim');
    expect(box()).toHaveAttribute('inputmode', 'numeric');
    expect(box()).toHaveAttribute('placeholder', 'নম্বর');
  });

  test('letters, spaces and signs are not accepted, and a short warning says so', () => {
    show('muslim');
    type('4a');
    expect(box()).toHaveValue('4');
    expect(warning()).toHaveAttribute('role', 'status');
    expect(warning()).toHaveTextContent('শুধু সংখ্যা লিখুন');
    type('4 5');
    expect(box()).toHaveValue('45');
    type('-4.5');
    expect(box()).toHaveValue('45');
    type('মুসলিম ৪৫');
    expect(box()).toHaveValue('৪৫');
  });

  test('a pasted text is cleaned to its digits and warns when something was dropped', () => {
    show('muslim');
    type('বুখারী ১২৩৪');
    expect(box()).toHaveValue('১২৩৪');
    expect(warning()).toHaveTextContent('শুধু সংখ্যা লিখুন');
  });

  test('digits alone give no warning, and the warning goes away after about 3 seconds', () => {
    vi.useFakeTimers();
    try {
      show('muslim');
      type('12');
      expect(warning()).toBeEmptyDOMElement();
      type('12x');
      expect(warning()).toHaveTextContent('শুধু সংখ্যা লিখুন');
      act(() => {
        vi.advanceTimersByTime(3100);
      });
      expect(warning()).toBeEmptyDOMElement();
    } finally {
      vi.useRealTimers();
    }
  });

  test('an empty box asks for a number and stays put', () => {
    show('muslim');
    fireEvent.click(screen.getByRole('button', { name: 'যান' }));
    expect(note()).toHaveTextContent('একটি সংখ্যা লিখুন');
    expect(getUrl().pathname).toBe('/books/muslim');
  });

  test('a number past the end names the highest one, and so does 0', () => {
    show('muslim');
    go('9999999');
    expect(screen.getByText('মুসলিম শরীফে সর্বোচ্চ ৭,২৮১ নম্বর পর্যন্ত আছে।')).toBeInTheDocument();
    expect(getUrl().pathname).toBe('/books/muslim');
    go('0');
    expect(screen.getByText('মুসলিম শরীফে সর্বোচ্চ ৭,২৮১ নম্বর পর্যন্ত আছে।')).toBeInTheDocument();
  });

  test('a number with no file says so and offers the hadis either side', () => {
    show('bukhari');
    go('৬৩');
    expect(screen.getByText(/বুখারী শরীফে ৬৩ নম্বরের কোনো হাদীস নেই/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'হাদীস নং ৬২' })).toHaveAttribute('href', '/books/bukhari?page=4&hadis=62');
    expect(screen.getByRole('link', { name: 'হাদীস নং ৬৪' })).toHaveAttribute('href', '/books/bukhari?page=4&hadis=64');
  });

  test('a jump leaves the scrolling to the page, so it can wait for the hadis', () => {
    show('muslim');
    go('45');
    expect(getLastPushOptions()).toEqual({ scroll: false });
  });

  test('the message goes away as soon as the box is edited, and once a jump works', () => {
    show('muslim');
    go('9999999');
    expect(note()).toHaveTextContent('সর্বোচ্চ');
    type('1');
    expect(note()).toBeEmptyDOMElement();
    go('9999999');
    go('45');
    expect(note()).toBeEmptyDOMElement();
  });
});

describe('the layout of the book page', () => {
  beforeEach(() => {
    global.fetch = vi.fn(() => new Promise(() => {}));
  });

  test('the book cards are slim: 36 to 40px high in a row, tight padding, a 44px tap area', () => {
    const link = rule('.books-switch a');
    expect(link).toMatch(/flex-direction:row/);
    expect(px(link, 'height')).toBeGreaterThanOrEqual(36);
    expect(px(link, 'height')).toBeLessThanOrEqual(40);
    expect(Number(/padding:(\d+)px/.exec(link)[1])).toBeLessThanOrEqual(6);
    expect(rule('.books-switch a::after')).toMatch(/inset:-\d+px 0/);
  });

  test('the range strip is one line that scrolls sideways, with 30 to 32px chips and a 44px tap area', () => {
    const strip = rule('.books-ranges');
    expect(strip).toMatch(/display:flex/);
    expect(strip).toMatch(/flex-wrap:nowrap/);
    expect(strip).toMatch(/overflow-x:auto/);
    expect(px(strip, 'gap')).toBe(6);
    const chip = rule('.books-ranges a,.books-ranges span');
    expect(px(chip, 'min-height')).toBeGreaterThanOrEqual(30);
    expect(px(chip, 'min-height')).toBeLessThanOrEqual(32);
    expect(chip).toMatch(/flex:none/);
    expect(rule('.books-ranges a::after,.books-ranges span::after')).toMatch(/inset:-\d+px 0/);
  });

  test('the jump box and its button sit inside the title band, next to the h1', () => {
    show('bukhari');
    const band = screen.getByRole('heading', { level: 1 }).closest('header');
    expect(within(band).getByRole('textbox', { name: 'হাদীস নম্বরে যান' })).toHaveAttribute('placeholder', 'নম্বর');
    expect(within(band).getByRole('button', { name: 'যান' })).toBeInTheDocument();
  });

  test('there is no separate jump card and no example chips', () => {
    show('bukhari');
    expect(screen.queryByRole('heading', { name: 'নম্বরে যান' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'বুখারী ১২৩৪' })).not.toBeInTheDocument();
    expect(screen.queryByText('তিরমিযী ৯৮৭')).not.toBeInTheDocument();
  });

  test('the band is one row at every width: no wrapping, the title shrinks, the form stays small', () => {
    const band = rule('.books-head');
    expect(band).toMatch(/flex-wrap:nowrap/);
    expect(band).toMatch(/align-items:center/);
    expect(rule('.books-head-title')).toMatch(/min-width:0/);
    expect(rule('.books-head h1')).toMatch(/text-overflow:ellipsis/);
    expect(rule('.books-jump-form')).toMatch(/flex:0 1 \d+px/);
    expect(rule('.books-jump-form .ui-btn.sm')).toMatch(/min-height:3\d?px/);
    expect(rule('.books-jump-form .ui-btn.sm::after')).toMatch(/inset:-\d+px/);
  });

  test('the jump messages stay in a status region that takes no room when empty', () => {
    show('bukhari');
    const msg = document.querySelector('.books-jump-msg');
    expect(msg).toHaveAttribute('role', 'status');
    expect(msg.textContent).toBe('');
    expect(rule('.books-jump-msg:empty')).toMatch(/display:none/);
  });

  test('the range label and the pager (above the list) share one row', () => {
    show('bukhari', '/books/bukhari?page=4');
    const label = screen.getByText('হাদীস নং ৬১ - ৮১');
    const pager = screen.getByRole('navigation', { name: 'পাতা (উপরে)' });
    expect(label.parentElement).toBe(pager.parentElement);
    expect(label.parentElement).toHaveClass('books-bar');
    expect(rule('.books-bar')).toMatch(/display:flex/);
  });
});

describe('the list uses the search result cards', () => {
  const items = () => screen.getByRole('list', { name: 'হাদীসের তালিকা' }).querySelectorAll(':scope > li');

  test('each hadis has the title link, the snippet (no highlight) and the compact buttons', async () => {
    show('muslim');
    await screen.findByText(file('Muslim', 20));
    const first = items()[0];
    expect(first).toHaveClass('search-item');
    expect(first.id).toBe('h1');
    expect(within(first).getByRole('link', { name: 'মুসলিম শরীফ - হাদীস নং ১' })).toHaveAttribute('href', '/hadis/muslim/1');
    expect(first.querySelector('.search-text')).toHaveTextContent(file('Muslim', 1));
    expect(first.querySelector('mark')).toBeNull();
    expect(within(first).getByRole('button', { name: 'কপি' })).toBeInTheDocument();
    expect(within(first).getByRole('button', { name: 'শেয়ার' })).toBeInTheDocument();
    expect(within(first).getByRole('button', { name: 'তুলনায় যোগ করুন' })).toBeInTheDocument();
  });

  test('a plain click on the text opens the hadis page, a click on a button does not', async () => {
    show('muslim');
    const text = (await screen.findByText(file('Muslim', 2)));
    fireEvent.click(within(text.closest('li')).getByRole('button', { name: 'কপি' }));
    expect(getUrl().pathname).toBe('/books/muslim');
    fireEvent.click(text);
    expect(getUrl().pathname).toBe('/hadis/muslim/2');
  });

  test('a long hadis is cut with the "full hadis" link', async () => {
    global.fetch = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve(`১। ${'শব্দ '.repeat(200)}`) }));
    show('muslim');
    const links = await screen.findAllByRole('link', { name: 'সম্পূর্ণ হাদীস দেখুন...' });
    expect(links).toHaveLength(20);
    expect(rule('.books-list .search-text')).toMatch(/-webkit-line-clamp:3/);
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
