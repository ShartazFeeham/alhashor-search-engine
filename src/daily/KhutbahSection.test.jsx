/* The print layout is checked by the classes the print stylesheet hangs on, which Testing Library
   has no query for. */
/* eslint-disable testing-library/no-node-access */
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { bookById } from '../lib/books';
import { formatNumber } from '../lib/digits';
import { splitHadis } from '../lib/hadisText';
import { SettingsProvider } from '../settings/SettingsProvider';
import { diskFetch, realText } from '../test/hadisFixtures';
import { getUrl, setUrl } from '../test/nextNavigation';
import { ToastProvider } from '../ui/Toast';
import KhutbahSection from './KhutbahSection';

const bn = (n) => formatNumber(n, 'bn');
const cite = (bookId, number) => `${bookById(bookId).cite}, হাদীস নং ${bn(number)}`;
const whole = (bookId, number) => {
  const { chain, body } = splitHadis(realText(bookId, number));
  return `${chain} ${body}`.trim().replace(/\s+/g, ' ');
};

let view;
const show = () => {
  view = render(
    <SettingsProvider>
      <ToastProvider>
        <KhutbahSection />
      </ToastProvider>
    </SettingsProvider>
  );
  return view;
};

async function settle() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

const ids = () => getUrl().searchParams.get('ids');
const items = () => within(screen.getByRole('list', { name: 'খুতবার হাদীস' })).getAllByRole('listitem');
const add = (text) => {
  fireEvent.change(screen.getByRole('textbox', { name: 'হাদীস যোগ করুন' }), { target: { value: text } });
  fireEvent.click(screen.getByRole('button', { name: 'যোগ করুন' }));
};

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 9, 2, 10, 0));
  global.fetch = vi.fn(diskFetch);
  window.print = vi.fn();
  Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue() } });
  setUrl('/daily?tab=khutbah&ids=bukhari-1,muslim-5');
});

afterEach(async () => {
  await settle();
  vi.useRealTimers();
  delete global.fetch;
  delete window.print;
});

describe('the list', () => {
  test('shows the hadis from the address in order, each with its full citation and real text', async () => {
    show();
    expect(items()).toHaveLength(2);
    expect(await within(items()[0]).findByText(whole('bukhari', 1))).toBeInTheDocument();
    expect(await within(items()[1]).findByText(whole('muslim', 5))).toBeInTheDocument();
    expect(within(items()[0]).getByText(cite('bukhari', 1))).toBeInTheDocument();
    expect(within(items()[1]).getByText(cite('muslim', 5))).toBeInTheDocument();
    expect(items()[0]).toHaveTextContent('১।');
    expect(items()[1]).toHaveTextContent('২।');
  });

  test('counts them', async () => {
    show();
    expect(screen.getByText('২টি বাছা')).toBeInTheDocument();
    await settle();
  });

  test('drops what is not a hadis, and repeats', async () => {
    setUrl('/daily?tab=khutbah&ids=bukhari-63,nope-1,muslim-5,muslim-5');
    show();
    expect(items()).toHaveLength(1);
    expect(screen.getByText('১টি বাছা')).toBeInTheDocument();
    await settle();
  });

  test('an empty list says how to start, and has nothing to print or copy', () => {
    setUrl('/daily?tab=khutbah');
    show();
    expect(screen.getByText('কোনো হাদীস বাছা হয়নি')).toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'খুতবার হাদীস' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ছাপুন/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'লেখা কপি করুন' })).toBeDisabled();
    expect(screen.getByRole('link', { name: 'আজকের হাদীস' })).toHaveAttribute('href', '/daily');
    expect(screen.getByRole('link', { name: 'পরিকল্পনা' })).toHaveAttribute('href', '/daily?tab=plans');
  });

  test('a hadis whose text cannot be loaded still shows its citation', async () => {
    global.fetch = vi.fn(() => Promise.resolve({ ok: false }));
    show();
    expect(await screen.findAllByText('এই হাদীসটি পাওয়া যায়নি।')).toHaveLength(2);
    expect(within(items()[0]).getByText(cite('bukhari', 1))).toBeInTheDocument();
  });
});

describe('adding by number', () => {
  test('"মুসলিম ৫৫" is added at the end, in the address, and the box is cleared', async () => {
    show();
    add('মুসলিম ৫৫');
    expect(ids()).toBe('bukhari-1,muslim-5,muslim-55');
    expect(getUrl().searchParams.get('tab')).toBe('khutbah');
    expect(screen.getByRole('textbox', { name: 'হাদীস যোগ করুন' })).toHaveValue('');
    expect(screen.getByRole('status', { name: 'যোগ করার ফল' })).toHaveTextContent(`${cite('muslim', 55)} যোগ হয়েছে।`);
    await settle();
  });

  test('English digits and Roman-letter book names work too', async () => {
    show();
    add('tirmidhi 987');
    expect(ids()).toBe('bukhari-1,muslim-5,tirmidhi-987');
    await settle();
  });

  test('works from the keyboard, with Enter', async () => {
    show();
    fireEvent.change(screen.getByRole('textbox', { name: 'হাদীস যোগ করুন' }), { target: { value: 'নাসাঈ ১০' } });
    fireEvent.submit(screen.getByRole('textbox', { name: 'হাদীস যোগ করুন' }).closest('form'));
    expect(ids()).toBe('bukhari-1,muslim-5,nasai-10');
    await settle();
  });

  test('explains text it cannot read', async () => {
    show();
    add('abc');
    expect(screen.getByRole('status', { name: 'যোগ করার ফল' })).toHaveTextContent('গ্রন্থের নাম আর নম্বর লিখুন, যেমন: বুখারী ১২৩৪।');
    expect(ids()).toBe('bukhari-1,muslim-5');
    await settle();
  });

  test('explains a number past the end of the book', async () => {
    show();
    add('মুসলিম ৯৯৯৯৯');
    expect(screen.getByRole('status', { name: 'যোগ করার ফল' })).toHaveTextContent('মুসলিম শরীফে সর্বোচ্চ ৭,২৮১ নম্বর পর্যন্ত আছে।');
    await settle();
  });

  test('explains a number that has no file', async () => {
    show();
    add('বুখারী ৬৩');
    expect(screen.getByRole('status', { name: 'যোগ করার ফল' })).toHaveTextContent('বুখারী শরীফে ৬৩ নম্বরের কোনো হাদীস নেই।');
    expect(ids()).toBe('bukhari-1,muslim-5');
    await settle();
  });

  test('says when it is already in the list', async () => {
    show();
    add('মুসলিম ৫');
    expect(screen.getByRole('status', { name: 'যোগ করার ফল' })).toHaveTextContent('এই হাদীসটি তালিকায় আগেই আছে।');
    expect(ids()).toBe('bukhari-1,muslim-5');
    await settle();
  });

  test('says when the list is full (30)', async () => {
    const full = Array.from({ length: 30 }, (_, i) => `muslim-${i + 1}`).join(',');
    setUrl(`/daily?tab=khutbah&ids=${full}`);
    show();
    add('বুখারী ১');
    expect(screen.getByRole('status', { name: 'যোগ করার ফল' })).toHaveTextContent('তালিকায় ৩০টির বেশি হাদীস রাখা যায় না।');
    expect(ids()).toBe(full);
    await settle();
  });
});

describe('reordering and removing', () => {
  beforeEach(() => setUrl('/daily?tab=khutbah&ids=bukhari-1,muslim-5,tirmidhi-987'));

  test('moves a hadis down and up, in the address', async () => {
    show();
    fireEvent.click(screen.getByRole('button', { name: `নিচে সরান: ${cite('bukhari', 1)}` }));
    expect(ids()).toBe('muslim-5,bukhari-1,tirmidhi-987');
    fireEvent.click(screen.getByRole('button', { name: `উপরে সরান: ${cite('tirmidhi', 987)}` }));
    expect(ids()).toBe('muslim-5,tirmidhi-987,bukhari-1');
    await settle();
  });

  test('the first cannot move up and the last cannot move down', async () => {
    show();
    expect(screen.getByRole('button', { name: `উপরে সরান: ${cite('bukhari', 1)}` })).toBeDisabled();
    expect(screen.getByRole('button', { name: `নিচে সরান: ${cite('tirmidhi', 987)}` })).toBeDisabled();
    expect(screen.getByRole('button', { name: `নিচে সরান: ${cite('bukhari', 1)}` })).toBeEnabled();
    await settle();
  });

  test('removes one hadis', async () => {
    show();
    fireEvent.click(screen.getByRole('button', { name: `বাদ দিন: ${cite('muslim', 5)}` }));
    expect(ids()).toBe('bukhari-1,tirmidhi-987');
    await settle();
  });

  test('removing the last one leaves a plain address', async () => {
    setUrl('/daily?tab=khutbah&ids=muslim-5');
    show();
    fireEvent.click(screen.getByRole('button', { name: `বাদ দিন: ${cite('muslim', 5)}` }));
    expect(getUrl().search).toBe('?tab=khutbah');
    await settle();
  });
});

describe('copying and printing', () => {
  test('copies the list as plain text, numbered, each with its citation', async () => {
    show();
    await settle();
    fireEvent.click(screen.getByRole('button', { name: 'লেখা কপি করুন' }));
    await settle();
    const text = navigator.clipboard.writeText.mock.calls[0][0].replace(/[ \t]+/g, ' ');
    expect(text).toBe(
      ['খুতবার হাদীস তালিকা', '', `১। ${whole('bukhari', 1)}`, `— ${cite('bukhari', 1)}`, '', `২। ${whole('muslim', 5)}`, `— ${cite('muslim', 5)}`].join('\n')
    );
    expect(screen.getByText('কপি করা হয়েছে')).toBeInTheDocument();
  });

  test('copies a link that is the saved list', async () => {
    show();
    fireEvent.click(screen.getByRole('button', { name: 'লিঙ্ক কপি করুন' }));
    await settle();
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(`${window.location.origin}/daily?tab=khutbah&ids=bukhari-1,muslim-5`);
    expect(screen.getByText('লিঙ্ক কপি করা হয়েছে')).toBeInTheDocument();
  });

  test('says so when the clipboard is blocked', async () => {
    navigator.clipboard.writeText.mockRejectedValue(new Error('blocked'));
    show();
    fireEvent.click(screen.getByRole('button', { name: 'লিঙ্ক কপি করুন' }));
    await settle();
    expect(screen.getByText('কপি করা যায়নি')).toBeInTheDocument();
  });

  test('the print button opens the browser print dialog', async () => {
    show();
    fireEvent.click(screen.getByRole('button', { name: /ছাপুন/ }));
    expect(window.print).toHaveBeenCalledTimes(1);
    await settle();
  });

  test('the sheet has what the print stylesheet needs: a title, the date and site name at the foot, items, and screen-only controls', async () => {
    show();
    await settle();
    const sheet = view.container.querySelector('.khut-sheet');
    expect(sheet).not.toBeNull();
    expect(within(sheet).getByRole('heading', { level: 2, name: 'খুতবার হাদীস তালিকা' })).toBeInTheDocument();
    expect(sheet.querySelectorAll('.khut-item')).toHaveLength(2);
    const foot = sheet.querySelector('.khut-foot');
    expect(foot).toHaveTextContent('BoiKotha');
    expect(foot).toHaveTextContent('২ অক্টোবর ২০২৬');
    // every control (move, remove) and the form are hidden in print
    for (const control of screen.getAllByRole('button', { name: /^(উপরে|নিচে) সরান|^বাদ দিন/ })) {
      expect(control.closest('.no-print')).not.toBeNull();
    }
    expect(screen.getByRole('textbox', { name: 'হাদীস যোগ করুন' }).closest('.no-print')).not.toBeNull();
    expect(screen.getByRole('button', { name: /ছাপুন/ }).closest('.no-print')).not.toBeNull();
    expect(sheet.querySelector('.khut-text')).not.toBeNull();
    expect(sheet.querySelector('.khut-cite')).not.toBeNull();
  });

  test('a "print view" button previews the sheet on screen', async () => {
    show();
    const toggle = screen.getByRole('button', { name: 'ছাপার দৃশ্য' });
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
    expect(view.container.querySelector('.khut-sheet')).not.toHaveClass('is-paper');
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
    expect(view.container.querySelector('.khut-sheet')).toHaveClass('is-paper');
    await settle();
  });
});
