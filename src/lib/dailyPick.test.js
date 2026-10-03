import { dayNumber, strideFor } from './dailyPick';

const addDays = (date, days) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + days, 12);

describe('dayNumber', () => {
  test('counts local calendar days, whatever the time of day', () => {
    expect(dayNumber(new Date(2026, 9, 2, 0, 0, 1))).toBe(dayNumber(new Date(2026, 9, 2, 23, 59, 59)));
    expect(dayNumber(new Date(1970, 0, 1))).toBe(0);
    expect(dayNumber(new Date(1970, 0, 2))).toBe(1);
  });

  test('goes up by exactly one every day, across clock changes, leap days and years', () => {
    let previous = dayNumber(new Date(2023, 0, 1, 12));
    for (let i = 1; i <= 1500; i++) {
      const current = dayNumber(addDays(new Date(2023, 0, 1, 12), i));
      expect(current - previous).toBe(1);
      previous = current;
    }
  });
});

describe('strideFor', () => {
  test('is a step that shares no factor with the size, so a walk visits every place once', () => {
    for (const size of [1, 2, 3, 8, 10, 94, 100, 360]) {
      const stride = strideFor(size);
      const visited = new Set(Array.from({ length: size }, (_, turn) => (turn * stride) % size));
      expect(visited.size, `size ${size}`).toBe(size);
    }
  });

  test('lands far from the last place, so neighbouring days are not neighbours in the list', () => {
    for (const size of [10, 94, 100]) {
      const stride = strideFor(size);
      expect(Math.min(stride % size, size - (stride % size))).toBeGreaterThan(size / 5);
    }
  });
});
