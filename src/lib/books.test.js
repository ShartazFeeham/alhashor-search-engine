import { BOOKS, bookByCode, bookById, hadisCount, hasHadis } from './books';

test('the six books in display order', () => {
  expect(BOOKS.map((b) => b.id)).toEqual(['bukhari', 'muslim', 'tirmidhi', 'abudawud', 'ibnmajah', 'nasai']);
  expect(BOOKS.map((b) => b.code)).toEqual(['BUK', 'MUS', 'TIR', 'DAU', 'MAJ', 'NAS']);
  expect(BOOKS.map((b) => b.folder)).toEqual(['Bukhari', 'Muslim', 'Tirmiji', 'Daud', 'Majah', 'Nasae']);
});

test('each book has Bengali names, a citation, a badge and a colour variable', () => {
  const bukhari = bookById('bukhari');
  expect(bukhari.name).toBe('বুখারী');
  expect(bukhari.full).toBe('বুখারী শরীফ');
  expect(bukhari.cite).toBe('সহীহ বুখারী');
  expect(bukhari.colorVar).toBe('--bk-bukhari');
  expect(bukhari.badge.length).toBeGreaterThan(0);
});

test('lookups by id and by code, and unknowns give undefined', () => {
  expect(bookByCode('MUS').id).toBe('muslim');
  expect(bookById('nope')).toBeUndefined();
  expect(bookByCode('XXX')).toBeUndefined();
});

test('the counts match the files on disk', () => {
  expect(hadisCount(bookById('bukhari'))).toBe(6719);
  expect(hadisCount(bookById('muslim'))).toBe(7281);
  expect(hadisCount(bookById('tirmidhi'))).toBe(3608);
  expect(hadisCount(bookById('abudawud'))).toBe(5184);
  expect(hadisCount(bookById('ibnmajah'))).toBe(4341);
  expect(hadisCount(bookById('nasai'))).toBe(5753);
  expect(BOOKS.reduce((sum, b) => sum + hadisCount(b), 0)).toBe(32886);
});

test('hasHadis knows the gaps (Bukhari 63 has no file, 62 and 64 do)', () => {
  const bukhari = bookById('bukhari');
  expect(hasHadis(bukhari, 62)).toBe(true);
  expect(hasHadis(bukhari, 63)).toBe(false);
  expect(hasHadis(bukhari, 64)).toBe(true);
  expect(hasHadis(bukhari, 0)).toBe(false);
  expect(hasHadis(bukhari, 7054)).toBe(false);
});
