import { readFileSync } from 'node:fs';
import { bookById } from './books';
import { splitHadis } from './hadisText';
import { citation, cleanText, excerptFor, shareHref, shareText, shortLink } from './share';

// Real texts from the data files.
const read = (folder, number) =>
  JSON.parse(readFileSync(`public/json/hadis/${folder}/${String(number).padStart(4, '0')}/text.txt`, 'utf8'));
const BUKHARI_6628 = read('Bukhari', 6628); // short saying, short chain
const BUKHARI_6 = read('Bukhari', 6); // very long
// A long chain of narrators (87 characters). Bukhari 264 used to stand here, but it opens with an
// Arabic chapter heading, so the splitter now (rightly) finds no chain in it.
const BUKHARI_10 = read('Bukhari', 10);
const MAJAH_100 = read('Majah', 100); // number written "৮/১০০।"

const bukhari = bookById('bukhari');
const URL = 'https://hadis.example/hadis/bukhari/6628';

describe('citation', () => {
  test('names the book and the number in Bengali digits by default', () => {
    expect(citation(bukhari, 123)).toBe('সহীহ বুখারী, হাদীস নং ১২৩');
  });

  test('follows the visitor\'s digit style', () => {
    expect(citation(bukhari, 123, 'en')).toBe('সহীহ বুখারী, হাদীস নং 123');
    expect(citation(bukhari, 6628, 'bn')).toBe('সহীহ বুখারী, হাদীস নং ৬,৬২৮');
  });

  test('uses the book\'s own citation name', () => {
    expect(citation(bookById('tirmidhi'), 5)).toBe('জামে‘ তিরমিযী, হাদীস নং ৫');
  });
});

describe('excerptFor', () => {
  test('returns a short text as it is', () => {
    expect(excerptFor('আমল নিয়তের উপর নির্ভরশীল', 100)).toBe('আমল নিয়তের উপর নির্ভরশীল');
  });

  test('cuts a long text at a word boundary and adds " ..."', () => {
    const cut = excerptFor(BUKHARI_6, 200);
    expect(cut.endsWith(' ...')).toBe(true);
    expect(cut.length).toBeLessThanOrEqual(200);
    const kept = cut.slice(0, -4);
    // what is kept is a whole-word prefix of the original
    expect(BUKHARI_6.startsWith(kept)).toBe(true);
    expect(/\s/.test(BUKHARI_6[kept.length])).toBe(true);
  });

  test('a text with no space is cut hard rather than dropped', () => {
    const cut = excerptFor('অ'.repeat(50), 20);
    expect(cut.endsWith(' ...')).toBe(true);
    expect(cut.length).toBeLessThanOrEqual(20);
  });
});

describe('cleanText', () => {
  test('drops the leading number and keeps a short narrator line on its own line', () => {
    const { chain, body } = splitHadis(BUKHARI_6628);
    expect(chain.length).toBeLessThanOrEqual(80);
    expect(cleanText(BUKHARI_6628)).toBe(`${chain}\n${body}`);
    expect(cleanText(BUKHARI_6628)).not.toMatch(/^৬৬২৮/);
  });

  test('drops a long narrator line and keeps only the saying', () => {
    const { chain, body } = splitHadis(BUKHARI_10);
    expect(chain.length).toBeGreaterThan(80);
    expect(cleanText(BUKHARI_10)).toBe(body);
  });

  test('understands a number like ৮/১০০', () => {
    expect(cleanText(MAJAH_100)).not.toContain('৮/১০০');
    expect(cleanText(MAJAH_100)).toContain('আবূ জুহাইফাহ (রাঃ) থেকে বর্ণিত।');
  });
});

describe('shareText', () => {
  test('is the clean text, then the citation and the link on their own lines', () => {
    const text = shareText({ book: bukhari, number: 6628, text: BUKHARI_6628, url: URL });
    expect(text).toBe(`${cleanText(BUKHARI_6628)}\n\nসহীহ বুখারী, হাদীস নং ৬,৬২৮\n${URL}`);
  });

  test('a long hadis becomes an excerpt that points to the full page', () => {
    const text = shareText({ book: bukhari, number: 6, text: BUKHARI_6, url: 'https://hadis.example/hadis/bukhari/6' });
    const lines = text.split('\n');
    expect(lines.at(-1)).toBe('সম্পূর্ণ হাদীস: https://hadis.example/hadis/bukhari/6');
    expect(lines.at(-2)).toBe('সহীহ বুখারী, হাদীস নং ৬');
    expect(lines.at(-3)).toBe('');
    expect(text).toContain(' ...\n');
    expect(text.length).toBeLessThan(900);
  });

  test('a short hadis is never cut', () => {
    const text = shareText({ book: bukhari, number: 6628, text: BUKHARI_6628, url: URL });
    expect(text).not.toContain('...\n\n');
    expect(text).not.toContain('সম্পূর্ণ হাদীস');
  });

  test('uses the digit style it is given', () => {
    const text = shareText({ book: bukhari, number: 6628, text: BUKHARI_6628, url: URL, digitStyle: 'en' });
    expect(text).toContain('সহীহ বুখারী, হাদীস নং 6,628');
  });

  test('without a link, ends at the citation', () => {
    const text = shareText({ book: bukhari, number: 6628, text: BUKHARI_6628 });
    expect(text.endsWith('\n\nসহীহ বুখারী, হাদীস নং ৬,৬২৮')).toBe(true);
  });
});

test('shortLink drops the scheme', () => {
  expect(shortLink('https://hadis.example/hadis/bukhari/6')).toBe('hadis.example/hadis/bukhari/6');
  expect(shortLink('http://localhost:3000/x')).toBe('localhost:3000/x');
});

test('shareHref is the quote-card page of a hadis', () => {
  expect(shareHref('bukhari', 6628)).toBe('/share/bukhari/6628');
});
