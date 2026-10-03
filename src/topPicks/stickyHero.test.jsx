import { readFileSync } from 'node:fs';
import path from 'node:path';
import { act, render, screen } from '@testing-library/react';
import { PLANS } from '../data/readingPlans';
import { STORAGE_KEY } from '../lib/planProgress';
import { SettingsProvider } from '../settings/SettingsProvider';
import { diskFetch } from '../test/hadisFixtures';
import { setUrl } from '../test/nextNavigation';
import { ToastProvider } from '../ui/Toast';
import TopPicksSetPage from './TopPicksSetPage';

/* eslint-disable testing-library/no-node-access */
const SET = PLANS.find((plan) => plan.days.length <= 10) ?? PLANS[PLANS.length - 1];
const read = (file) => readFileSync(path.resolve(process.cwd(), file), 'utf8');
const css = read('src/styles/daily.css');
const ui = read('src/styles/ui.css');
const escape = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const rule = (selector) => css.match(new RegExp(`(?:^|\\n)${escape(selector)}\\{([^}]*)\\}`))?.[1] ?? '';

let observers;
class FakeObserver {
  constructor(callback, options) {
    this.callback = callback;
    this.options = options;
    this.targets = new Set();
    observers.push(this);
  }
  observe(target) { this.targets.add(target); }
  unobserve(target) { this.targets.delete(target); }
  disconnect() { this.targets.clear(); }
}
// The sentinel enters (true) or leaves (false) the part of the screen under the top bar.
const sentinelIs = (isIntersecting) => act(() => {
  observers.filter((o) => o.targets.size).forEach((o) => o.callback([{ target: [...o.targets][0], isIntersecting }]));
});

const show = () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ [SET.id]: [0] }));
  setUrl(`/top-picks/${SET.id}`);
  return render(<SettingsProvider><ToastProvider><TopPicksSetPage id={SET.id} /></ToastProvider></SettingsProvider>);
};

beforeEach(() => {
  observers = [];
  window.IntersectionObserver = FakeObserver;
  global.fetch = vi.fn(diskFetch);
  localStorage.clear();
});
afterEach(async () => {
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
  delete window.IntersectionObserver;
  delete global.fetch;
});

describe('the hero is pinned below the top bar', () => {
  test('it is sticky at the top bar height, above the list, below the bar and the dialogs', () => {
    const head = rule('.plan-detail-head');
    expect(head).toMatch(/position:sticky/);
    expect(head).toMatch(/top:var\(--nav-h\)/);
    expect(ui).toMatch(/--nav-h:57px/);
    expect(ui).toMatch(/\.shell-nav\{position:sticky;top:0;z-index:40/);
    const z = Number(/z-index:(\d+)/.exec(head)[1]);
    expect(z).toBeGreaterThan(20);
    expect(z).toBeLessThan(40);
    expect(head).toMatch(/background:var\(--surface\)/);
  });

  test('a stuck hero keeps an opaque background with a soft shadow, and the pinned progress bar is untouched', () => {
    const stuck = rule('.plan-detail-head.is-stuck');
    expect(stuck).toMatch(/box-shadow:/);
    expect(stuck).not.toMatch(/background/);
    expect(rule('.plan-pinned')).toMatch(/position:sticky;bottom:calc\(var\(--tabbar-h\) \+ 10px\)/);
  });

  test('a stuck hero has a 64px tree column', () => {
    expect(rule('.plan-detail-head.is-stuck')).toMatch(/grid-template-columns:minmax\(0,1fr\) 64px/);
  });
});

describe('the compact state follows the sentinel', () => {
  test('watches a 1px sentinel just above the hero, shifted by the top bar height', () => {
    show();
    const watcher = observers.find((o) => o.targets.size);
    const target = [...watcher.targets][0];
    expect(target).toHaveClass('plan-sentinel');
    expect(target.nextElementSibling).toHaveClass('plan-detail-head');
    expect(watcher.options.rootMargin).toBe('-57px 0px 0px 0px');
    expect(rule('.plan-sentinel')).toMatch(/height:1px/);
  });

  test('at the top the hero is full: description and privacy note shown', () => {
    show();
    sentinelIs(true);
    const head = screen.getByTestId('progress-tree').closest('.plan-detail-head');
    expect(head).toHaveAttribute('data-stuck', 'false');
    expect(head).not.toHaveClass('is-stuck');
    if (SET.description) expect(screen.getByText(SET.description)).toBeInTheDocument();
    expect(screen.getByText(/অগ্রগতি শুধু এই ডিভাইসেই থাকে/)).toBeInTheDocument();
  });

  test('once stuck the description and the note go; title, count, bar, tree and clear stay', () => {
    show();
    sentinelIs(false);
    const head = screen.getByTestId('progress-tree').closest('.plan-detail-head');
    expect(head).toHaveClass('is-stuck');
    expect(head).toHaveAttribute('data-stuck', 'true');
    if (SET.description) expect(screen.queryByText(SET.description)).not.toBeInTheDocument();
    expect(screen.queryByText(/অগ্রগতি শুধু এই ডিভাইসেই থাকে/)).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: SET.title })).toBeInTheDocument();
    expect(screen.getByRole('status', { name: 'অগ্রগতি' })).toHaveTextContent(/আপনি পড়েছেন/);
    expect(screen.getByTestId('hero-progress')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'মুছে ফেলুন' })).toBeInTheDocument();
    expect(screen.getByTestId('progress-tree')).toBeInTheDocument();
  });

  test('it expands again when scrolled back to the top', () => {
    show();
    sentinelIs(false);
    sentinelIs(true);
    const head = screen.getByTestId('progress-tree').closest('.plan-detail-head');
    expect(head).not.toHaveClass('is-stuck');
    expect(screen.getByText(/অগ্রগতি শুধু এই ডিভাইসেই থাকে/)).toBeInTheDocument();
    expect(head.style.marginBottom).toBe('');
  });
});
