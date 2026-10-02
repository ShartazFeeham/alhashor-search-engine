import { normalizeBengali } from '../Helpers/bengali';
import { TOPICS, curatedFor, filterTopics, topicHref } from './topics';

describe('TOPICS', () => {
  test('lists every topic once, even where the source holds two spellings of the same letters', () => {
    const keys = TOPICS.map(normalizeBengali);
    expect(TOPICS.length).toBeGreaterThan(100);
    expect(new Set(keys).size).toBe(keys.length);
  });

  test('has no blank names and no stray spaces around a name', () => {
    expect(TOPICS.every((name) => name !== '' && name === name.trim())).toBe(true);
  });

  test('keeps the topics the old index had', () => {
    for (const name of ['ঈমান', 'নামায', 'জ্ঞান অর্জন', 'কৃপণতা', 'শাফাআত']) expect(TOPICS).toContain(name);
  });
});

describe('filterTopics', () => {
  const some = ['ঈমান', 'নামায', 'বিতর নামায', 'রোজা'];

  test('no text keeps every topic', () => {
    expect(filterTopics(some, '')).toEqual(some);
    expect(filterTopics(some, '   ')).toEqual(some);
  });

  test('matches anywhere in the name', () => {
    expect(filterTopics(some, 'নামায')).toEqual(['নামায', 'বিতর নামায']);
    expect(filterTopics(some, 'মা')).toEqual(['ঈমান', 'নামায', 'বিতর নামায']);
  });

  test('ignores spaces around the text and the way a letter was typed', () => {
    expect(filterTopics(['রোজা'], '  রো')).toEqual(['রোজা']);
    // য় as one character (U+09DF) or as য + nukta (U+09AF U+09BC)
    expect(filterTopics(['পয়গাম'], 'পয়')).toEqual(['পয়গাম']);
    expect(filterTopics(['পয়গাম'], 'পয়')).toEqual(['পয়গাম']);
  });

  test('says nothing matched with an empty list', () => {
    expect(filterTopics(some, 'zzz')).toEqual([]);
  });
});

describe('topicHref', () => {
  const read = (href) => decodeURIComponent(href);

  test('a topic on its first page has no page in the address', () => {
    expect(read(topicHref('ঈমান'))).toBe('/topics?topic=ঈমান');
    expect(read(topicHref('ঈমান', 0))).toBe('/topics?topic=ঈমান');
  });

  test('later pages are numbered from 1 in the address', () => {
    expect(read(topicHref('ঈমান', 1))).toBe('/topics?topic=ঈমান&page=2');
    expect(read(topicHref('ঈমান', 4))).toBe('/topics?topic=ঈমান&page=5');
  });

  test('no topic is the plain topics page', () => {
    expect(topicHref('')).toBe('/topics');
  });

  test('a topic of several words stays one value', () => {
    expect(new URL(topicHref('জ্ঞান অর্জন'), 'http://x').searchParams.get('topic')).toBe('জ্ঞান অর্জন');
  });
});

describe('curatedFor', () => {
  const curated = {
    ঈমান: [
      { book: 'bukhari', number: 8, note: 'প্রথম টীকা' },
      { book: 'muslim', number: 45, note: 'দ্বিতীয় টীকা' },
    ],
    রোজা: [
      { book: 'bukhari', number: 63, note: 'এই নম্বরের ফাইল নেই' }, // a number with no file
      { book: 'nobook', number: 1, note: 'অজানা বই' },
      { book: 'muslim', number: 1070, note: 'চলবে' },
    ],
  };

  test('gives the entries for a topic, in order', () => {
    expect(curatedFor(curated, 'ঈমান')).toEqual(curated['ঈমান']);
  });

  test('a topic with no entry, or no topic, has none', () => {
    expect(curatedFor(curated, 'নামায')).toEqual([]);
    expect(curatedFor(curated, '')).toEqual([]);
  });

  test('finds the topic however its letters were typed', () => {
    const typed = { 'পয়গাম': [{ book: 'bukhari', number: 1, note: 'ক' }] };
    expect(curatedFor(typed, 'পয়গাম')).toHaveLength(1);
  });

  test('leaves out entries that cannot be shown (unknown book, a number with no file)', () => {
    expect(curatedFor(curated, 'রোজা')).toEqual([{ book: 'muslim', number: 1070, note: 'চলবে' }]);
  });

  test('copes with no data at all', () => {
    expect(curatedFor(undefined, 'ঈমান')).toEqual([]);
    expect(curatedFor({}, 'ঈমান')).toEqual([]);
  });
});

describe('topicHref with a sort', () => {
  test('keeps &sort=desc and leaves ascending out', () => {
    expect(decodeURIComponent(topicHref('ঈমান', 0, 'desc'))).toBe('/topics?topic=ঈমান&sort=desc');
    expect(decodeURIComponent(topicHref('ঈমান', 1, 'desc'))).toBe('/topics?topic=ঈমান&page=2&sort=desc');
    expect(topicHref('', 0, 'desc')).toBe('/topics?sort=desc');
    expect(topicHref('ঈমান', 0, 'asc')).toBe(topicHref('ঈমান'));
  });
});

describe('topicHref with a book', () => {
  test('keeps &book=<id> between the page and the sort, and leaves "all" out', () => {
    expect(decodeURIComponent(topicHref('ঈমান', 1, 'desc', 'muslim'))).toBe('/topics?topic=ঈমান&page=2&book=muslim&sort=desc');
    expect(decodeURIComponent(topicHref('ঈমান', 0, 'asc', 'muslim'))).toBe('/topics?topic=ঈমান&book=muslim');
    expect(topicHref('ঈমান', 0, 'asc', 'all')).toBe(topicHref('ঈমান'));
    expect(topicHref('', 0, 'asc', 'muslim')).toBe('/topics');
  });
});
