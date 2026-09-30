import { formatNumber, toBengaliDigits, toEnglishDigits } from './digits';

test('converts between digit styles and leaves other text alone', () => {
  expect(toBengaliDigits('হাদীস 124')).toBe('হাদীস ১২৪');
  expect(toEnglishDigits('হাদীস ১২৪')).toBe('হাদীস 124');
  expect(toBengaliDigits('abc')).toBe('abc');
});

test('formatNumber groups thousands and respects the style', () => {
  expect(formatNumber(7053)).toBe('৭,০৫৩');
  expect(formatNumber(7053, 'en')).toBe('7,053');
  expect(formatNumber(403, 'bn')).toBe('৪০৩');
  expect(formatNumber('12')).toBe('১২');
});
