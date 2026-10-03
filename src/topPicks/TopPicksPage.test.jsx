import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { PLANS } from '../data/readingPlans';
import { TOP_PICKS } from '../lib/topPicks';
import { bookById } from '../lib/books';
import { formatNumber } from '../lib/digits';
import { splitHadis } from '../lib/hadisText';
import { STORAGE_KEY } from '../lib/planProgress';
import { SettingsProvider } from '../settings/SettingsProvider';
import { diskFetch, realText } from '../test/hadisFixtures';
import { getUrl, setUrl } from '../test/nextNavigation';
import { ToastProvider } from '../ui/Toast';
import TopPicksPage from './TopPicksPage';
import TopPicksSetPage from './TopPicksSetPage';

const bn = (n) => formatNumber(n, 'bn');
const PLAN = PLANS.find((plan) => plan.days.length <= 10) ?? PLANS[PLANS.length - 1];
const cite = (day) => `${bookById(day.book).cite}, হাদীস নং ${bn(day.number)}`;
const planAddress = (plan) => `/top-picks/${plan.id}`;

const wrap = (page) => (
  <SettingsProvider>
    <ToastProvider>{page}</ToastProvider>
  </SettingsProvider>
);
// The list page, or the set page for the set the address names (/top-picks/<id>).
const show = () => {
  const id = getUrl().pathname.split('/')[2];
  return render(wrap(id ? <TopPicksSetPage id={id} /> : <TopPicksPage />));
};

async function settle() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

const saved = () => JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
const checkboxes = () => screen.getAllByRole('checkbox');

beforeEach(() => {
  global.fetch = vi.fn(diskFetch);
  setUrl('/top-picks');
});

afterEach(async () => {
  await settle();
  delete global.fetch;
});

const card = (plan) => screen.getAllByRole('link').find((link) => link.getAttribute('href') === planAddress(plan));

describe('the list of sets', () => {
  test('is titled টপ লিস্ট/হাদীস and shows every set as a link to its page, with its count', () => {
    show();
    expect(screen.getByRole('heading', { level: 1, name: 'টপ লিস্ট/হাদীস' })).toBeInTheDocument();
    expect(document.title).toBe('টপ লিস্ট/হাদীস - Alhashor');
    expect(screen.getByText('সবথেকে জনপ্রিয় হাদীসের সংগ্রহ')).toBeInTheDocument();
    for (const set of TOP_PICKS) {
      const link = card(set);
      expect(link, set.id).toBeDefined();
      expect(link).toHaveTextContent(set.title);
      expect(link).toHaveTextContent(`${bn(set.days.length)}টি হাদীস`);
    }
  });

  test('the three older plans come after the new sets', () => {
    show();
    const hrefs = screen.getAllByRole('link').map((link) => link.getAttribute('href')).filter((href) => href?.startsWith('/top-picks/'));
    expect(hrefs).toEqual(TOP_PICKS.map((set) => `/top-picks/${set.id}`));
    expect(hrefs.slice(-3)).toEqual(PLANS.map((plan) => `/top-picks/${plan.id}`));
  });

  test('a card has the title, then one description line with the count, then the progress', () => {
    show();
    const link = card(PLAN);
    expect(within(link).getByText(PLAN.title)).toHaveClass('plan-card-title');
    expect(within(link).getByText(`${bn(PLAN.days.length)}টি হাদীস`)).toHaveClass('plan-card-meta');
    expect(within(link).getByRole('img', { name: /শতাংশ পড়া হয়েছে/ })).toBeInTheDocument();
    expect(link).toHaveTextContent(PLAN.description);
  });

  test('every set says আপনি পড়েছেন ০/N at first and has a progress ring', () => {
    show();
    expect(screen.getAllByRole('img', { name: /শতাংশ পড়া হয়েছে/ })).toHaveLength(TOP_PICKS.length);
    expect(card(PLAN)).toHaveTextContent(`আপনি পড়েছেন ০/${bn(PLAN.days.length)}`);
    expect(within(card(PLAN)).getByRole('img', { name: '০ শতাংশ পড়া হয়েছে' })).toBeInTheDocument();
    expect(screen.queryByText(/এখনও শুরু হয়নি/)).not.toBeInTheDocument();
  });

  test('shows the progress saved on this device (the same storage key as before)', () => {
    expect(STORAGE_KEY).toBe('alhashor.plan-progress');
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ [PLAN.id]: [0, 1] }));
    show();
    const link = card(PLAN);
    expect(link).toHaveTextContent(`আপনি পড়েছেন ২/${bn(PLAN.days.length)}`);
    expect(within(link).getByRole('img', { name: `${bn(Math.round((2 / PLAN.days.length) * 100))} শতাংশ পড়া হয়েছে` })).toBeInTheDocument();
  });

  test('never says শীঘ্রই আসছে: a set with no hadis is simply not listed', () => {
    show();
    expect(screen.queryByText(/শীঘ্রই আসছে/)).not.toBeInTheDocument();
    expect(TOP_PICKS.every((set) => set.days.length > 0)).toBe(true);
  });
});

describe('the set page', () => {
  test('says when the set in the address is not one of ours', () => {
    setUrl('/top-picks/nope');
    show();
    expect(screen.getByText('এই সেটটি পাওয়া যায়নি। অন্য একটি বেছে নিন।')).toBeInTheDocument();
  });

  test('its title is the heading and the document title', () => {
    setUrl(planAddress(PLAN));
    show();
    expect(document.title).toBe(`${PLAN.title} - টপ লিস্ট/হাদীস - Alhashor`);
  });

  test('a note is shown as a small muted line under its hadis', () => {
    const noted = { id: 'n', title: 'টীকা', description: '', days: [{ ...PLAN.days[0], note: 'একটি ছোট টীকা' }, PLAN.days[1]] };
    setUrl('/top-picks/n');
    render(wrap(<TopPicksSetPage id="n" sets={[noted]} />));
    const items = within(screen.getByRole('list', { name: 'দিনের তালিকা' })).getAllByRole('listitem');
    expect(within(items[0]).getByText('একটি ছোট টীকা')).toHaveClass('plan-day-extra');
    expect(within(items[1]).queryByText('একটি ছোট টীকা')).not.toBeInTheDocument();
  });
});

describe('a set as a checklist', () => {
  beforeEach(() => setUrl(planAddress(PLAN)));

  test('has the title, the description and a way back to all sets', () => {
    show();
    expect(screen.getByRole('heading', { level: 1, name: PLAN.title })).toBeInTheDocument();
    expect(screen.getByText(PLAN.description)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /সব সেট/ })).toHaveAttribute('href', '/top-picks');
  });

  test('has a real checkbox for every day, named by the day and its citation', () => {
    show();
    expect(checkboxes()).toHaveLength(PLAN.days.length);
    PLAN.days.forEach((day, index) => {
      expect(checkboxes()[index]).toHaveAccessibleName(`${bn(index + 1)} ${cite(day)}`);
      expect(checkboxes()[index]).not.toBeChecked();
    });
  });

  test('shows the first lines of each hadis once loaded, and a link to the full one', async () => {
    show();
    const first = PLAN.days[0];
    const { body } = splitHadis(realText(first.book, first.number));
    const items = within(screen.getByRole('list', { name: 'দিনের তালিকা' })).getAllByRole('listitem');
    expect(items).toHaveLength(PLAN.days.length);
    await within(items[0]).findByText(body.replace(/\s+/g, ' '));
    expect(within(items[0]).getByRole('link', { name: 'পুরো হাদীস' })).toHaveAttribute('href', `/hadis/${first.book}/${first.number}`);
  });

  test('checking a day ticks it, counts it in a live message, and saves it on the device', async () => {
    show();
    const live = screen.getByRole('status', { name: 'অগ্রগতি' });
    expect(live).toHaveTextContent(`আপনি পড়েছেন ০/${bn(PLAN.days.length)}`);
    fireEvent.click(checkboxes()[1]);
    expect(checkboxes()[1]).toBeChecked();
    expect(live).toHaveTextContent(`আপনি পড়েছেন ১/${bn(PLAN.days.length)}`);
    expect(saved()).toEqual({ [PLAN.id]: [1] });
    expect(screen.getByRole('progressbar', { name: `${PLAN.title}: অগ্রগতি` })).toHaveAttribute('aria-valuenow', String(Math.round(100 / PLAN.days.length)));
    fireEvent.click(checkboxes()[1]);
    expect(checkboxes()[1]).not.toBeChecked();
    expect(saved()).toEqual({});
  });

  test('a saved tick is there again when the page is opened later', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ [PLAN.id]: [0, 2] }));
    show();
    expect(checkboxes()[0]).toBeChecked();
    expect(checkboxes()[1]).not.toBeChecked();
    expect(checkboxes()[2]).toBeChecked();
  });

  test('a day has no khutbah list button', () => {
    show();
    const item = within(screen.getByRole('list', { name: 'দিনের তালিকা' })).getAllByRole('listitem')[0];
    expect(within(item).queryByRole('button', { name: /খুতবার তালিকা/ })).not.toBeInTheDocument();
  });

  test('a hadis that has no file says so, without breaking the list', async () => {
    global.fetch = vi.fn(() => Promise.resolve({ ok: false }));
    show();
    expect(await screen.findAllByText('এই হাদীসটি পাওয়া যায়নি।')).toHaveLength(PLAN.days.length);
    expect(checkboxes()).toHaveLength(PLAN.days.length);
  });
});

describe('starting again', () => {
  beforeEach(() => setUrl(planAddress(PLAN)));

  test('there is nothing to clear until a day is ticked', () => {
    show();
    expect(screen.queryByRole('button', { name: 'মুছে ফেলুন' })).not.toBeInTheDocument();
  });

  test('asks first, and "no" keeps the progress', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ [PLAN.id]: [0, 1] }));
    show();
    fireEvent.click(screen.getByRole('button', { name: 'মুছে ফেলুন' }));
    expect(screen.getByText('এই পরিকল্পনার অগ্রগতি মুছে ফেলবেন? এটি ফেরানো যাবে না।')).toBeInTheDocument();
    expect(checkboxes()[0]).toBeChecked();
    fireEvent.click(screen.getByRole('button', { name: 'না, থাক' }));
    expect(screen.queryByText(/মুছে ফেলবেন/)).not.toBeInTheDocument();
    expect(checkboxes()[0]).toBeChecked();
    expect(saved()).toEqual({ [PLAN.id]: [0, 1] });
  });

  test('"yes" clears this plan only', () => {
    const other = PLANS.find((plan) => plan.id !== PLAN.id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ [PLAN.id]: [0, 1], [other.id]: [3] }));
    show();
    fireEvent.click(screen.getByRole('button', { name: 'মুছে ফেলুন' }));
    fireEvent.click(screen.getByRole('button', { name: 'হ্যাঁ, মুছে ফেলুন' }));
    expect(checkboxes()[0]).not.toBeChecked();
    expect(checkboxes()[1]).not.toBeChecked();
    expect(saved()).toEqual({ [other.id]: [3] });
    expect(screen.queryByRole('button', { name: 'মুছে ফেলুন' })).not.toBeInTheDocument();
  });
});

describe('when the device blocks storage', () => {
  let original;
  beforeEach(() => {
    original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw new DOMException('blocked', 'SecurityError'); } });
    setUrl(planAddress(PLAN));
  });
  afterEach(() => Object.defineProperty(globalThis, 'localStorage', original));

  test('the page still works for this visit', () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    show();
    fireEvent.click(checkboxes()[0]);
    expect(checkboxes()[0]).toBeChecked();
    expect(screen.getByRole('status', { name: 'অগ্রগতি' })).toHaveTextContent(`আপনি পড়েছেন ১/${bn(PLAN.days.length)}`);
    fireEvent.click(screen.getByRole('button', { name: 'মুছে ফেলুন' }));
    fireEvent.click(screen.getByRole('button', { name: 'হ্যাঁ, মুছে ফেলুন' }));
    expect(checkboxes()[0]).not.toBeChecked();
    expect(errors).not.toHaveBeenCalled();
  });

  test('storage that fails on every read and write is tolerated too', () => {
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('full'); }, removeItem() { throw new Error('blocked'); } },
    });
    show();
    fireEvent.click(checkboxes()[2]);
    expect(checkboxes()[2]).toBeChecked();
  });
});
