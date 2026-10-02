import { dailyHref, planOf, tabOf } from './dailyRoute';

describe('tabOf', () => {
  test('reads the tab, and falls back to today', () => {
    expect(tabOf(new URLSearchParams('tab=plans'))).toBe('plans');
    expect(tabOf(new URLSearchParams('tab=khutbah'))).toBe('today');
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
  });

  test('a plan is only part of the plans tab', () => {
    expect(dailyHref({ tab: 'plans', plan: 'ramadan' })).toBe('/daily?tab=plans&plan=ramadan');
  });

  test('a list in the address is not carried along', () => {
    expect(dailyHref({ tab: 'plans', plan: 'ramadan', items: [{ bookId: 'bukhari', number: 1 }] })).toBe('/daily?tab=plans&plan=ramadan');
  });
});
