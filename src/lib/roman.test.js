import { curatedSuggestions, isRoman, romanSuggestions } from './roman';

test('recognises text typed in Roman letters', () => {
  expect(isRoman('namaz')).toBe(true);
  expect(isRoman('abu hurairah')).toBe(true);
  expect(isRoman('নামায')).toBe(false);
  expect(isRoman('namaz নামায')).toBe(false);
  expect(isRoman('১২৩')).toBe(false);
  expect(isRoman('   ')).toBe(false);
});

test('common terms give the spellings found in the hadis', () => {
  expect(curatedSuggestions('namaz')).toEqual(['নামায', 'নামাজ', 'সালাত']);
  expect(curatedSuggestions('Roja')).toEqual(['রোজা', 'রোযা']);
  expect(curatedSuggestions('unknownword')).toEqual([]);
});

test('romanSuggestions lists curated spellings first, then the converter, without repeats', async () => {
  const result = await romanSuggestions('namaz');
  expect(result.slice(0, 3)).toEqual(['নামায', 'নামাজ', 'সালাত']);
  expect(new Set(result).size).toBe(result.length);
});

test('words outside the list are converted by the phonetic library', async () => {
  const result = await romanSuggestions('kitab');
  expect(result).toContain('কিতাব');
});

test('Bengali or empty input has no suggestions', async () => {
  expect(await romanSuggestions('নামায')).toEqual([]);
  expect(await romanSuggestions('')).toEqual([]);
});
