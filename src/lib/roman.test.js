import { loadRoman, romanReady, romanToBangla } from './roman';

beforeAll(loadRoman);

test('the phonetic library is loaded on request and then ready', async () => {
  await loadRoman();
  expect(romanReady()).toBe(true);
});

test('words are converted by the phonetic library', () => {
  expect(romanToBangla('kitab')).toBe('কিতাব');
  expect(romanToBangla('namaz')).toBe('নামায');
  expect(romanToBangla('1234')).toBe('১২৩৪');
});

test('the prefixes of a word each convert on their own', () => {
  expect(['n', 'na', 'nam', 'nama', 'namaz'].map(romanToBangla)).toEqual(['ন', 'না', 'নাম', 'নামা', 'নামায']);
});

test('common terms use the spelling found in the hadis, in any case', () => {
  expect(romanToBangla('roja')).toBe('রোজা');
  expect(romanToBangla('Roja')).toBe('রোজা');
  expect(romanToBangla('dua')).toBe('দোয়া');
  expect(romanToBangla('rojaa')).not.toBe('রোজা');
});
