import { expect, test } from 'vitest';
import { words } from './khazainulWords';

test('splits on punctuation and digits, lower-cases Latin, drops Arabic vowel signs', () => {
  expect(words('ABD, Abd (12)')).toEqual(['abd', 'abd']);
  expect(words('مَا هُمْ')).toEqual(['ما', 'هم']);
  expect(words('টীকা-১৭০. আল্লাহ')).toEqual(['টীকা', 'আল্লাহ']);
});
