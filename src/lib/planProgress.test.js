import {
  STORAGE_KEY, doneCount, isDone, loadProgress, nextDay, percentDone, resetPlan, saveProgress, toggleDay,
} from './planProgress';

const blocked = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } };

describe('toggling days', () => {
  test('marks a day done and then not done, without touching the old object', () => {
    const empty = {};
    const one = toggleDay(empty, 'ramadan', 2);
    expect(empty).toEqual({});
    expect(isDone(one, 'ramadan', 2)).toBe(true);
    expect(isDone(one, 'ramadan', 3)).toBe(false);
    const none = toggleDay(one, 'ramadan', 2);
    expect(isDone(none, 'ramadan', 2)).toBe(false);
    expect(none.ramadan).toBeUndefined();
  });

  test('keeps the days in order and each plan apart', () => {
    let progress = toggleDay({}, 'a', 5);
    progress = toggleDay(progress, 'a', 1);
    progress = toggleDay(progress, 'b', 0);
    expect(progress).toEqual({ a: [1, 5], b: [0] });
  });

  test('ignores a day that cannot exist', () => {
    expect(toggleDay({}, 'a', -1)).toEqual({});
    expect(toggleDay({}, 'a', 1.5)).toEqual({});
    expect(toggleDay({}, 'a', NaN)).toEqual({});
  });
});

describe('counting', () => {
  const progress = { a: [0, 1, 2, 9, 40] };

  test('counts only days that are in the plan (a plan may be shortened later)', () => {
    expect(doneCount(progress, 'a', 10)).toBe(4);
    expect(doneCount(progress, 'a', 3)).toBe(3);
    expect(doneCount(progress, 'missing', 10)).toBe(0);
  });

  test('gives a whole-number percentage', () => {
    expect(percentDone(progress, 'a', 10)).toBe(40);
    expect(percentDone({ a: [0] }, 'a', 3)).toBe(33);
    expect(percentDone({}, 'a', 30)).toBe(0);
    expect(percentDone({ a: [0] }, 'a', 0)).toBe(0);
    expect(percentDone({ a: [0, 1] }, 'a', 2)).toBe(100);
  });

  test('finds the first day not yet done, or none when finished', () => {
    expect(nextDay({ a: [0, 1, 3] }, 'a', 5)).toBe(2);
    expect(nextDay({}, 'a', 5)).toBe(0);
    expect(nextDay({ a: [0, 1] }, 'a', 2)).toBeNull();
  });
});

describe('resetting', () => {
  test('clears one plan and leaves the others', () => {
    const progress = { a: [0, 1], b: [2] };
    expect(resetPlan(progress, 'a')).toEqual({ b: [2] });
    expect(progress).toEqual({ a: [0, 1], b: [2] });
    expect(resetPlan(progress, 'nope')).toEqual(progress);
  });
});

describe('saving and loading', () => {
  test('round-trips through storage under its own key', () => {
    saveProgress({ a: [0, 4] });
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY))).toEqual({ a: [0, 4] });
    expect(STORAGE_KEY).not.toBe('boikotha.settings');
    expect(loadProgress()).toEqual({ a: [0, 4] });
  });

  test('is empty when nothing was saved', () => {
    expect(loadProgress()).toEqual({});
  });

  test.each([
    ['not JSON', 'oops{'],
    ['an array', '[1,2]'],
    ['null', 'null'],
    ['a number', '4'],
  ])('is empty when the saved value is %s', (_, raw) => {
    localStorage.setItem(STORAGE_KEY, raw);
    expect(loadProgress()).toEqual({});
  });

  test('cleans a saved value: only whole non-negative days, sorted, no repeats, no empty plans', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ a: [3, 1, 1, -2, 'x', 2.5, 7], b: 'bad', c: [], d: null }));
    expect(loadProgress()).toEqual({ a: [1, 3, 7] });
  });

  test('storage that throws when read or written does not break anything', () => {
    expect(loadProgress(blocked)).toEqual({});
    expect(() => saveProgress({ a: [0] }, blocked)).not.toThrow();
  });

  test('storage that throws the moment it is looked up (site data blocked) is tolerated', () => {
    const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw new DOMException('blocked', 'SecurityError'); } });
    try {
      expect(loadProgress()).toEqual({});
      expect(() => saveProgress({ a: [0] })).not.toThrow();
    } finally {
      Object.defineProperty(globalThis, 'localStorage', original);
    }
  });

  test('a full storage (quota error on write) is tolerated', () => {
    const full = { getItem: () => null, setItem() { throw new DOMException('full', 'QuotaExceededError'); } };
    expect(() => saveProgress({ a: [0] }, full)).not.toThrow();
  });
});
