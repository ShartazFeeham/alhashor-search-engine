import { realText } from '../test/hadisFixtures';
import { MAX_SIMILAR_WORDS, sharedWordCount, similarWords } from './similarWords';

test('common words (the real stopword list) are removed, the rest stays', () => {
  const words = similarWords('তিনি বলেন এবং রাসূলুল্লাহ সাল্লাল্লাহু আলাইহি ওয়াসাল্লাম বর্ণিত খেজুর গাছের চারা');
  expect(words).toEqual(expect.arrayContaining(['গাছের', 'চারা']));
  for (const common of ['তিনি', 'এবং', 'বলেন', 'রাসূলুল্লাহ', 'সাল্লাল্লাহু', 'বর্ণিত']) expect(words).not.toContain(common);
});

test('words of one or two letters and words with digits are removed', () => {
  expect(similarWords('এ তা মেঘ ২৩ 45 আ১ ৬৬২৮। সিজদা৫', { stopwords: new Set() })).toEqual(['মেঘ']);
});

test('punctuation is stripped and each word is kept once', () => {
  expect(similarWords('মেঘ, মেঘ। বৃষ্টি: মেঘ!', { stopwords: new Set() })).toEqual(['বৃষ্টি', 'মেঘ'].sort((a, b) => b.length - a.length));
});

test('a word joined to a suffix by a hyphen is judged without the suffix', () => {
  expect(similarWords('ওয়াসাল্লাম-কে বলতে শুনেছি আল-লায়সী')).toEqual(['লায়সী']);
});

test('different spellings of one word count once (normalised)', () => {
  const composed = 'দয়া‌';
  const plain = 'দয়া';
  expect(similarWords(`${composed} ${plain}`, { stopwords: new Set() })).toHaveLength(1);
});

test('a custom stopword set is used, in its normalised spelling', () => {
  expect(similarWords('মেঘ বৃষ্টি', { stopwords: new Set(['মেঘ']) })).toEqual(['বৃষ্টি']);
});

test('more than 25 distinct words keep the 25 longest', () => {
  const text = Array.from({ length: 40 }, (_, i) => 'ক'.repeat(3 + i)).join(' ');
  const words = similarWords(text);
  expect(MAX_SIMILAR_WORDS).toBe(25);
  expect(words).toHaveLength(25);
  expect(new Set(words.map((w) => w.length))).toEqual(new Set(Array.from({ length: 25 }, (_, i) => 3 + 15 + i)));
});

test('real hadis: Bukhari 1 keeps meaningful words and no particles or chain names', () => {
  const words = similarWords(realText('bukhari', 1));
  expect(words.length).toBeGreaterThan(3);
  expect(words.length).toBeLessThanOrEqual(25);
  for (const word of words) {
    expect(Array.from(word).length).toBeGreaterThan(2);
    expect(word).not.toMatch(/[0-9০-৯]/);
  }
  expect(words).not.toContain('তিনি');
  expect(words).not.toContain('বলেন');
});

test('sharedWordCount counts the searched words that a text contains', () => {
  expect(sharedWordCount('বৃষ্টির সময় মেঘ ডাকে', ['মেঘ', 'বৃষ্টি', 'নদী'])).toBe(2);
  expect(sharedWordCount('', ['মেঘ'])).toBe(0);
});
