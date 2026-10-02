/* eslint-disable testing-library/no-node-access */
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { STORAGE_KEY } from '../lib/compareList';
import { SettingsProvider } from '../settings/SettingsProvider';
import { diskFetch } from '../test/hadisFixtures';
import { getUrl, setUrl } from '../test/nextNavigation';
import { ToastProvider } from '../ui/Toast';
import ComparePage from './ComparePage';
import { CompareProvider } from './CompareProvider';

const show = () =>
  render(
    <SettingsProvider>
      <ToastProvider>
        <CompareProvider>
          <ComparePage />
        </CompareProvider>
      </ToastProvider>
    </SettingsProvider>
  );

async function settle() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

const address = () => getUrl().pathname + getUrl().search;
const column = (name) => screen.getByRole('region', { name });

beforeEach(() => {
  sessionStorage.clear();
  global.fetch = vi.fn(diskFetch);
});

afterEach(async () => {
  await settle();
  delete global.fetch;
});

describe('hadis with almost no words in common', () => {
  const NOTE = /এই হাদীসগুলোর মধ্যে শব্দের মিল খুব কম/;

  test('Bukhari 1 and Abu Dawud 2000: no word is marked, a calm note is shown instead of the legend', async () => {
    setUrl('/compare?ids=bukhari-1,abudawud-2000');
    show();
    expect(await screen.findByText(NOTE)).toBeInTheDocument();
    expect(screen.queryByText(/চিহ্নিত শব্দ অন্য হাদীসে নেই/)).not.toBeInTheDocument();
    const first = column('বুখারী শরীফ - হাদীস নং ১');
    expect(first.querySelectorAll('mark')).toHaveLength(0);
    expect(column('আবু দাউদ শরীফ - হাদীস নং ২,০০০').querySelectorAll('mark')).toHaveLength(0);
    // the counts under each column are still shown
    expect(within(first).getByText(/টি শব্দের মধ্যে .* টি অন্যদের সাথে মিলেছে/)).toBeInTheDocument();
  });

  test('the same report (Bukhari 1 and Muslim 4774) still marks words and shows the legend, with no note', async () => {
    setUrl('/compare?ids=bukhari-1,muslim-4774');
    show();
    expect(await screen.findByText(/চিহ্নিত শব্দ অন্য হাদীসে নেই/)).toBeInTheDocument();
    expect(screen.queryByText(NOTE)).not.toBeInTheDocument();
    expect(column('বুখারী শরীফ - হাদীস নং ১').querySelectorAll('mark').length).toBeGreaterThan(0);
  });
});

describe('two or more hadis in the address', () => {
  test('shows a column per hadis, each with its citation as a link to the hadis page', async () => {
    setUrl('/compare?ids=bukhari-1,muslim-4774');
    show();
    expect(screen.getByRole('heading', { level: 1, name: 'হাদীস তুলনা' })).toBeInTheDocument();
    const first = column('বুখারী শরীফ - হাদীস নং ১');
    expect(within(first).getByRole('link', { name: 'বুখারী শরীফ - হাদীস নং ১' })).toHaveAttribute('href', '/hadis/bukhari/1');
    const second = column('মুসলিম শরীফ - হাদীস নং ৪,৭৭৪');
    expect(within(second).getByRole('link', { name: 'মুসলিম শরীফ - হাদীস নং ৪,৭৭৪' })).toHaveAttribute('href', '/hadis/muslim/4774');
    await screen.findByText(/মিম্বরের/);
    await settle();
  });

  test('the text has no leading number and, by default, no narrator chain', async () => {
    setUrl('/compare?ids=bukhari-1,muslim-4774');
    show();
    const first = column('বুখারী শরীফ - হাদীস নং ১');
    await waitFor(() => expect(first.textContent).toContain('মিম্বরের'));
    expect(first.textContent).not.toMatch(/১।/);
    expect(first.textContent.normalize('NFD')).not.toContain('হুমায়দী'.normalize('NFD'));
    expect(first.textContent).toContain('আমি উমর');
  });

  test('words no other column has are marked, and shared ones are not', async () => {
    setUrl('/compare?ids=bukhari-1,muslim-4774');
    show();
    const first = column('বুখারী শরীফ - হাদীস নং ১');
    await waitFor(() => expect(first.querySelectorAll('mark').length).toBeGreaterThan(0));
    const marked = [...first.querySelectorAll('mark')].map((mark) => mark.textContent);
    expect(marked.some((text) => text.includes('প্রত্যেক'))).toBe(true);
    expect(marked.join(' ').split(/\s+/)).not.toContain('হিজরত'); // Muslim has this word too
  });

  test('under each column: how many of its words the others share', async () => {
    setUrl('/compare?ids=bukhari-1,muslim-4774');
    show();
    const first = column('বুখারী শরীফ - হাদীস নং ১');
    const note = await within(first).findByText(/টি শব্দের মধ্যে .* টি অন্যদের সাথে মিলেছে/);
    expect(note.textContent).toMatch(/^[০-৯]+ টি শব্দের মধ্যে [০-৯]+ টি অন্যদের সাথে মিলেছে$/);
  });

  test('a legend explains the marking in words, not only colour', async () => {
    setUrl('/compare?ids=bukhari-1,muslim-4774');
    show();
    expect(await screen.findByText(/চিহ্নিত শব্দ অন্য হাদীসে নেই/)).toBeInTheDocument();
  });

  test('"বর্ণনাকারীসহ" brings the narrator chain in and keeps itself in the address', async () => {
    setUrl('/compare?ids=bukhari-1,muslim-4774');
    show();
    const first = column('বুখারী শরীফ - হাদীস নং ১');
    await waitFor(() => expect(first.textContent).toContain('মিম্বরের'));
    const toggle = screen.getByRole('button', { name: 'বর্ণনাকারীসহ' });
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(toggle);
    expect(address()).toBe('/compare?ids=bukhari-1,muslim-4774&chain=1');
    expect(screen.getByRole('button', { name: 'বর্ণনাকারীসহ' })).toHaveAttribute('aria-pressed', 'true');
    await waitFor(() => expect(column('বুখারী শরীফ - হাদীস নং ১').textContent.normalize('NFD')).toContain('হুমায়দী'.normalize('NFD')));
  });

  test('the count of chosen hadis shows', () => {
    setUrl('/compare?ids=bukhari-1,muslim-4774');
    show();
    expect(screen.getByText('তুলনার হাদীস (২/৪)')).toBeInTheDocument();
  });

  test('the remove button takes a hadis out of the address and the choice', async () => {
    setUrl('/compare?ids=bukhari-1,muslim-4774,ibnmajah-4227');
    show();
    await settle();
    fireEvent.click(within(column('মুসলিম শরীফ - হাদীস নং ৪,৭৭৪')).getByRole('button', { name: 'মুসলিম শরীফ - হাদীস নং ৪,৭৭৪ তুলনা থেকে সরান' }));
    expect(address()).toBe('/compare?ids=bukhari-1,ibnmajah-4227');
    expect(sessionStorage.getItem(STORAGE_KEY)).toBe('bukhari-1,ibnmajah-4227');
    expect(screen.queryByRole('region', { name: 'মুসলিম শরীফ - হাদীস নং ৪,৭৭৪' })).not.toBeInTheDocument();
  });

  test('a hadis that cannot be found says so, and the rest still compare', async () => {
    global.fetch = vi.fn((url) => (url.includes('/Muslim/') ? Promise.resolve({ ok: false }) : diskFetch(url)));
    setUrl('/compare?ids=bukhari-1,muslim-4774,ibnmajah-4227');
    show();
    expect(await within(column('মুসলিম শরীফ - হাদীস নং ৪,৭৭৪')).findByText('এই হাদীসটি পাওয়া যায়নি।')).toBeInTheDocument();
    const first = column('বুখারী শরীফ - হাদীস নং ১');
    expect(await within(first).findByText(/টি শব্দের মধ্যে/)).toBeInTheDocument();
  });

  test('a failed load shows a retry button that loads it again', async () => {
    let offline = true;
    global.fetch = vi.fn((url) => (offline && url.includes('/Muslim/') ? Promise.reject(new Error('offline')) : diskFetch(url)));
    setUrl('/compare?ids=bukhari-1,muslim-4774');
    show();
    const second = column('মুসলিম শরীফ - হাদীস নং ৪,৭৭৪');
    const retry = await within(second).findByRole('button', { name: 'আবার চেষ্টা করুন' });
    offline = false;
    fireEvent.click(retry);
    await waitFor(() => expect(second.textContent).toContain('রাসুলুল্লাহ'));
    expect(await within(second).findByText(/অন্যদের সাথে মিলেছে/)).toBeInTheDocument();
  });

  test('the address is kept in the choice, so the floating bar on other pages matches it', async () => {
    setUrl('/compare?ids=bukhari-1,muslim-4774');
    show();
    await settle();
    expect(sessionStorage.getItem(STORAGE_KEY)).toBe('bukhari-1,muslim-4774');
  });

  test('"সব মুছুন" empties the comparison', async () => {
    setUrl('/compare?ids=bukhari-1,muslim-4774');
    show();
    await settle();
    fireEvent.click(screen.getByRole('button', { name: 'সব মুছুন' }));
    expect(address()).toBe('/compare');
    expect(sessionStorage.getItem(STORAGE_KEY)).toBe('');
    expect(screen.getByText('তুলনা করতে দুটি হাদীস যোগ করুন')).toBeInTheDocument();
  });

  test('bad ids in the address are ignored', () => {
    setUrl('/compare?ids=bukhari-1,nonsense-3,bukhari-63');
    show();
    expect(screen.getByText('তুলনার হাদীস (১/৪)')).toBeInTheDocument();
  });
});

describe('fewer than two', () => {
  test('nothing chosen: asks for two, without columns', () => {
    show();
    expect(screen.getByText('তুলনা করতে দুটি হাদীস যোগ করুন')).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: /হাদীস নং/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'সব মুছুন' })).toBeDisabled();
  });

  test('one chosen: shows it and asks for one more', async () => {
    setUrl('/compare?ids=muslim-4774');
    show();
    expect(screen.getByText('আরও একটি হাদীস যোগ করুন')).toBeInTheDocument();
    const only = column('মুসলিম শরীফ - হাদীস নং ৪,৭৭৪');
    await waitFor(() => expect(only.textContent).toContain('রাসুলুল্লাহ'));
    expect(within(only).queryByText(/অন্যদের সাথে মিলেছে/)).not.toBeInTheDocument();
    expect(only.querySelector('mark')).toBeNull();
  });
});

describe('first load with a choice in memory', () => {
  test('no ids in the address: the choice is used and put into the address', async () => {
    sessionStorage.setItem(STORAGE_KEY, 'bukhari-1,muslim-4774');
    setUrl('/compare');
    show();
    await settle();
    expect(address()).toBe('/compare?ids=bukhari-1,muslim-4774');
    expect(column('বুখারী শরীফ - হাদীস নং ১')).toBeInTheDocument();
  });

  test('ids in the address win over the choice', async () => {
    sessionStorage.setItem(STORAGE_KEY, 'bukhari-1,muslim-4774');
    setUrl('/compare?ids=ibnmajah-4227,muslim-4774');
    show();
    await settle();
    expect(address()).toBe('/compare?ids=ibnmajah-4227,muslim-4774');
    expect(sessionStorage.getItem(STORAGE_KEY)).toBe('ibnmajah-4227,muslim-4774');
  });
});

describe('adding by number', () => {
  const add = (text) => {
    fireEvent.change(screen.getByRole('textbox', { name: 'হাদীস যোগ করুন' }), { target: { value: text } });
    fireEvent.click(screen.getByRole('button', { name: 'যোগ করুন' }));
  };
  const message = () => screen.getByRole('status', { name: 'যোগ করার ফল' });

  test('"বুখারী ১২৩৪" is added to the address', async () => {
    setUrl('/compare?ids=muslim-4774');
    show();
    await settle();
    add('বুখারী ১');
    expect(address()).toBe('/compare?ids=muslim-4774,bukhari-1');
    expect(message()).toHaveTextContent('সহীহ বুখারী, হাদীস নং ১ যোগ হয়েছে।');
    expect(screen.getByRole('textbox', { name: 'হাদীস যোগ করুন' })).toHaveValue('');
  });

  test('explains what it cannot read, a number past the end and a number with no file', async () => {
    setUrl('/compare');
    show();
    add('hello');
    expect(message()).toHaveTextContent('গ্রন্থের নাম আর নম্বর লিখুন');
    add('মুসলিম ৯৯৯৯৯');
    expect(message()).toHaveTextContent('মুসলিম শরীফে সর্বোচ্চ ৭,২৮১ নম্বর পর্যন্ত আছে।');
    add('বুখারী ৬৩');
    expect(message()).toHaveTextContent('বুখারী শরীফে ৬৩ নম্বরের কোনো হাদীস নেই।');
    expect(address()).toBe('/compare');
    await settle();
  });

  test('says when the hadis is already there and when four are chosen', async () => {
    setUrl('/compare?ids=muslim-4774');
    show();
    await settle();
    add('মুসলিম ৪৭৭৪');
    expect(message()).toHaveTextContent('এই হাদীসটি তুলনায় আগেই আছে।');
    setUrl('/compare?ids=bukhari-1,bukhari-2,bukhari-3,bukhari-4');
    await settle();
    add('মুসলিম ৫');
    expect(message()).toHaveTextContent('সর্বোচ্চ ৪টি হাদীস তুলনা করা যায়।');
    expect(address()).toBe('/compare?ids=bukhari-1,bukhari-2,bukhari-3,bukhari-4');
  });
});

test('the page is titled', () => {
  show();
  expect(document.title).toBe('হাদীস তুলনা - Alhashor');
});
