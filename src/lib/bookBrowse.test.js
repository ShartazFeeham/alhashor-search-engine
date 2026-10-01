import { bookById } from './books';
import { bookHref, checkJump, hadisAnchor, pageCount, pageNumbers, pageOfNumber, parseJump, rangeGrid } from './bookBrowse';

const bukhari = bookById('bukhari');
const muslim = bookById('muslim');
const nasai = bookById('nasai');
const tirmidhi = bookById('tirmidhi');

describe('pageCount', () => {
  test('counts pages of 20 over the hadis that exist, not the highest number', () => {
    expect(pageCount(bukhari)).toBe(336); // 6,719 hadis
    expect(pageCount(tirmidhi)).toBe(181); // 3,608 hadis, the last page holds 8
    expect(pageCount(muslim)).toBe(365); // 7,281 hadis
  });
});

describe('pageNumbers', () => {
  test('the first page is 1 to 20', () => {
    expect(pageNumbers(muslim, 0)).toEqual(Array.from({ length: 20 }, (_, i) => i + 1));
  });

  test('skips a number that has no file (Bukhari has no 63)', () => {
    const numbers = pageNumbers(bukhari, 3);
    expect(numbers[0]).toBe(61);
    expect(numbers).toContain(62);
    expect(numbers).not.toContain(63);
    expect(numbers[numbers.length - 1]).toBe(81);
    expect(numbers).toHaveLength(20);
  });

  test('the last page holds only what is left', () => {
    expect(pageNumbers(tirmidhi, 180)).toEqual([3601, 3602, 3603, 3604, 3605, 3606, 3607, 3608]);
    expect(pageNumbers(nasai, pageCount(nasai) - 1).at(-1)).toBe(5758);
  });

  test('a page past the end is empty', () => {
    expect(pageNumbers(tirmidhi, 181)).toEqual([]);
  });
});

describe('pageOfNumber', () => {
  test('finds the page an existing hadis is on, counting only hadis that exist', () => {
    expect(pageOfNumber(muslim, 20)).toBe(0);
    expect(pageOfNumber(muslim, 21)).toBe(1);
    expect(pageOfNumber(bukhari, 64)).toBe(3); // 63 has no file, so 64 is the 63rd hadis
    expect(pageOfNumber(bukhari, 81)).toBe(3);
    expect(pageOfNumber(bukhari, 82)).toBe(4);
  });

  test('every number on a page maps back to that page', () => {
    for (const page of [0, 3, 120, 335]) {
      for (const number of pageNumbers(bukhari, page)) expect(pageOfNumber(bukhari, number)).toBe(page);
    }
  });

  test('a number with no file maps to the page of the next hadis', () => {
    expect(pageOfNumber(bukhari, 63)).toBe(3);
    expect(pageOfNumber(bukhari, 2000)).toBe(pageOfNumber(bukhari, 2120)); // inside the 1923 to 2119 gap
  });
});

describe('rangeGrid', () => {
  test('one range per hundred numbers, the last one cut at the highest number', () => {
    const grid = rangeGrid(tirmidhi);
    expect(grid).toHaveLength(37);
    expect(grid[0]).toMatchObject({ from: 1, to: 100, page: 0 });
    expect(grid[1]).toMatchObject({ from: 101, to: 200, page: 5 });
    expect(grid.at(-1)).toMatchObject({ from: 3601, to: 3608, page: 180 });
  });

  test('a range with no hadis at all has no page', () => {
    const grid = rangeGrid(bukhari);
    const empty = grid.find((range) => range.from === 2001); // 1923 to 2119 are missing
    expect(empty.page).toBeNull();
    expect(grid.find((range) => range.from === 1901).page).not.toBeNull();
  });

  test('a range that begins in a gap points at the first hadis after it', () => {
    const range = rangeGrid(bukhari).find((r) => r.from === 401); // 448 and 449 are missing, 401 is not
    expect(pageNumbers(bukhari, range.page)).toContain(401);
    const gapStart = rangeGrid(bukhari).find((r) => r.from === 2101); // 2101 to 2119 missing, 2120 exists
    expect(pageNumbers(bukhari, gapStart.page)).toContain(2120);
  });
});

describe('parseJump', () => {
  test('a book name and a number', () => {
    expect(parseJump('বুখারী ১২৩৪')).toEqual({ book: bukhari, number: 1234 });
    expect(parseJump('মুসলিম 1069')).toEqual({ book: muslim, number: 1069 });
  });

  test('the full and older spellings of a book name', () => {
    expect(parseJump('বুখারী শরীফ ১২')).toEqual({ book: bukhari, number: 12 });
    expect(parseJump('বুখারি শরীফ ১২')).toEqual({ book: bukhari, number: 12 });
    expect(parseJump('আবূ দাউদ ৫')).toEqual({ book: bookById('abudawud'), number: 5 });
    expect(parseJump('সুনানু ইবনে মাজাহ ৫')).toEqual({ book: bookById('ibnmajah'), number: 5 });
    expect(parseJump('তিরমিজি ৯৮৭')).toEqual({ book: tirmidhi, number: 987 });
  });

  test('Roman-letter book names, in any case', () => {
    expect(parseJump('Bukhari 77')).toEqual({ book: bukhari, number: 77 });
    expect(parseJump('nasai 9')).toEqual({ book: nasai, number: 9 });
  });

  test('extra words like "নং" and spacing are tolerated', () => {
    expect(parseJump('  বুখারী   নং ১২৩৪ ')).toEqual({ book: bukhari, number: 1234 });
    expect(parseJump('বুখারী-১২৩৪')).toEqual({ book: bukhari, number: 1234 });
  });

  test('more ways to write a book name: Sharif, Sahih, Sunan, no spaces, curly apostrophes', () => {
    expect(parseJump('Bukhari Sharif 5')).toEqual({ book: bukhari, number: 5 });
    expect(parseJump('sahih bukhari 5')).toEqual({ book: bukhari, number: 5 });
    expect(parseJump('Sahih Muslim 5')).toEqual({ book: muslim, number: 5 });
    expect(parseJump('আবুদাউদ 5')).toEqual({ book: bookById('abudawud'), number: 5 });
    expect(parseJump('Sunan Abu Dawud 5')).toEqual({ book: bookById('abudawud'), number: 5 });
    expect(parseJump('tirmiji 3')).toEqual({ book: tirmidhi, number: 3 });
    expect(parseJump('nasa’i 5')).toEqual({ book: nasai, number: 5 });
  });

  test('"নং", "no.", "#" and thousands commas around the number are tolerated', () => {
    expect(parseJump('বুখারী ১২৩৪ নং')).toEqual({ book: bukhari, number: 1234 });
    expect(parseJump('bukhari no. 5')).toEqual({ book: bukhari, number: 5 });
    expect(parseJump('bukhari #5')).toEqual({ book: bukhari, number: 5 });
    expect(parseJump('বুখারী 1,234')).toEqual({ book: bukhari, number: 1234 });
    expect(parseJump('১,২৩৪', muslim)).toEqual({ book: muslim, number: 1234 });
  });

  test('a minus sign is not a separator', () => {
    expect(parseJump('-5', muslim)).toBeNull();
  });

  test('a number alone uses the book given as the fallback', () => {
    expect(parseJump('১২৩৪', muslim)).toEqual({ book: muslim, number: 1234 });
    expect(parseJump('১২৩৪')).toBeNull();
  });

  test('a name with no number, or nonsense, is not a jump', () => {
    expect(parseJump('বুখারী')).toBeNull();
    expect(parseJump('রোজা ১২')).toBeNull();
    expect(parseJump('')).toBeNull();
    expect(parseJump('   ')).toBeNull();
  });
});

describe('checkJump', () => {
  test('an existing hadis is fine', () => {
    expect(checkJump(bukhari, 64)).toEqual({ ok: true });
  });

  test('zero or past the end names the highest number', () => {
    expect(checkJump(bukhari, 7054)).toEqual({ ok: false, reason: 'range', max: 7053 });
    expect(checkJump(bukhari, 0)).toEqual({ ok: false, reason: 'range', max: 7053 });
  });

  test('a number inside the range with no file says so', () => {
    expect(checkJump(bukhari, 63)).toEqual({ ok: false, reason: 'gap' });
    expect(checkJump(bukhari, 2000)).toEqual({ ok: false, reason: 'gap' });
  });
});

describe('bookHref', () => {
  test('the first page has no page in the address', () => {
    expect(bookHref(bukhari, 0)).toBe('/books/bukhari');
  });

  test('later pages are numbered from 1 in the address', () => {
    expect(bookHref(bukhari, 3)).toBe('/books/bukhari?page=4');
  });

  test('a hadis number adds the hadis to point at', () => {
    expect(bookHref(bukhari, 3, 64)).toBe('/books/bukhari?page=4&hadis=64');
    expect(bookHref(muslim, 0, 5)).toBe('/books/muslim?hadis=5');
  });
});

describe('hadisAnchor', () => {
  test('is the id given to a hadis on the book page', () => {
    expect(hadisAnchor(64)).toBe('h64');
  });
});
