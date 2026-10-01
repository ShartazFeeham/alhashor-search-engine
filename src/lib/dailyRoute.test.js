import { dailyHref, planOf, tabOf } from './dailyRoute';

const item = (bookId, number) => ({ bookId, number });

describe('tabOf', () => {
  test('reads the tab, and falls back to today', () => {
    expect(tabOf(new URLSearchParams('tab=plans'))).toBe('plans');
    expect(tabOf(new URLSearchParams('tab=khutbah'))).toBe('khutbah');
    expect(tabOf(new URLSearchParams('tab=today'))).toBe('today');
    expect(tabOf(new URLSearchParams(''))).toBe('today');
    expect(tabOf(new URLSearchParams('tab=nonsense'))).toBe('today');
  });
});

describe('planOf', () => {
  const plans = [{ id: 'ramadan' }, { id: 'jumuah' }];
  test('finds the plan named in the address, or none', () => {
    expect(planOf(new URLSearchParams('plan=jumuah'), plans)).toBe(plans[1]);
    expect(planOf(new URLSearchParams('plan=nope'), plans)).toBeNull();
    expect(planOf(new URLSearchParams(''), plans)).toBeNull();
  });
});

describe('dailyHref', () => {
  test('today is the plain address', () => {
    expect(dailyHref({})).toBe('/daily');
    expect(dailyHref({ tab: 'today' })).toBe('/daily');
  });

  test('the other tabs name themselves', () => {
    expect(dailyHref({ tab: 'plans' })).toBe('/daily?tab=plans');
    expect(dailyHref({ tab: 'khutbah' })).toBe('/daily?tab=khutbah');
  });

  test('a plan is only part of the plans tab', () => {
    expect(dailyHref({ tab: 'plans', plan: 'ramadan' })).toBe('/daily?tab=plans&plan=ramadan');
    expect(dailyHref({ tab: 'khutbah', plan: 'ramadan' })).toBe('/daily?tab=khutbah');
  });

  test('the khutbah list rides along on every tab, with its commas readable', () => {
    const items = [item('bukhari', 1234), item('muslim', 5)];
    expect(dailyHref({ tab: 'khutbah', items })).toBe('/daily?tab=khutbah&ids=bukhari-1234,muslim-5');
    expect(dailyHref({ tab: 'today', items })).toBe('/daily?ids=bukhari-1234,muslim-5');
    expect(dailyHref({ tab: 'plans', plan: 'ramadan', items })).toBe('/daily?tab=plans&plan=ramadan&ids=bukhari-1234,muslim-5');
    expect(dailyHref({ tab: 'khutbah', items: [] })).toBe('/daily?tab=khutbah');
  });
});
