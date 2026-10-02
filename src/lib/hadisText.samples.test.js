import { realHadisText } from '../test/publicJson';
import { splitHadis } from './hadisText';

// Real texts from every book, read from public/json/hadis. Each row: [book folder, hadis number,
// kind, the number the text starts with ('' when the text has none), optional expected chain ending].
// Kinds:
//   short    one or two narrators, chain is a few words
//   mid      a few names with a "..." gap
//   long     many names, long chain with "..." abbreviations
//   sutre    chain ends "... সূত্রে বর্ণিত" instead of "থেকে বর্ণিত"
//   nochain  no "বর্ণিত" anywhere, so no chain
//   inside   "বর্ণিত" appears only inside the saying, after a sentence, so no chain
//   nothing  the chain would leave nothing to read, so the whole text is the saying
//   grading  a Tirmidhi-style grading remark at the end of the text
//   heading  text starts with a heading or Arabic quote instead of the number
const SAMPLES = [
  ['Bukhari', 1107, 'short', '১১০৭'],
  ['Bukhari', 1112, 'long', '১১১২'],
  ['Bukhari', 985, 'mid', '৯৮৫'],
  ['Bukhari', 1660, 'nochain', '১৬৬০'],
  ['Bukhari', 193, 'heading', ''],
  ['Bukhari', 546, 'sutre', '৫৪৬'],
  ['Bukhari', 2855, 'mid', '২৮৫৫'],
  ['Bukhari', 55, 'heading', ''],
  ['Bukhari', 264, 'heading', ''],
  ['Bukhari', 1140, 'heading', ''],
  ['Daud', 259, 'short', '২৫৯'],
  ['Daud', 1293, 'long', '১২৯৩'],
  ['Daud', 840, 'mid', '৮৪০'],
  ['Daud', 977, 'nochain', '৯৭৭'],
  ['Daud', 1345, 'inside', '১৩৪৫'],
  ['Daud', 212, 'sutre', '২১২'],
  ['Daud', 796, 'mid', '৭৯৬'],
  ['Daud', 1749, 'mid', '১৭৪৯'],
  ['Majah', 663, 'short', '১/৬৬৩'],
  ['Majah', 2171, 'short', '১/২১৭১'],
  ['Majah', 613, 'nochain', '১/৬১৩'],
  ['Majah', 2080, 'inside', '২/২০৮০'],
  ['Majah', 931, 'sutre', '৩/৯৩১'],
  ['Majah', 145, 'short', '৪/১৪৫'],
  ['Majah', 175, 'short', '8/১৭৫'],
  ['Majah', 2599, 'short', '১/২৫৯৯'],
  ['Majah', 73, 'short', '১৬/৭৩'],
  ['Muslim', 1160, 'mid', '১১৬০'],
  ['Muslim', 1379, 'long', '১৩৭৯'],
  ['Muslim', 877, 'nochain', '৮৭৭'],
  ['Muslim', 3, 'inside', '৩'],
  ['Muslim', 1314, 'sutre', '১৩১৪'],
  ['Muslim', 1252, 'mid', '১২৫২'],
  ['Muslim', 4601, 'inside', '৪৬০১'],
  ['Muslim', 3411, 'mid', '৩৪১১'],
  ['Muslim', 314, 'inside', '৩১৪'],
  ['Nasae', 1881, 'short', '১৮৮১'],
  ['Nasae', 870, 'long', '৮৭০'],
  ['Nasae', 800, 'mid', '৮০০'],
  ['Nasae', 2509, 'mid', '২৫০৯'],
  ['Nasae', 4533, 'inside', '৪৫৩৩'],
  ['Nasae', 1791, 'nothing', '১৭৯১'],
  ['Nasae', 1413, 'mid', '১৪১৩'],
  ['Nasae', 2479, 'mid', '২৪৭৯'],
  ['Tirmiji', 2128, 'short', '২১২৮'],
  ['Tirmiji', 999, 'long', '৯৯৯'],
  ['Tirmiji', 793, 'mid', '৭৯৩'],
  ['Tirmiji', 71, 'nochain', '৭১'],
  ['Tirmiji', 1555, 'inside', '১৫৫৫'],
  ['Tirmiji', 1636, 'nothing', '১৬৩৬'],
  ['Tirmiji', 6, 'grading', '৬'],
  ['Tirmiji', 758, 'mid', '৭৫৮'],
];

const NUMBER_AND_SEPARATOR = /^\s*[০-৯0-9]+(?:\s*\/\s*[০-৯0-9]+)?\s*[।.,]?\s*/;
// the data writes য় as two characters, so compare in one normal form
const nfc = (text) => text.normalize('NFC');
const squash = (text) => text.replace(/\s+/g, '');

describe('splitHadis on real texts from every book', () => {
  test('there are at least 8 samples for each of the 6 books', () => {
    const perBook = {};
    for (const [book] of SAMPLES) perBook[book] = (perBook[book] || 0) + 1;
    expect(Object.keys(perBook).sort()).toEqual(['Bukhari', 'Daud', 'Majah', 'Muslim', 'Nasae', 'Tirmiji']);
    for (const count of Object.values(perBook)) expect(count).toBeGreaterThanOrEqual(8);
  });

  test.each(SAMPLES)('%s %i (%s)', (book, hadisNumber, kind, expectedNumber) => {
    const text = realHadisText(book, hadisNumber);
    const parts = splitHadis(text);

    // the number is read from the text, in whichever form the book writes it
    expect(parts.number).toBe(expectedNumber);
    // there is always something to read
    expect(parts.body).not.toBe('');
    // nothing lost: chain + saying are the text without its number, in the same order
    const withoutNumber = parts.number ? text.replace(NUMBER_AND_SEPARATOR, '') : text;
    expect(squash(parts.chain + parts.body)).toBe(squash(withoutNumber));
    // the number never ends up inside the chain or the saying
    if (parts.number) expect(parts.chain.startsWith(parts.number)).toBe(false);
    // a summary exists exactly when there is a chain
    expect(Boolean(parts.summary)).toBe(Boolean(parts.chain));

    if (parts.chain) {
      // a chain is a short run of names that ends at the "বর্ণিত" marker, with no sentence in it
      expect(parts.chain).toMatch(/(?:বর্ণিত|বৰ্ণিত)(?:\s+আছে)?(?:\s+যে)?(?:,|।|:|ঃ)?$/);
      expect(parts.chain.slice(0, -1)).not.toContain('।');
      expect(parts.chain.length).toBeLessThan(260);
      // the summary is made of names that are in the chain
      for (const piece of parts.summary.split(' ... ')) expect(parts.chain).toContain(piece);
      // the saying does not start with leftover punctuation
      expect(parts.body).not.toMatch(/^(?:,|।|:|ঃ)/);
      // "বর্ণিত যে," and "বর্ণিত আছে যে," belong to the chain, not to the start of the saying
      expect(parts.body).not.toMatch(/^(?:আছে\s+)?যে(?:[,\s]|$)/);
    }

    if (kind === 'nochain' || kind === 'inside' || kind === 'nothing' || kind === 'heading') {
      expect(parts.chain).toBe('');
      expect(parts.summary).toBe('');
    }
    if (kind === 'short' || kind === 'mid' || kind === 'long' || kind === 'sutre' || kind === 'grading') {
      expect(parts.chain).not.toBe('');
    }
    if (kind === 'nochain') expect(text).not.toMatch(/বর্ণিত|বৰ্ণিত/);
    if (kind === 'long') expect(parts.chain.length).toBeGreaterThan(80);
    if (kind === 'long' || kind === 'mid') expect(parts.chain).toMatch(/\.{3}/);
    if (kind === 'sutre') expect(parts.chain).toMatch(/সূত্রে বর্ণিত|সুত্রে বর্ণিত/);
    if (kind === 'grading') {
      expect(text).toContain('আবূ ঈসা');
      expect(parts.body).toContain('আবূ ঈসা তিরমিযী বলেনঃ');
      expect(parts.chain).not.toContain('আবূ ঈসা');
    }
    if (kind === 'inside') expect(text).toContain('বর্ণিত');
  });

  test('Muslim: "বর্ণিত যে," ends the chain, so the saying starts at "তিনি বলেন"', () => {
    const parts = splitHadis(realHadisText('Muslim', 1160));
    expect(parts.chain.endsWith('(রাঃ) থেকে বর্ণিত যে,')).toBe(true);
    expect(parts.body.startsWith('তিনি বলেন, নবী সাল্লাল্লাহু')).toBe(true);
  });

  test('Ibn Majah: "বর্ণিত। তিনি বলেন" puts only the narrator in the chain and the saying after it', () => {
    const parts = splitHadis(realHadisText('Majah', 175));
    expect(parts.number).toBe('8/১৭৫');
    expect(parts.chain).toBe('আনাস ইবনু মালিক (রাঃ) থেকে বর্ণিত।');
    expect(parts.summary).toBe('আনাস ইবনু মালিক (রাঃ)');
    expect(parts.body.startsWith('তিনি বলেন, রাসূলুল্লাহ')).toBe(true);
  });

  test('Ibn Majah: a number with no sign after it (১/২৫৯৯) is still the number', () => {
    const parts = splitHadis(realHadisText('Majah', 2599));
    expect(parts.number).toBe('১/২৫৯৯');
    expect(parts.chain).toBe('ইবনে আব্বাস (রাঃ) থেকে বর্ণিত।');
  });

  test('a narrator line that ends "সূত্রে বর্ণিত" is a chain (Ibn Majah, "his father and grandfather")', () => {
    const parts = splitHadis(realHadisText('Majah', 931));
    expect(nfc(parts.chain)).toBe(nfc('আমর ইবনু শুআইব (রহঃ) থেকে পর্যায়ক্রমে তার পিতা ও তার দাদার সূত্রে বর্ণিত।'));
    expect(parts.body.startsWith('তিনি বলেন, আমি নবী')).toBe(true);
  });

  test('"... সূত্রে বর্ণিত আছে।" with nothing after it is not split into a chain and a stray word (Tirmidhi 1636)', () => {
    const parts = splitHadis(realHadisText('Tirmiji', 1636));
    expect(parts.chain).toBe('');
    expect(nfc(parts.body)).toBe(nfc('মুহাম্মদ ইবনু বাশশার (রহঃ) ... যায়দ ইবনু খালিদ জুহানী রাদিয়াল্লাহু আনহু সূত্রে বর্ণিত আছে।'));
  });

  test('a text with the typo "বৰ্ণিত" (Assamese ra) still gets its chain (Nasa\'i 2509)', () => {
    const parts = splitHadis(realHadisText('Nasae', 2509));
    expect(parts.chain).toBe('মুহাম্মদ ইবন আবদুল্লাহ (রহঃ) ... কায়স ইবন সা’দ (রাঃ) থেকে বৰ্ণিত।');
    expect(parts.summary).toBe('মুহাম্মদ ইবন আবদুল্লাহ (রহঃ) ... কায়স ইবন সা’দ (রাঃ)');
  });

  test('a number followed by a comma or by nothing is read as the number (Nasa\'i 2479, Abu Dawud 1749)', () => {
    expect(splitHadis(realHadisText('Nasae', 2479)).number).toBe('২৪৭৯');
    const daud = splitHadis(realHadisText('Daud', 1749));
    expect(daud.number).toBe('১৭৪৯');
    expect(nfc(daud.chain).startsWith(nfc('আন নুফায়লী'))).toBe(true);
  });

  test('an Arabic quotation in front of the narrators is part of the saying, not of the chain (Bukhari 264)', () => {
    const text = realHadisText('Bukhari', 264);
    const parts = splitHadis(text);
    expect(parts.chain).toBe('');
    expect(parts.body).toBe(text.trim());
  });

  test('Tirmidhi: the grading remark stays in the saying after the chain', () => {
    const parts = splitHadis(realHadisText('Tirmiji', 6));
    expect(nfc(parts.chain)).toBe(nfc('আহমদ ইবনু আদা আযযাব্বী ...... আনাস ইবনু মালিক রাদিয়াল্লাহু আনহু থেকে বর্ণিত আছে যে,'));
    expect(nfc(parts.body).endsWith(nfc('এই রিওয়ায়াতটি হাসান ও সহীহ।'))).toBe(true);
  });
});
