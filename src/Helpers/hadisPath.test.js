import { hadisUrl } from './hadisPath';

test('builds the text file path for a hadis tag', () => {
  expect(hadisUrl('BUK-124')).toBe('/json/hadis/Bukhari/0124/text.txt');
});

test('pads the hadis number to four digits', () => {
  expect(hadisUrl('MUS-7')).toBe('/json/hadis/Muslim/0007/text.txt');
  expect(hadisUrl('TIR-3608')).toBe('/json/hadis/Tirmiji/3608/text.txt');
});

test('maps every book code to its folder', () => {
  expect(hadisUrl('DAU-1')).toBe('/json/hadis/Daud/0001/text.txt');
  expect(hadisUrl('MAJ-1')).toBe('/json/hadis/Majah/0001/text.txt');
  expect(hadisUrl('NAS-1')).toBe('/json/hadis/Nasae/0001/text.txt');
});

test('returns null for an unknown book code', () => {
  expect(hadisUrl('XXX-1')).toBeNull();
});

import { BASE_PATH } from './basePath';

test('the base path is empty unless configured, so data URLs start at the site root', () => {
  expect(BASE_PATH).toBe('');
});
