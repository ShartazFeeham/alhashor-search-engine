import { countByBook, filterByBook } from './searchResults';

const tags = ['BUK-1', 'BUK-2', 'MUS-5', 'TIR-7', 'BUK-9', 'NAS-3'];

test('counts per book always list all six books', () => {
  expect(countByBook(tags)).toEqual({ bukhari: 3, muslim: 1, tirmidhi: 1, abudawud: 0, ibnmajah: 0, nasai: 1 });
  expect(countByBook([])).toEqual({ bukhari: 0, muslim: 0, tirmidhi: 0, abudawud: 0, ibnmajah: 0, nasai: 0 });
});

test('unknown tags are ignored in the counts', () => {
  expect(countByBook(['XXX-1', 'BUK-1']).bukhari).toBe(1);
});

test('filtering keeps the order and "all" keeps everything', () => {
  expect(filterByBook(tags, 'bukhari')).toEqual(['BUK-1', 'BUK-2', 'BUK-9']);
  expect(filterByBook(tags, 'all')).toEqual(tags);
  expect(filterByBook(tags, 'abudawud')).toEqual([]);
});
