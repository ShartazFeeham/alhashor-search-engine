import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { PLANS } from '../data/readingPlans';
import { bookById } from '../lib/books';
import { formatNumber } from '../lib/digits';
import { splitHadis } from '../lib/hadisText';
import { STORAGE_KEY } from '../lib/planProgress';
import { SettingsProvider } from '../settings/SettingsProvider';
import { diskFetch, realText } from '../test/hadisFixtures';
import { setUrl } from '../test/nextNavigation';
import { ToastProvider } from '../ui/Toast';
import PlansSection from './PlansSection';

const bn = (n) => formatNumber(n, 'bn');
const PLAN = PLANS.find((plan) => plan.days.length <= 10) ?? PLANS[PLANS.length - 1];
const cite = (day) => `${bookById(day.book).cite}, হাদীস নং ${bn(day.number)}`;
const planAddress = (plan, more = '') => `/daily?tab=plans&plan=${plan.id}${more}`;

const show = () =>
  render(
    <SettingsProvider>
      <ToastProvider>
        <PlansSection />
      </ToastProvider>
    </SettingsProvider>
  );

async function settle() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

const saved = () => JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
const checkboxes = () => screen.getAllByRole('checkbox');

beforeEach(() => {
  global.fetch = vi.fn(diskFetch);
  setUrl('/daily?tab=plans');
});

afterEach(async () => {
  await settle();
  delete global.fetch;
});

describe('the plan list', () => {
  test('shows every plan as a link to its checklist, with its length', async () => {
    show();
    for (const plan of PLANS) {
      const link = screen.getByRole('link', { name: new RegExp(plan.title) });
      expect(link).toHaveAttribute('href', planAddress(plan));
      expect(link).toHaveTextContent(plan.description);
      expect(link).toHaveTextContent(`${bn(plan.days.length)} দিন`);
    }
    expect(screen.getAllByRole('progressbar')).toHaveLength(PLANS.length);
  });

  test('starts every plan at nothing done', () => {
    show();
    const bar = screen.getByRole('progressbar', { name: `${PLAN.title}: অগ্রগতি` });
    expect(bar).toHaveAttribute('aria-valuenow', '0');
    expect(screen.getByRole('link', { name: new RegExp(PLAN.title) })).toHaveTextContent(`০/${bn(PLAN.days.length)} সম্পন্ন`);
  });

  test('shows the progress saved on this device', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ [PLAN.id]: [0, 1] }));
    show();
    const link = screen.getByRole('link', { name: new RegExp(PLAN.title) });
    expect(link).toHaveTextContent(`২/${bn(PLAN.days.length)} সম্পন্ন`);
    expect(within(link).getByRole('progressbar')).toHaveAttribute('aria-valuenow', String(Math.round((2 / PLAN.days.length) * 100)));
  });

  test('the plan links carry no list in the address', () => {
    setUrl('/daily?tab=plans&ids=muslim-5');
    show();
    expect(screen.getByRole('link', { name: new RegExp(PLAN.title) })).toHaveAttribute('href', planAddress(PLAN));
  });

  test('says when the plan in the address is not one of ours, and still shows the list', () => {
    setUrl('/daily?tab=plans&plan=nope');
    show();
    expect(screen.getByText('এই পরিকল্পনাটি পাওয়া যায়নি। অন্য একটি বেছে নিন।')).toBeInTheDocument();
    expect(screen.getAllByRole('progressbar')).toHaveLength(PLANS.length);
  });
});

describe('a plan as a checklist', () => {
  beforeEach(() => setUrl(planAddress(PLAN)));

  test('has the title, the description and a way back to all plans', () => {
    show();
    expect(screen.getByRole('heading', { level: 2, name: PLAN.title })).toBeInTheDocument();
    expect(screen.getByText(PLAN.description)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /সব পরিকল্পনা/ })).toHaveAttribute('href', '/daily?tab=plans');
  });

  test('has a real checkbox for every day, named by the day and its citation', () => {
    show();
    expect(checkboxes()).toHaveLength(PLAN.days.length);
    PLAN.days.forEach((day, index) => {
      expect(checkboxes()[index]).toHaveAccessibleName(`দিন ${bn(index + 1)} ${cite(day)}`);
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
    expect(live).toHaveTextContent(`০/${bn(PLAN.days.length)} দিন সম্পন্ন`);
    fireEvent.click(checkboxes()[1]);
    expect(checkboxes()[1]).toBeChecked();
    expect(live).toHaveTextContent(`১/${bn(PLAN.days.length)} দিন সম্পন্ন`);
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
    expect(screen.getByRole('status', { name: 'অগ্রগতি' })).toHaveTextContent(`১/${bn(PLAN.days.length)} দিন সম্পন্ন`);
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
