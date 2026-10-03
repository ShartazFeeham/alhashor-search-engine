import { readFileSync } from 'node:fs';
import path from 'node:path';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { PLANS } from '../data/readingPlans';
import { formatNumber } from '../lib/digits';
import { STORAGE_KEY } from '../lib/planProgress';
import { SettingsProvider } from '../settings/SettingsProvider';
import { diskFetch } from '../test/hadisFixtures';
import { setUrl } from '../test/nextNavigation';
import { ToastProvider } from '../ui/Toast';
import TopPicksSetPage from './TopPicksSetPage';

/* eslint-disable testing-library/no-node-access */
const bn = (n) => formatNumber(n, 'bn');
const SET = PLANS.find((plan) => plan.days.length <= 10) ?? PLANS[PLANS.length - 1];
const css = readFileSync(path.resolve(process.cwd(), 'src/styles/daily.css'), 'utf8');
const escape = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const rule = (selector) => css.match(new RegExp(`(?:^|\\n)${escape(selector)}\\{([^}]*)\\}`))?.[1] ?? '';

const show = (done = []) => {
  if (done.length) localStorage.setItem(STORAGE_KEY, JSON.stringify({ [SET.id]: done }));
  setUrl(`/top-picks/${SET.id}`);
  return render(<SettingsProvider><ToastProvider><TopPicksSetPage id={SET.id} /></ToastProvider></SettingsProvider>);
};
const items = () => within(screen.getByRole('list', { name: 'দিনের তালিকা' })).getAllByRole('listitem');

beforeEach(() => {
  global.fetch = vi.fn(diskFetch);
  localStorage.clear();
});
afterEach(async () => {
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
  delete global.fetch;
});

describe('the day markers', () => {
  test('show only the number, no "দিন" word', () => {
    show();
    items().forEach((item, index) => {
      expect(within(item).getByTestId('plan-day-no')).toHaveTextContent(new RegExp(`^${bn(index + 1)}$`));
      expect(item).not.toHaveTextContent(/দিন/);
    });
  });

  test('are solid boxes with a 7px radius and the number knocked out in the card colour', () => {
    const box = rule('.plan-day-no');
    expect(box).toMatch(/background:var\(--accent2\)/);
    expect(box).toMatch(/border-radius:7px/);
    expect(box).toMatch(/color:var\(--surface\)/);
  });
});

describe('the hadis list items', () => {
  test('the full-hadis link is inside the text block, after the text, one link per hadis', async () => {
    show();
    const first = items()[0];
    const text = await within(first).findByText((_, el) => el?.classList.contains('plan-day-flow') && el.textContent.length > 20);
    const link = within(first).getByRole('link', { name: 'পুরো হাদীস' });
    expect(first.querySelector('.plan-day-body')).toContainElement(link);
    expect(first.querySelector('.plan-day-body')).toContainElement(text);
    expect(link.compareDocumentPosition(text) & Node.DOCUMENT_POSITION_PRECEDING).toBeTruthy();
    expect(within(first).getAllByRole('link', { name: 'পুরো হাদীস' })).toHaveLength(1);
    expect(first.querySelector('.plan-day-links')).toBeNull();
  });

  test('the text is clamped to 3 lines and justified, the last line left, no hyphens', () => {
    const text = rule('.plan-day-text');
    expect(text).toMatch(/-webkit-line-clamp:3/);
    expect(text).toMatch(/text-align:justify/);
    expect(text).toMatch(/text-justify:inter-word/);
    expect(text).toMatch(/hyphens:none/);
    expect(text).toMatch(/text-align-last:left/);
  });

  test('two floats keep the right end of line 3 free, and the link sits over it at the bottom right', () => {
    expect(rule('.plan-day-lead')).toMatch(/float:right/);
    expect(rule('.plan-day-slot')).toMatch(/clear:right/);
    expect(rule('.plan-day-slot')).toMatch(/width:96px/);
    expect(rule('.plan-day-more')).toMatch(/justify-self:end;align-self:end;width:96px/);
    expect(rule('.plan-day-body>*')).toMatch(/grid-area:1\/1/);
  });
});

describe('the hero header', () => {
  test('has no "মুছে ফেলুন" text, but an icon button with that name and tooltip once something is read', () => {
    show([0, 1]);
    const button = screen.getByRole('button', { name: 'মুছে ফেলুন' });
    expect(button).toHaveAttribute('title', 'মুছে ফেলুন');
    expect(button).toHaveTextContent('');
    expect(button.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });

  test('the icon asks first, with the same confirmation as before', () => {
    show([0, 1]);
    fireEvent.click(screen.getByRole('button', { name: 'মুছে ফেলুন' }));
    expect(screen.getByText('এই পরিকল্পনার অগ্রগতি মুছে ফেলবেন? এটি ফেরানো যাবে না।')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'হ্যাঁ, মুছে ফেলুন' }));
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY))).toEqual({});
  });

  test('says "আপনি পড়েছেন N/M" with a bar that follows the ring colours', () => {
    const total = SET.days.length;
    show([0]);
    expect(screen.getByRole('status', { name: 'অগ্রগতি' })).toHaveTextContent(`আপনি পড়েছেন ${bn(1)}/${bn(total)}`);
    const bar = screen.getByTestId('hero-progress');
    expect(bar).toHaveAttribute('aria-hidden', 'true');
    expect(bar).toHaveAttribute('data-band', Math.round(100 / total) >= 66 ? 'green' : Math.round(100 / total) >= 33 ? 'yellow' : 'red');
    expect(bar.querySelector('i').style.width).toBe(`${Math.round(100 / total)}%`);
  });

  test.each([0, 1, Math.ceil(SET.days.length / 2), SET.days.length - 1])('with %i done the bar band follows the percentage', (count) => {
    show(Array.from({ length: count }, (_, i) => i));
    const percent = Math.round((count / SET.days.length) * 100);
    expect(screen.getByTestId('hero-progress')).toHaveAttribute('data-band', percent >= 66 ? 'green' : percent >= 33 ? 'yellow' : 'red');
  });

  test('at 100% the bar is green with a tick', () => {
    show(SET.days.map((_, i) => i));
    expect(screen.getByTestId('hero-progress')).toHaveAttribute('data-band', 'green');
    expect(screen.getByTestId('hero-tick')).toBeInTheDocument();
  });

  test('has no tick before the end', () => {
    show([0]);
    expect(screen.queryByTestId('hero-tick')).not.toBeInTheDocument();
  });

  test('keeps the one real progressbar (the pinned one)', () => {
    show([0]);
    expect(screen.getAllByRole('progressbar')).toHaveLength(1);
  });

  test('is compact: small gaps and padding', () => {
    const head = rule('.plan-detail-head');
    expect(Number(/gap:(\d+)px/.exec(head)[1])).toBeLessThanOrEqual(6);
    expect(Number(/padding:(\d+)px/.exec(head)[1])).toBeLessThanOrEqual(14);
  });
});
