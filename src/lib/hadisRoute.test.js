import { bookById } from './books';
import { hadisHref, neighbours, parseHadisParams, parseTag, tagOf } from './hadisRoute';

test('tags and addresses', () => {
  expect(tagOf('bukhari', 124)).toBe('BUK-124');
  expect(hadisHref('bukhari', 124)).toBe('/hadis/bukhari/124');
  expect(parseTag('BUK-124')).toEqual({ book: bookById('bukhari'), number: 124 });
  expect(parseTag('XXX-1')).toBeNull();
  expect(parseTag('nonsense')).toBeNull();
});

test('parseHadisParams accepts real addresses', () => {
  expect(parseHadisParams('bukhari', '6628')).toEqual({ book: bookById('bukhari'), number: 6628 });
  expect(parseHadisParams('tirmidhi', '3608').number).toBe(3608);
});

test.each([
  ['nobook', '1'],
  ['bukhari', '0'],
  ['bukhari', '-5'],
  ['bukhari', '7054'],
  ['bukhari', '99999'],
  ['bukhari', 'abc'],
  ['bukhari', '12.5'],
  ['bukhari', '1e3'],
  ['bukhari', ''],
])('parseHadisParams rejects %s / %s (Review Focus 1)', (book, number) => {
  expect(parseHadisParams(book, number)).toBeNull();
});

test('a number inside the range but without a file is still a valid address (Review Focus 2)', () => {
  expect(parseHadisParams('bukhari', '63')).toEqual({ book: bookById('bukhari'), number: 63 });
});

test('neighbours skip the gaps in a book', () => {
  const bukhari = bookById('bukhari');
  expect(neighbours(bukhari, 64)).toEqual({ prev: 62, next: 65 });
  expect(neighbours(bukhari, 62)).toEqual({ prev: 61, next: 64 });
  expect(neighbours(bukhari, 63)).toEqual({ prev: 62, next: 64 });
});

test('the first and last hadis have no previous or next', () => {
  expect(neighbours(bookById('muslim'), 1)).toEqual({ prev: null, next: 2 });
  expect(neighbours(bookById('muslim'), 7281)).toEqual({ prev: 7280, next: null });
});
