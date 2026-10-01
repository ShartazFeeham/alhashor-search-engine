import { MAX_ITEMS, addItem, idOf, moveItem, parseIds, removeAt, serializeIds } from './khutbahList';

const item = (bookId, number) => ({ bookId, number });

describe('parseIds', () => {
  test('reads a list from the address', () => {
    expect(parseIds('bukhari-1234,muslim-5')).toEqual([item('bukhari', 1234), item('muslim', 5)]);
  });

  test('keeps the order it is given', () => {
    expect(parseIds('nasai-10,bukhari-1,tirmidhi-3').map(idOf)).toEqual(['nasai-10', 'bukhari-1', 'tirmidhi-3']);
  });

  test('is empty for nothing at all', () => {
    expect(parseIds('')).toEqual([]);
    expect(parseIds(null)).toEqual([]);
    expect(parseIds(undefined)).toEqual([]);
  });

  test('drops what is not a hadis: unknown book, bad number, number past the end, number with no file', () => {
    expect(parseIds('nobook-5,bukhari-abc,bukhari-0,bukhari--3,bukhari-9999,bukhari-63,muslim-7,tirmidhi-,-5,,x')).toEqual([item('muslim', 7)]);
  });

  test('drops padded or fancy numbers so every id has one spelling', () => {
    expect(parseIds('bukhari-007,bukhari-1.5,bukhari-1e2,BUKHARI-5')).toEqual([]);
  });

  test('drops repeats, keeping the first', () => {
    expect(parseIds('muslim-5,bukhari-1,muslim-5').map(idOf)).toEqual(['muslim-5', 'bukhari-1']);
  });

  test('ignores spaces around ids', () => {
    expect(parseIds(' muslim-5 , bukhari-1 ').map(idOf)).toEqual(['muslim-5', 'bukhari-1']);
  });

  test('keeps at most 30', () => {
    const many = Array.from({ length: 50 }, (_, i) => `muslim-${i + 1}`).join(',');
    const items = parseIds(many);
    expect(MAX_ITEMS).toBe(30);
    expect(items).toHaveLength(30);
    expect(items[29].number).toBe(30);
  });

  test('counts only valid ids toward the limit', () => {
    const text = Array.from({ length: 35 }, (_, i) => `bad-${i},muslim-${i + 1}`).join(',');
    expect(parseIds(text)).toHaveLength(30);
  });
});

describe('serializeIds', () => {
  test('writes the list for the address, and round-trips', () => {
    const items = [item('bukhari', 1234), item('muslim', 5)];
    expect(serializeIds(items)).toBe('bukhari-1234,muslim-5');
    expect(parseIds(serializeIds(items))).toEqual(items);
    expect(serializeIds([])).toBe('');
  });
});

describe('addItem', () => {
  test('adds at the end', () => {
    const result = addItem([item('muslim', 5)], item('bukhari', 1));
    expect(result.status).toBe('added');
    expect(result.items.map(idOf)).toEqual(['muslim-5', 'bukhari-1']);
  });

  test('does not add a repeat', () => {
    const before = [item('muslim', 5)];
    const result = addItem(before, item('muslim', 5));
    expect(result.status).toBe('duplicate');
    expect(result.items).toBe(before);
  });

  test('does not add past the limit', () => {
    const full = Array.from({ length: 30 }, (_, i) => item('muslim', i + 1));
    const result = addItem(full, item('bukhari', 1));
    expect(result.status).toBe('full');
    expect(result.items).toHaveLength(30);
  });

  test('does not add something that is not a hadis', () => {
    expect(addItem([], item('bukhari', 63)).status).toBe('invalid');
    expect(addItem([], item('nobook', 1)).status).toBe('invalid');
    expect(addItem([], item('muslim', 99999)).status).toBe('invalid');
  });
});

describe('removeAt and moveItem', () => {
  const items = [item('muslim', 1), item('muslim', 2), item('muslim', 3)];

  test('removes by position', () => {
    expect(removeAt(items, 1).map(idOf)).toEqual(['muslim-1', 'muslim-3']);
    expect(items).toHaveLength(3);
    expect(removeAt(items, 7)).toEqual(items);
  });

  test('moves one place up or down', () => {
    expect(moveItem(items, 1, -1).map(idOf)).toEqual(['muslim-2', 'muslim-1', 'muslim-3']);
    expect(moveItem(items, 1, 1).map(idOf)).toEqual(['muslim-1', 'muslim-3', 'muslim-2']);
    expect(items.map(idOf)).toEqual(['muslim-1', 'muslim-2', 'muslim-3']);
  });

  test('does nothing at the ends or for a bad position', () => {
    expect(moveItem(items, 0, -1)).toEqual(items);
    expect(moveItem(items, 2, 1)).toEqual(items);
    expect(moveItem(items, 9, -1)).toEqual(items);
  });
});
