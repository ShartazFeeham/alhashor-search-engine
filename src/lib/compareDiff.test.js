import { realText } from '../test/hadisFixtures';
import { LOW_OVERLAP, compareTexts, normalizeWord, textFor, toSegments, tokenize } from './compareDiff';

// "Actions are judged by intentions": the same report in three books.
const bukhari = realText('bukhari', 1);
const muslim = realText('muslim', 4774);
const majah = realText('ibnmajah', 4227);

const keys = (column) => column.tokens.filter((token) => token.marked).map((token) => token.key);
const unmarked = (column) => column.tokens.filter((token) => token.counted && !token.marked).map((token) => token.key);
const rebuild = (column) => column.tokens.map((token) => token.gap + token.text).join('');

describe('normalizeWord', () => {
  test('strips punctuation and the visarga that ends a quote introduction', () => {
    expect(normalizeWord('বলেছেনঃ')).toBe('বলেছেন');
    expect(normalizeWord('(রাঃ)')).toBe('রা');
    expect(normalizeWord('শুনেছিঃ')).toBe('শুনেছি');
    expect(normalizeWord('নিয়্যাত,')).toBe('নিয়্যাত');
    expect(normalizeWord('‘সত্য’।')).toBe('সত্য');
  });

  test('a letter written as one character or as two compares the same', () => {
    expect(normalizeWord('নিয়ত')).toBe(normalizeWord('নিয়ত'));
  });

  test('a word of only dots or dashes has no key', () => {
    expect(normalizeWord('...')).toBe('');
    expect(normalizeWord('-')).toBe('');
  });
});

describe('tokenize', () => {
  test('words keep the spacing around them, so the text can be rebuilt exactly', () => {
    const words = tokenize(bukhari);
    expect(words.map((word) => word.gap + word.text).join('')).toBe(bukhari);
  });

  test('a hyphen splits a word so "(রাঃ)-কে" is compared as "রা" and "কে"', () => {
    const words = tokenize('উমর (রাঃ)-কে মিম্বরের');
    expect(words.map((word) => word.text)).toEqual(['উমর', '(রাঃ)-', 'কে', 'মিম্বরের']);
    expect(words[2].gap).toBe('');
    expect(words[1].key).toBe('রা');
  });

  test('a run of dots (the gap in a chain) is not counted as a word', () => {
    const dots = tokenize(bukhari).find((word) => word.text === '...');
    expect(dots).toBeDefined();
    expect(dots.counted).toBe(false);
  });
});

describe('textFor', () => {
  test('leaves out the number and the narrator chain by default', () => {
    const text = textFor(bukhari);
    expect(text.startsWith('আমি উমর')).toBe(true);
    expect(text.normalize('NFD')).not.toContain('হুমায়দী'.normalize('NFD'));
    expect(text).not.toMatch(/^১/);
  });

  test('keeps the chain when asked, but never the number', () => {
    const text = textFor(bukhari, { chain: true });
    expect(text.normalize('NFD').startsWith('হুমায়দী'.normalize('NFD'))).toBe(true);
    expect(text).toContain('আমি উমর');
  });

  test('works for a number written with a slash, as Ibn Majah does', () => {
    expect(textFor(majah)).not.toMatch(/৪২২৭/);
    expect(textFor(majah)).toMatch(/^উমার/);
  });
});

describe('compareTexts', () => {
  test('two columns: a word that the other column lacks is marked, a shared word is not', () => {
    const [a, b] = compareTexts([textFor(bukhari), textFor(muslim)]);
    expect(unmarked(a)).toContain('হিজরত');
    expect(unmarked(b)).toContain('হিজরত');
    expect(keys(a)).toContain('প্রত্যেক'); // Muslim has "প্রত্যেকটি", not this word
    expect(keys(b)).toContain('প্রত্যেকটি');
    expect(keys(a)).not.toContain('হিজরত');
  });

  test('spelling variants of the same word are different words', () => {
    const [a, b] = compareTexts([textFor(bukhari), textFor(muslim)]);
    expect(keys(a)).toContain('নিয়তের');
    expect(keys(b)).toContain('নিয়্যাতের');
  });

  test('the text of each column is unchanged', () => {
    const columns = compareTexts([textFor(bukhari), textFor(muslim)]);
    expect(rebuild(columns[0])).toBe(textFor(bukhari));
    expect(rebuild(columns[1])).toBe(textFor(muslim));
  });

  test('the counts: every word counted once, matched is the words found in another column', () => {
    const [a, b] = compareTexts([textFor(bukhari), textFor(muslim)]);
    for (const column of [a, b]) {
      const counted = column.tokens.filter((token) => token.counted);
      expect(column.total).toBe(counted.length);
      expect(column.matched).toBe(counted.filter((token) => !token.marked).length);
      expect(column.matched).toBeGreaterThan(0);
      expect(column.matched).toBeLessThan(column.total);
    }
  });

  test('three columns: a word found in any other column is not marked', () => {
    const [a, b, c] = compareTexts([textFor(bukhari), textFor(muslim), textFor(majah)]);
    // "নারীকে" is in Bukhari and Ibn Majah but not in Muslim, so it is a match for both of them.
    expect(unmarked(a)).toContain('নারীকে');
    expect(unmarked(c)).toContain('নারীকে');
    expect(b.tokens.some((token) => token.key === 'নারীকে')).toBe(false);
    // "পার্থিব" is in Muslim and Ibn Majah only.
    expect(unmarked(b)).toContain('পার্থিব');
    expect(unmarked(c)).toContain('পার্থিব');
    expect(keys(a)).not.toContain('পার্থিব');
  });

  test('a word repeated inside one column is compared like any other', () => {
    const [, b] = compareTexts([textFor(bukhari), textFor(muslim)]);
    const repeats = b.tokens.filter((token) => token.key === 'হিজরত');
    expect(repeats.length).toBeGreaterThan(1);
    expect(repeats.every((token) => !token.marked)).toBe(true);
  });

  test('including the chain compares the narrators too', () => {
    const [a] = compareTexts([textFor(bukhari, { chain: true }), textFor(muslim, { chain: true })]);
    expect(keys(a)).toContain(normalizeWord('হুমায়দী'));
    expect(a.total).toBeGreaterThan(compareTexts([textFor(bukhari), textFor(muslim)])[0].total);
  });

  test('one column alone, or none, marks nothing', () => {
    const [only] = compareTexts([textFor(bukhari)]);
    expect(keys(only)).toEqual([]);
    expect(only.matched).toBe(0);
    expect(only.total).toBeGreaterThan(0);
    expect(compareTexts([])).toEqual([]);
  });

  test('two copies of the same text match completely', () => {
    const [a, b] = compareTexts([textFor(muslim), textFor(muslim)]);
    expect(a.matched).toBe(a.total);
    expect(b.matched).toBe(b.total);
    expect(keys(a)).toEqual([]);
  });
});

describe('unrelated hadis', () => {
  const share = (columns) => columns.reduce((sum, c) => sum + c.matched, 0) / columns.reduce((sum, c) => sum + c.total, 0);
  const abuDawud = realText('abudawud', 2000);
  const tirmidhi = realText('tirmidhi', 500);
  const bukhariFar = realText('bukhari', 5000);

  test.each([
    ['Bukhari 1 and Abu Dawud 2000', [bukhari, abuDawud]],
    ['Tirmidhi 500 and Bukhari 5000', [tirmidhi, bukhariFar]],
  ])('%s: a low share of matched words marks nothing', (_label, raws) => {
    const columns = compareTexts(raws.map((raw) => textFor(raw)));
    expect(share(columns)).toBeLessThan(LOW_OVERLAP);
    for (const column of columns) {
      expect(column.unrelated).toBe(true);
      expect(keys(column)).toEqual([]);
      expect(column.matched).toBeGreaterThan(0); // the counts stay true
      expect(column.matched).toBeLessThan(column.total);
    }
  });

  test.each([
    ['the same report in Bukhari 1 and Muslim 4774', [bukhari, muslim]],
    ['the same report in Bukhari 1, Muslim 4774 and Ibn Majah 4227', [bukhari, muslim, majah]],
    ['the same account in Bukhari 23 and Tirmidhi 2616', [realText('bukhari', 23), realText('tirmidhi', 2616)]],
  ])('%s: related texts are still marked', (_label, raws) => {
    const columns = compareTexts(raws.map((raw) => textFor(raw)));
    expect(share(columns)).toBeGreaterThanOrEqual(LOW_OVERLAP);
    for (const column of columns) expect(column.unrelated).toBe(false);
    expect(columns.some((column) => keys(column).length > 0)).toBe(true);
  });

  test('the threshold sits between the real examples: above the unrelated pairs, below the related ones', () => {
    expect(LOW_OVERLAP).toBeGreaterThan(0.18);
    expect(LOW_OVERLAP).toBeLessThan(0.3);
  });

  test('a very short pair is not judged (a short text always has a low share)', () => {
    const columns = compareTexts(['আল্লাহ বলেন', 'নবী বলেন']);
    expect(columns.every((column) => !column.unrelated)).toBe(true);
    expect(keys(columns[0])).toEqual(['আল্লাহ']);
  });

  test('one column alone is never unrelated', () => {
    expect(compareTexts([textFor(bukhari)])[0].unrelated).toBe(false);
  });
});

describe('toSegments', () => {
  test('runs of plain words and runs of marked words, in order, rebuilding the text exactly', () => {
    const [a] = compareTexts([textFor(bukhari), textFor(muslim)]);
    const segments = toSegments(a.tokens);
    expect(segments.map((segment) => segment.text).join('')).toBe(textFor(bukhari));
    expect(segments.some((segment) => segment.marked)).toBe(true);
    // neighbours always differ, so no two plain runs and no two marked runs sit side by side
    segments.slice(1).forEach((segment, index) => expect(segment.marked).not.toBe(segments[index].marked));
  });

  test('a marked run holds its inner spacing but not the space before it', () => {
    const tokens = [
      { gap: '', text: 'এক', marked: false },
      { gap: ' ', text: 'দুই', marked: true },
      { gap: ' ', text: 'তিন', marked: true },
      { gap: ' ', text: 'চার', marked: false },
    ];
    expect(toSegments(tokens)).toEqual([
      { text: 'এক ', marked: false },
      { text: 'দুই তিন', marked: true },
      { text: ' চার', marked: false },
    ]);
  });

  test('nothing in, nothing out', () => {
    expect(toSegments([])).toEqual([]);
  });
});
