import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { PLANS } from '../data/readingPlans';
import { bookById, hasHadis } from './books';
import { ALL_SETS, ORDER, TOP_PICKS, randomSets, setFromFile, topPicksHref } from './topPicks';

const dir = path.resolve(process.cwd(), 'src/data/topPicks');
const files = readdirSync(dir).filter((name) => /^set-\d\d\.json$/.test(name)).sort();
const read = (name) => JSON.parse(readFileSync(path.join(dir, name), 'utf8'));

describe('the set files', () => {
  test('there are twelve, set-01 to set-12', () => {
    expect(files).toEqual(Array.from({ length: 12 }, (_, i) => `set-${String(i + 1).padStart(2, '0')}.json`));
  });

  test.each(files)('%s has the agreed shape', (name) => {
    const file = read(name);
    expect(file.id).toMatch(/^[a-z0-9-]+$/);
    expect(file.number).toBe(Number(name.slice(4, 6)));
    expect(typeof file.title).toBe('string');
    expect(file.title.length).toBeGreaterThan(0);
    expect(typeof file.description).toBe('string');
    expect(Array.isArray(file.items)).toBe(true);
    expect(Array.isArray(file.missing)).toBe(true);
    for (const item of file.items) {
      expect(typeof item.line).toBe('string');
      expect(bookById(item.book), `${name}: book ${item.book}`).toBeDefined();
      expect(hasHadis(bookById(item.book), item.number), `${name}: ${item.book} ${item.number}`).toBe(true);
      expect(item.note === null || typeof item.note === 'string').toBe(true);
      expect(['sahih', 'hasan', 'unsure']).toContain(item.grade);
    }
  });
});

describe('the Ahl al-Bayt set (set-04)', () => {
  test('has Bukhari 3290 (Abu Bakr carries Hasan: he looks like the Prophet) once, graded sahih', () => {
    const items = read('set-04.json').items;
    const found = items.filter((item) => item.book === 'bukhari' && item.number === 3290);
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ note: null, grade: 'sahih' });
  });
});

describe('the loader', () => {
  test('reads the twelve files in order; the pages list the ones that have hadis, then the three older plans', () => {
    expect(ALL_SETS.map((set) => set.number)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    expect(TOP_PICKS.slice(-3)).toEqual(PLANS);
    expect(TOP_PICKS.slice(0, -3).map((set) => set.number)).toEqual(ORDER.filter((number) => ALL_SETS.find((set) => set.number === number).days.length > 0));
  });

  test('the sets are listed in the display order 5, 1, 3, 4, 6, 9, 2, 7, 8, 10, 11, 12, then the three older plans', () => {
    expect(ORDER).toEqual([5, 1, 3, 4, 6, 9, 2, 7, 8, 10, 11, 12]);
    expect(TOP_PICKS.map((set) => set.number ?? set.id)).toEqual([...ORDER, ...PLANS.map((plan) => plan.id)]);
  });

  test('only the order changes: the titles equal the json titles, the ids and numbers are those of the files', () => {
    for (const name of files) {
      const file = read(name);
      const set = TOP_PICKS.find((entry) => entry.id === file.id);
      expect(set.title, name).toBe(file.title);
      expect(set.number, name).toBe(file.number);
      expect(ALL_SETS.find((entry) => entry.id === file.id)).toBe(ALL_SETS[file.number - 1]);
    }
  });

  test('a set with no valid hadis is not listed (no placeholder, no page, never offered)', () => {
    expect(TOP_PICKS.every((set) => set.days.length > 0)).toBe(true);
    for (const set of ALL_SETS.filter((entry) => entry.days.length === 0)) {
      expect(TOP_PICKS.map((entry) => entry.id)).not.toContain(set.id);
    }
  });

  test('has unique ids', () => {
    const ids = TOP_PICKS.map((set) => set.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('every set has the shape the plan pages use: id, title, description, days of { book, number }', () => {
    for (const set of TOP_PICKS) {
      expect(typeof set.id).toBe('string');
      expect(typeof set.title).toBe('string');
      expect(typeof set.description).toBe('string');
      expect(Array.isArray(set.days)).toBe(true);
      for (const day of set.days) expect(hasHadis(bookById(day.book), day.number)).toBe(true);
    }
  });

  test('keeps the item order, one day per item, with the note and the grade', () => {
    const set = setFromFile({
      id: 'x',
      number: 1,
      title: 'টি',
      description: 'ডি',
      items: [
        { line: 'ক', book: 'muslim', number: 2626, note: 'টীকা', grade: 'sahih' },
        { line: 'খ', book: 'bukhari', number: 37, note: null, grade: 'hasan' },
      ],
      missing: ['গ'],
    });
    expect(set.days).toEqual([
      { book: 'muslim', number: 2626, line: 'ক', note: 'টীকা', grade: 'sahih' },
      { book: 'bukhari', number: 37, line: 'খ', note: null, grade: 'hasan' },
    ]);
    expect(set.missing).toEqual(['গ']);
    expect(set).toMatchObject({ id: 'x', number: 1, title: 'টি', description: 'ডি' });
  });

  test('skips an item with an unknown book or a number that has no hadis', () => {
    const set = setFromFile({
      id: 'x',
      number: 1,
      title: 't',
      description: '',
      items: [
        { line: 'a', book: 'nobook', number: 1, note: null, grade: 'sahih' },
        { line: 'b', book: 'bukhari', number: 0, note: null, grade: 'sahih' },
        { line: 'c', book: 'bukhari', number: 99999, note: null, grade: 'sahih' },
        { line: 'd', book: 'bukhari', number: 'x', note: null, grade: 'sahih' },
        { line: 'e', book: 'bukhari', number: 1, note: null, grade: 'sahih' },
        null,
      ],
      missing: [],
    });
    expect(set.days.map((day) => `${day.book}:${day.number}`)).toEqual(['bukhari:1']);
  });

  test('a set file with no items becomes a set with no days', () => {
    const set = setFromFile({ id: 'x', number: 3, title: 't', description: '', items: [], missing: [] });
    expect(set.days).toEqual([]);
    expect(setFromFile({ id: 'y', number: 4, title: 't' }).days).toEqual([]);
  });

  test('addresses', () => {
    expect(topPicksHref()).toBe('/top-picks');
    expect(topPicksHref('ramadan-30')).toBe('/top-picks/ramadan-30');
  });
});

describe('randomSets', () => {
  const sets = ['a', 'b', 'c', 'd', 'e'].map((id) => ({ id }));

  test('gives the asked number of different sets', () => {
    for (const value of [0, 0.3, 0.7, 0.999]) {
      const chosen = randomSets(sets, 3, () => value);
      expect(chosen).toHaveLength(3);
      expect(new Set(chosen.map((set) => set.id)).size).toBe(3);
    }
  });

  test('follows the random numbers, and gives fewer when there are fewer', () => {
    expect(randomSets(sets, 3, () => 0).map((set) => set.id)).toEqual(['a', 'b', 'c']);
    expect(randomSets(sets, 3, () => 0.999).map((set) => set.id)).toEqual(['e', 'd', 'c']);
    expect(randomSets(sets.slice(0, 2), 3)).toHaveLength(2);
    expect(randomSets([], 3)).toEqual([]);
  });
});
