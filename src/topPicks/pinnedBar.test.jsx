import { readFileSync } from 'node:fs';
import path from 'node:path';
import { render, screen, within } from '@testing-library/react';
import { PLANS } from '../data/readingPlans';
import { SettingsProvider } from '../settings/SettingsProvider';
import { ToastProvider } from '../ui/Toast';
import PlanDetail from './PlanDetail';

// jsdom has no layout, so the contract is pinned from the CSS (and measured in headless Chrome):
// the bar is the last child of the plan, sticky at the bottom of the viewport (above the phone tab
// bar), and none of its ancestors up to the page can clip or re-scope it.
const read = (name) => readFileSync(path.resolve(process.cwd(), 'src/styles', name), 'utf8');
const daily = read('daily.css');
const ui = read('ui.css');
const base = read('base.css');
const escape = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const rule = (css, selector) => css.match(new RegExp(`(?:^|\\n)${escape(selector)}\\{([^}]*)\\}`))?.[1] ?? '';

test('the bar is sticky at the bottom, above the tab bar, over the content', () => {
  const bar = rule(daily, '.plan-pinned');
  expect(daily).toMatch(/\.plan-detail\{display:flex;flex-direction:column/);
  expect(bar).toMatch(/position:sticky/);
  expect(bar).toMatch(/bottom:calc\(var\(--tabbar-h\) \+ \d+px\)/);
  expect(bar).toMatch(/z-index:\d+/);
  expect(Number(/z-index:(\d+)/.exec(bar)[1])).toBeLessThan(45); // under the tab bar and the back-to-top button
  expect(daily).toMatch(/@media \(max-width: 640px\)\{[^@]*\.plan-pinned\{margin-right:56px\}/); // clear of the back-to-top button
});

test('no ancestor of the bar clips it or makes a new scroll or transform scope', () => {
  for (const [css, selector] of [
    [daily, '.plan-detail'],
    [daily, '.daily'],
    [daily, '.top-picks'],
    [ui, '.screen'],
    [ui, 'body>main'],
  ]) {
    expect(rule(css, selector), selector).not.toMatch(/overflow(-x|-y)?:\s*(hidden|auto|scroll|clip)|transform:|contain:|filter:/);
  }
  const page = `${/html\s*\{[^}]*\}/.exec(base)?.[0] ?? ''}${/\nbody\s*\{[^}]*\}/.exec(base)?.[0] ?? ''}${rule(ui, 'body')}`;
  expect(page).toContain('body');
  expect(page).not.toMatch(/overflow(-x|-y)?:\s*(hidden|auto|scroll|clip)/);
});

test('the bar is the last child of the plan, after the list, with the one progress bar of the page', () => {
  const plan = { ...PLANS[2] };
  render(
    <SettingsProvider>
      <ToastProvider>
        <PlanDetail plan={plan} progress={{ [plan.id]: [0, 1] }} onToggle={() => {}} onReset={() => {}} />
      </ToastProvider>
    </SettingsProvider>
  );
  const bars = screen.getAllByRole('progressbar');
  expect(bars).toHaveLength(1);
  expect(bars[0]).toHaveAttribute('aria-valuenow', String(Math.round((2 / plan.days.length) * 100)));
  const section = screen.getByRole('region', { name: plan.title });
  expect(within(section).getByRole('progressbar')).toBe(bars[0]);
  const list = within(section).getByRole('list', { name: 'দিনের তালিকা' });
  expect(list.compareDocumentPosition(bars[0]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});
