import { realHadisText } from '../test/publicJson';
import {
  NEAR_WORDS,
  countNear,
  PROXIMITY_LIMIT,
  isNear,
  proximityOf,
  rankByProximity,
  reorderTags,
  tokenize,
} from './proximity';

// Real hadis, all containing both রোজা and ইফতার: how many words apart the two are.
//   BUK-613   4 (near)       BUK-1794  5 (near, the edge)   BUK-5704  7
//   MUS-2370  8              BUK-1783  80 (far)
const text = {
  'BUK-613': realHadisText('Bukhari', 613),
  'BUK-1794': realHadisText('Bukhari', 1794),
  'BUK-5704': realHadisText('Bukhari', 5704),
  'MUS-2370': realHadisText('Muslim', 2370),
  'BUK-1783': realHadisText('Bukhari', 1783),
};
const FASTING = ['রোজা', 'ইফতার'];

describe('constants', () => {
  test('near means within 5 words, and 300 results are looked at', () => {
    expect(NEAR_WORDS).toBe(5);
    expect(PROXIMITY_LIMIT).toBe(300);
  });
});

describe('tokenize', () => {
  test('splits a real hadis into words, on spaces and on the slashes and brackets that join spellings', () => {
    const tokens = tokenize(text['BUK-1794']);
    expect(tokens).toEqual(expect.arrayContaining(['রোযা', 'রোজা', 'সিয়াম', 'ছিয়াম']));
    expect(tokens[26]).toBe('রোজা');
    expect(tokens).toHaveLength(167);
  });

  test('drops the dots and dashes that stand alone, such as the "..." inside a chain of narrators', () => {
    const tokens = tokenize(text['BUK-613']);
    expect(tokens.some((token) => /^[.\-…]+$/.test(token))).toBe(false);
    expect(tokens).toHaveLength(111);
  });

  test('is empty for no text', () => {
    expect(tokenize('')).toEqual([]);
    expect(tokenize(undefined)).toEqual([]);
  });
});

describe('proximityOf', () => {
  test('measures how many words apart the searched words are, matching inside longer words', () => {
    // রোজা is word 55 and ইফতার word 59 in BUK-613
    expect(proximityOf(text['BUK-613'], FASTING)).toEqual({ found: 2, total: 2, span: 4 });
    // ইফতারের (31) counts for ইফতার; রোজা is word 26
    expect(proximityOf(text['BUK-1794'], FASTING)).toEqual({ found: 2, total: 2, span: 5 });
    expect(proximityOf(text['MUS-2370'], FASTING)).toEqual({ found: 2, total: 2, span: 8 });
    expect(proximityOf(text['BUK-1783'], FASTING)).toEqual({ found: 2, total: 2, span: 80 });
  });

  test('uses the closest pair when a word occurs several times', () => {
    // সালাত is word 32 (and 71, 102, 108), নামায word 33 in BUK-613
    expect(proximityOf(text['BUK-613'], ['সালাত', 'নামায'])).toEqual({ found: 2, total: 2, span: 1 });
  });

  test('does not depend on the order the words were typed in', () => {
    expect(proximityOf(text['BUK-613'], [...FASTING].reverse())).toEqual(proximityOf(text['BUK-613'], FASTING));
  });

  test('counts a word that is missing from the text as not found', () => {
    expect(proximityOf(text['BUK-1783'], ['রোজা', 'হজ্জ'])).toEqual({ found: 1, total: 2, span: 0 });
    expect(proximityOf(text['BUK-1783'], ['হজ্জ', 'যাকাত'])).toEqual({ found: 0, total: 2, span: null });
  });

  test('one word cannot stand for two query words (রাসূল inside রাসূলুল্লাহ)', () => {
    // the only word holding রাসূল in BUK-1783 is রাসূলুল্লাহ, which is the longer query word
    expect(proximityOf(text['BUK-1783'], ['রাসূল', 'রাসূলুল্লাহ'])).toEqual({ found: 1, total: 2, span: 0 });
  });

  test('three words: the narrowest stretch that holds all of them', () => {
    // রোজা 60, ইফতার 67, সালাত 33 and 50: the narrowest stretch is 50 to 67
    expect(proximityOf(text['BUK-5704'], ['রোজা', 'ইফতার', 'সালাত'])).toEqual({ found: 3, total: 3, span: 17 });
  });

  test('a repeated query word counts once', () => {
    expect(proximityOf(text['BUK-613'], ['রোজা', 'ইফতার', 'ইফতার'])).toEqual({ found: 2, total: 2, span: 4 });
  });

  test('a word spelled with ো as ে + া still matches', () => {
    const decomposed = text['BUK-613'].replace('রোজা', 'র\u09c7\u09beজা');
    expect(proximityOf(decomposed, FASTING)).toEqual({ found: 2, total: 2, span: 4 });
  });

  test('no words or no text means nothing found', () => {
    expect(proximityOf(text['BUK-613'], [])).toEqual({ found: 0, total: 0, span: null });
    expect(proximityOf('', FASTING)).toEqual({ found: 0, total: 2, span: null });
    expect(proximityOf(undefined, FASTING)).toEqual({ found: 0, total: 2, span: null });
  });
});

describe('isNear', () => {
  test('is true when every word is found within 5 words of each other', () => {
    expect(isNear(proximityOf(text['BUK-613'], FASTING))).toBe(true);
    expect(isNear(proximityOf(text['BUK-1794'], FASTING))).toBe(true); // exactly 5
  });

  test('is false from 6 words apart, when a word is missing, and for a single word', () => {
    expect(isNear({ found: 2, total: 2, span: 6 })).toBe(false);
    expect(isNear(proximityOf(text['BUK-5704'], FASTING))).toBe(false);
    expect(isNear(proximityOf(text['BUK-1783'], ['রোজা', 'হজ্জ']))).toBe(false);
    expect(isNear(proximityOf(text['BUK-613'], ['রোজা']))).toBe(false);
  });
});

describe('rankByProximity', () => {
  const item = (tag, body = text[tag]) => ({ tag, text: body });

  test('near hadis first (closest first), then the rest that have every word (closest first), then the others', () => {
    const items = [
      item('MUS-2370'), // 8
      item('BUK-1783'), // 80
      item('X-ONLY-ONE', text['BUK-1783'].replace(/ইফতার/g, '')), // রোজা only
      item('BUK-5704'), // 7
      item('BUK-613'), // 4
      item('BUK-1794'), // 5
    ];
    expect(rankByProximity(items, FASTING)).toEqual(['BUK-613', 'BUK-1794', 'BUK-5704', 'MUS-2370', 'BUK-1783', 'X-ONLY-ONE']);
  });

  test('keeps the search order between hadis that tie', () => {
    const items = [item('B-2', text['BUK-613']), item('A-1', text['BUK-613']), item('C-3', text['BUK-613'])];
    expect(rankByProximity(items, FASTING)).toEqual(['B-2', 'A-1', 'C-3']);
  });

  test('hadis whose text could not be loaded keep their order at the end', () => {
    const items = [item('GONE-1', undefined), item('BUK-1783'), item('GONE-2', null), item('BUK-613')];
    expect(rankByProximity(items, FASTING)).toEqual(['BUK-613', 'BUK-1783', 'GONE-1', 'GONE-2']);
  });

  test('among hadis with only some of the words, the one with more words comes first', () => {
    const twoOfThree = item('TWO', text['BUK-613']);
    const oneOfThree = item('ONE', text['BUK-1783'].replace(/ইফতার/g, ''));
    const words = ['রোজা', 'ইফতার', 'হজ্জ'];
    expect(rankByProximity([oneOfThree, twoOfThree], words)).toEqual(['TWO', 'ONE']);
  });
});

describe('reorderTags', () => {
  const tags = ['MUS-2370', 'BUK-1783', 'BUK-613', 'BUK-5704'];
  const texts = new Map(tags.map((tag) => [tag, text[tag]]));

  test('reorders the first `limit` tags and leaves the rest, in order, after them', () => {
    expect(reorderTags(tags, texts, FASTING, 3)).toEqual(['BUK-613', 'MUS-2370', 'BUK-1783', 'BUK-5704']);
  });

  test('reorders everything when the limit is larger than the list', () => {
    expect(reorderTags(tags, texts, FASTING)).toEqual(['BUK-613', 'BUK-5704', 'MUS-2370', 'BUK-1783']);
  });

  test('a tag with no fetched text is treated as having no words found', () => {
    const missing = new Map(texts);
    missing.delete('BUK-613');
    expect(reorderTags(tags, missing, FASTING)).toEqual(['BUK-5704', 'MUS-2370', 'BUK-1783', 'BUK-613']);
  });
});

describe('countNear', () => {
  const tags = ['MUS-2370', 'BUK-1783', 'BUK-613', 'BUK-5704', 'BUK-1794'];
  const texts = new Map(tags.map((tag) => [tag, text[tag]]));

  test('counts the hadis that have every word within 5 words of each other', () => {
    expect(countNear(tags, texts, FASTING)).toBe(2); // BUK-613 (4) and BUK-1794 (5)
  });

  test('looks only at the first `limit` tags', () => {
    expect(countNear(tags, texts, FASTING, 3)).toBe(1);
  });

  test('a tag with no text is not near', () => {
    expect(countNear(['GONE-1'], new Map(), FASTING)).toBe(0);
  });
});
