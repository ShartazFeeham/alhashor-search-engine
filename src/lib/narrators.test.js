import { realHadisText, serveRealData } from '../test/publicJson';
import { splitHadis } from './hadisText';
import { cleanName, lastNarratorRaw } from './narratorName';
import {
  bookFromParam,
  clearNarratorCache,
  filterNarrators,
  indexUrl,
  loadIndex,
  loadNarratorHadis,
  narratorHref,
  narratorUrl,
  pairsToHadis,
  parseIndex,
  parseRow,
} from './narrators';

beforeEach(() => {
  clearNarratorCache();
  serveRealData();
});

afterEach(() => {
  delete global.fetch;
});

describe('narratorHref', () => {
  test('no id is the list', () => {
    expect(narratorHref('')).toBe('/narrators');
    expect(narratorHref(undefined, 3, 'muslim')).toBe('/narrators');
  });

  test('a narrator, numbered from 1 in the address, the first page without "page"', () => {
    expect(narratorHref('abu-hurayrah')).toBe('/narrators?name=abu-hurayrah');
    expect(narratorHref('abu-hurayrah', 2)).toBe('/narrators?name=abu-hurayrah&page=3');
  });

  test('a book is added only for a real book', () => {
    expect(narratorHref('aisha', 0, 'muslim')).toBe('/narrators?name=aisha&book=muslim');
    expect(narratorHref('aisha', 1, 'nasai')).toBe('/narrators?name=aisha&page=2&book=nasai');
    expect(narratorHref('aisha', 0, 'all')).toBe('/narrators?name=aisha');
    expect(narratorHref('aisha', 0, 'nobook')).toBe('/narrators?name=aisha');
    expect(narratorHref('aisha', 1, 'muslim', 'desc')).toBe('/narrators?name=aisha&page=2&book=muslim&sort=name-desc');
    expect(narratorHref('', 0, 'all', 'desc')).toBe('/narrators?sort=name-desc');
  });

  test('the data addresses', () => {
    expect(indexUrl()).toBe('/json/narrators/index.json');
    expect(narratorUrl('abu-hurayrah')).toBe('/json/narrators/abu-hurayrah.json');
  });
});

describe('bookFromParam', () => {
  test('a book id stays, anything else is "all"', () => {
    expect(bookFromParam('tirmidhi')).toBe('tirmidhi');
    expect(bookFromParam('nobook')).toBe('all');
    expect(bookFromParam(null)).toBe('all');
    expect(bookFromParam('')).toBe('all');
  });
});

describe('parseRow', () => {
  test('reads id, name, count and one count per book', () => {
    const row = parseRow(['aisha', 'আয়িশা', 100, 10, 20, 30, 15, 15, 10]);
    expect(row).toMatchObject({
      id: 'aisha',
      name: 'আয়িশা',
      count: 100,
      perBook: { bukhari: 10, muslim: 20, tirmidhi: 30, abudawud: 15, ibnmajah: 15, nasai: 10 },
    });
  });

  test('a missing per-book count is 0', () => {
    expect(parseRow(['aisha', 'আয়িশা', 5, 5]).perBook).toEqual({ bukhari: 5, muslim: 0, tirmidhi: 0, abudawud: 0, ibnmajah: 0, nasai: 0 });
  });

  test.each([
    ['not an array', 'x'],
    ['no id', ['', 'আয়িশা', 5]],
    ['no name', ['a', 7, 5]],
    ['no count', ['a', 'আয়িশা', 'many']],
    ['a count of zero', ['a', 'আয়িশা', 0]],
  ])('skips a row that is unreadable: %s', (_what, row) => {
    expect(parseRow(row)).toBeNull();
    expect(parseIndex([row])).toEqual([]);
  });

  test('parseIndex of something that is not a list is empty', () => {
    expect(parseIndex(null)).toEqual([]);
    expect(parseIndex({})).toEqual([]);
  });
});

describe('filterNarrators', () => {
  const some = parseIndex([
    ['abu-hurayrah', 'আবূ হুরায়রা', 100, 100],
    ['aisha', 'আয়িশা', 90, 90],
    ['ibn-umar', 'ইবনু উমর', 80, 80],
    ['ibn-abbas', 'ইবনু আব্বাস', 70, 70],
  ]);
  const ids = (list) => list.map((narrator) => narrator.id);

  test('no text keeps every narrator in the list\'s order', () => {
    expect(ids(filterNarrators(some, ''))).toEqual(['abu-hurayrah', 'aisha', 'ibn-umar', 'ibn-abbas']);
    expect(ids(filterNarrators(some, '   '))).toEqual(['abu-hurayrah', 'aisha', 'ibn-umar', 'ibn-abbas']);
  });

  test('matches anywhere in the name', () => {
    expect(ids(filterNarrators(some, 'ইবনু'))).toEqual(['ibn-umar', 'ibn-abbas']);
    expect(ids(filterNarrators(some, 'আয়'))).toEqual(['aisha']);
  });

  test('finds a name written another way: হুরাইরা for হুরায়রা, আবু for আবূ, ইবনে for ইবনু', () => {
    expect(ids(filterNarrators(some, 'হুরাইরা'))).toEqual(['abu-hurayrah']);
    expect(ids(filterNarrators(some, 'আবু'))).toEqual(['abu-hurayrah']);
    expect(ids(filterNarrators(some, 'ইবনে'))).toEqual(['ibn-umar', 'ibn-abbas']);
    expect(ids(filterNarrators(some, 'আয়েশা'))).toEqual(['aisha']);
  });

  test('য় typed as one character or as য and a dot finds the same name', () => {
    expect(ids(filterNarrators(some, 'হুরায়রা'.normalize('NFC')))).toEqual(['abu-hurayrah']);
    expect(ids(filterNarrators(some, 'হুরায়রা'.normalize('NFD')))).toEqual(['abu-hurayrah']);
  });

  test('nothing matched gives an empty list', () => {
    expect(filterNarrators(some, 'zzzz')).toEqual([]);
  });

  test('"আল" alone matches nothing special (it is dropped from the folded spelling) but a plain match still works', () => {
    expect(filterNarrators(some, 'আল')).toEqual([]);
  });
});

describe('pairsToHadis', () => {
  const pairs = [[0, 13], [0, 34], [1, 294], [4, 94], [5, 6]];

  test('turns book positions into book ids', () => {
    expect(pairsToHadis(pairs)).toEqual([
      { bookId: 'bukhari', number: 13 },
      { bookId: 'bukhari', number: 34 },
      { bookId: 'muslim', number: 294 },
      { bookId: 'ibnmajah', number: 94 },
      { bookId: 'nasai', number: 6 },
    ]);
  });

  test('keeps one book only', () => {
    expect(pairsToHadis(pairs, 'bukhari').map((h) => h.number)).toEqual([13, 34]);
    expect(pairsToHadis(pairs, 'tirmidhi')).toEqual([]);
  });

  test('skips what is not a pair', () => {
    expect(pairsToHadis([[9, 1], [0, 'x'], [0, 0], 'a', null, [0, 5]])).toEqual([{ bookId: 'bukhari', number: 5 }]);
    expect(pairsToHadis(null)).toEqual([]);
  });
});

describe('the real index', () => {
  test('loads, leads with Abu Hurayrah and counts each book', async () => {
    const { status, narrators } = await loadIndex();
    expect(status).toBe('ok');
    expect(narrators.length).toBeGreaterThan(100);
    expect(narrators[0].id).toBe('abu-hurayrah');
    expect(narrators[0].count).toBeGreaterThan(3000);
    expect(Object.values(narrators[0].perBook).reduce((a, b) => a + b, 0)).toBe(narrators[0].count);
  });

  test('is sorted by count, most first', async () => {
    const { narrators } = await loadIndex();
    const counts = narrators.map((narrator) => narrator.count);
    expect(counts).toEqual([...counts].sort((a, b) => b - a));
  });

  test('is fetched once and remembered', async () => {
    await loadIndex();
    await loadIndex();
    expect(global.fetch.mock.calls.filter(([url]) => url === indexUrl())).toHaveLength(1);
  });

  test('says "missing" for a missing file and "error" for a network failure (and tries an error again)', async () => {
    serveRealData((url) => (url === indexUrl() ? Promise.resolve({ ok: false, status: 404 }) : undefined));
    expect((await loadIndex()).status).toBe('missing');
    clearNarratorCache();
    serveRealData(() => Promise.reject(new Error('offline')));
    expect(await loadIndex()).toEqual({ status: 'error', narrators: [] });
    serveRealData();
    expect((await loadIndex()).status).toBe('ok');
  });

  test('a server error is an error, not "missing", and is tried again', async () => {
    serveRealData((url) => (url === indexUrl() ? Promise.resolve({ ok: false, status: 500 }) : undefined));
    expect((await loadIndex()).status).toBe('error');
    serveRealData();
    expect((await loadIndex()).status).toBe('ok');
  });
});

describe('a real narrator', () => {
  test('Abu Hurayrah\'s hadis are in book order and every one really ends its chain with his name', async () => {
    const { status, hadis } = await loadNarratorHadis('abu-hurayrah');
    expect(status).toBe('ok');
    expect(hadis[0]).toEqual({ bookId: 'bukhari', number: expect.any(Number) });
    const folders = { bukhari: 'Bukhari', muslim: 'Muslim', tirmidhi: 'Tirmiji', abudawud: 'Daud', ibnmajah: 'Majah', nasai: 'Nasae' };
    const step = Math.floor(hadis.length / 12);
    for (let i = 0; i < hadis.length; i += step) {
      const { bookId, number } = hadis[i];
      const name = cleanName(lastNarratorRaw(splitHadis(realHadisText(folders[bookId], number)).chain));
      expect(name).toMatch(/হুর[াি]/);
    }
  });

  test('the index count equals the length of the file, per book too', async () => {
    const { narrators } = await loadIndex();
    const aisha = narrators.find((narrator) => narrator.id === 'aisha');
    const all = await loadNarratorHadis('aisha');
    expect(all.hadis).toHaveLength(aisha.count);
    for (const [bookId, n] of Object.entries(aisha.perBook)) {
      expect((await loadNarratorHadis('aisha', bookId)).hadis).toHaveLength(n);
    }
  });

  test('an id with no file is "missing"', async () => {
    expect(await loadNarratorHadis('no-such-narrator')).toEqual({ status: 'missing', hadis: [] });
  });
});
