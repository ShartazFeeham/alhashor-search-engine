import { normalizeBengali as n } from '../Helpers/bengali';
import {
  candidatesFor,
  closeWords,
  confusionVariants,
  hasBengali,
  rankSuggestions,
  synonymsOf,
  withinOneEdit,
} from './didYouMean';

describe('hasBengali', () => {
  test('is true for a word with Bengali letters, false for digits, Latin letters and nothing', () => {
    expect(hasBengali('যাকাত')).toBe(true);
    expect(hasBengali('১৫০')).toBe(false);
    expect(hasBengali('zakat')).toBe(false);
    expect(hasBengali('')).toBe(false);
  });
});

describe('withinOneEdit', () => {
  test('accepts one missing, extra, wrong or swapped letter', () => {
    expect(withinOneEdit('নামায', 'নামা')).toBe(true);
    expect(withinOneEdit('নামা', 'নামায')).toBe(true);
    expect(withinOneEdit('নামায', 'নামাজ')).toBe(true);
    expect(withinOneEdit('কবর', 'কর্ব')).toBe(false);
    expect(withinOneEdit('কবর', 'কর')).toBe(true);
    expect(withinOneEdit('abc', 'bac')).toBe(true);
  });

  test('rejects two edits and identical words', () => {
    expect(withinOneEdit('নামায', 'নামাযের')).toBe(false);
    expect(withinOneEdit('নামায', 'নামায')).toBe(false);
    expect(withinOneEdit('abcd', 'badc')).toBe(false);
  });
});

describe('confusionVariants', () => {
  test('swaps letters that are commonly mixed up', () => {
    expect(confusionVariants('জাকাত')).toContain('যাকাত'); // জ / য
    expect(confusionVariants('ইমান')).toContain('ঈমান'); // ই / ঈ
    expect(confusionVariants('সয়তান')).toContain(n('শয়তান')); // স / শ
    expect(confusionVariants('মুসলিম')).toContain('মুসলীম'); // ি / ী
    expect(confusionVariants('দুয়া')).toContain('দোয়া'); // ু / ো
    expect(confusionVariants('পরা')).toContain(n('পড়া')); // র / ড়
    expect(confusionVariants('ণামায')).toContain('নামায'); // ণ / ন
    expect(confusionVariants('টাওবা')).toContain('তাওবা'); // ট / ত
  });

  test('a swap can hit the first two letters, which the typo scan of one data file cannot reach', () => {
    const variants = confusionVariants('ষালাত');
    expect(variants).toContain('সালাত');
    expect(variants.find((v) => v.startsWith('সা'))).toBe('সালাত');
  });

  test('never returns the word itself, repeats, or more than the limit', () => {
    const variants = confusionVariants('শিশুদেরকে শিক্ষা দেওয়া');
    expect(variants).not.toContain('শিশুদেরকে শিক্ষা দেওয়া');
    expect(new Set(variants).size).toBe(variants.length);
    expect(variants.length).toBeLessThanOrEqual(60);
  });

  test('one swap comes before two swaps', () => {
    const variants = confusionVariants('সিশু');
    expect(variants.indexOf('শিশু')).toBeLessThan(variants.indexOf('শীশু'));
  });

  test('does not split a য় or ড় into its base letter', () => {
    // য় is য + a dot; swapping the য alone would leave a stray dot
    expect(confusionVariants('শয়তান').some((v) => v.includes('জ\u09bc'))).toBe(false);
    expect(confusionVariants('পড়া').some((v) => v.includes('দ\u09bc'))).toBe(false);
  });

  test('gives nothing for a word with no confusable letters', () => {
    expect(confusionVariants('')).toEqual([]);
    expect(confusionVariants('abc')).toEqual([]);
  });
});

describe('synonymsOf', () => {
  test('returns the other spellings and names of the same thing', () => {
    expect(synonymsOf('জাকাত')).toContain('যাকাত');
    expect(synonymsOf('বেহেশত')).toContain('জান্নাত');
    expect(synonymsOf('নামায')).toEqual(expect.arrayContaining(['নামাজ', 'সালাত']));
  });

  test('does not include the word itself', () => {
    expect(synonymsOf('নামায')).not.toContain('নামায');
  });

  test('matches the word whichever way its letters are spelled', () => {
    expect(synonymsOf('রোযা')).toContain('রোজা');
    expect(synonymsOf('র\u09c7\u09beযা')).toContain('রোজা'); // ো as ে + া
  });

  test('knows nothing about other words', () => {
    expect(synonymsOf('কলম')).toEqual([]);
  });
});

describe('closeWords', () => {
  const vocabulary = new Map([
    ['নামায', 2921],
    ['নামাজ', 1888],
    ['নামাযী', 70],
    ['সালাত', 4175],
  ]);

  test('lists the words of a vocabulary one edit away, with their counts', () => {
    expect(closeWords('নামা', vocabulary)).toEqual([['নামায', 2921], ['নামাজ', 1888]]);
    expect(closeWords('নামায', vocabulary)).toEqual([['নামাজ', 1888], ['নামাযী', 70]]);
  });

  test('does not list the word itself', () => {
    expect(closeWords('নামাজ', vocabulary).map(([word]) => word)).not.toContain('নামাজ');
  });

  test('is empty when nothing is close', () => {
    expect(closeWords('কলম', vocabulary)).toEqual([]);
  });
});

describe('candidatesFor', () => {
  const vocabulary = new Map([
    ['নামায', 2921],
    ['নামাজ', 1888],
  ]);

  test('puts hand-made synonyms first, then letter swaps, then close words, each once', () => {
    const candidates = candidatesFor('নামাযে', vocabulary);
    const order = ['synonym', 'variant', 'close'];
    const ranks = candidates.map((c) => order.indexOf(c.kind));
    expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
    const words = candidates.map((c) => c.word);
    expect(new Set(words).size).toBe(words.length);
    expect(words).toContain('নামায');
  });

  test('a synonym is named as such', () => {
    const candidates = candidatesFor('বেহেশত', new Map());
    expect(candidates[0]).toEqual({ word: 'জান্নাত', kind: 'synonym' });
  });

  test('a letter swap is named as such', () => {
    expect(candidatesFor('ণামায', new Map())).toContainEqual({ word: 'নামায', kind: 'variant' });
  });

  test('a word one edit away in the vocabulary is named close', () => {
    expect(candidatesFor('নামাযে', vocabulary)).toContainEqual({ word: 'নামায', kind: 'close' });
  });

  test('never offers the word itself', () => {
    expect(candidatesFor('নামায', vocabulary).map((c) => c.word)).not.toContain('নামায');
  });
});

describe('rankSuggestions', () => {
  const hit = (word, kind, hits) => ({ word, kind, hits });

  test('keeps only candidates that really return hadis, and more than the typed word did', () => {
    const ranked = rankSuggestions(0, [hit('ক', 'variant', 0), hit('খ', 'variant', 5)]);
    expect(ranked.map((s) => s.word)).toEqual(['খ']);
    expect(rankSuggestions(2, [hit('ক', 'close', 3), hit('খ', 'close', 9)]).map((s) => s.word)).toEqual(['খ']);
  });

  test('synonyms first, then swaps, then close words; the most hadis first inside a kind', () => {
    const ranked = rankSuggestions(0, [
      hit('c1', 'close', 900),
      hit('v1', 'variant', 10),
      hit('s1', 'synonym', 5),
      hit('v2', 'variant', 50),
    ]);
    expect(ranked.map((s) => s.word)).toEqual(['s1', 'v2', 'v1']);
  });

  test('offers at most three', () => {
    const many = Array.from({ length: 8 }, (_, i) => hit(`w${i}`, 'variant', 10 + i));
    expect(rankSuggestions(0, many)).toHaveLength(3);
  });

  test('is empty when nothing qualifies', () => {
    expect(rankSuggestions(0, [])).toEqual([]);
  });
});
