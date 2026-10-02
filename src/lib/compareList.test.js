import {
  LEGACY_KEY,
  MAX_COMPARE,
  STORAGE_KEY,
  addId,
  compareHref,
  idFromTag,
  idOf,
  loadSelection,
  parseIds,
  removeId,
  saveSelection,
  serializeIds,
  splitId,
  tagFromId,
  toggleId,
} from './compareList';

describe('ids', () => {
  test('an id is the book id, a dash and the plain number', () => {
    expect(idOf('bukhari', 1234)).toBe('bukhari-1234');
  });

  test('splitId gives the book and number, or null for anything that is not a real hadis', () => {
    expect(splitId('muslim-5')).toMatchObject({ book: { id: 'muslim' }, number: 5 });
    expect(splitId('nobook-5')).toBeNull();
    expect(splitId('muslim-0')).toBeNull();
    expect(splitId('muslim-99999')).toBeNull();
    expect(splitId('bukhari-63')).toBeNull(); // Bukhari 63 has no file
    expect(splitId('muslim-05')).toBeNull();
    expect(splitId('')).toBeNull();
    expect(splitId(undefined)).toBeNull();
  });

  test('ids and tags convert both ways (tags are what the hadis text loader takes)', () => {
    expect(tagFromId('bukhari-1234')).toBe('BUK-1234');
    expect(idFromTag('MUS-5')).toBe('muslim-5');
    expect(idFromTag('nonsense')).toBeNull();
    expect(tagFromId('bukhari-63')).toBeNull();
  });
});

describe('parseIds and serializeIds', () => {
  test('read a comma list from the address', () => {
    expect(parseIds('bukhari-1234,muslim-5')).toEqual(['bukhari-1234', 'muslim-5']);
  });

  test('drop invalid ids, gaps and repeats, and ignore spaces', () => {
    expect(parseIds(' bukhari-1 , x-1,muslim-5,bukhari-1,bukhari-63,,muslim-0 ')).toEqual(['bukhari-1', 'muslim-5']);
  });

  test('keep at most four', () => {
    const text = 'bukhari-1,bukhari-2,bukhari-3,bukhari-4,bukhari-5,bukhari-6';
    expect(parseIds(text)).toEqual(['bukhari-1', 'bukhari-2', 'bukhari-3', 'bukhari-4']);
    expect(MAX_COMPARE).toBe(4);
  });

  test('nothing in, nothing out', () => {
    expect(parseIds(null)).toEqual([]);
    expect(parseIds('')).toEqual([]);
    expect(parseIds(undefined)).toEqual([]);
  });

  test('serialise round-trips', () => {
    expect(serializeIds(['bukhari-1234', 'muslim-5'])).toBe('bukhari-1234,muslim-5');
    expect(parseIds(serializeIds(['tirmidhi-9', 'nasai-3']))).toEqual(['tirmidhi-9', 'nasai-3']);
    expect(serializeIds([])).toBe('');
  });

  test('compareHref is /compare, with the ids when there are some, and the chain switch when asked', () => {
    expect(compareHref([])).toBe('/compare');
    expect(compareHref(['bukhari-1', 'muslim-5'])).toBe('/compare?ids=bukhari-1,muslim-5');
    expect(compareHref(['bukhari-1'], { chain: true })).toBe('/compare?ids=bukhari-1&chain=1');
    expect(compareHref([], { chain: true })).toBe('/compare?chain=1');
  });
});

describe('addId, removeId, toggleId', () => {
  test('add appends a valid id', () => {
    expect(addId(['muslim-5'], 'bukhari-1')).toEqual({ ids: ['muslim-5', 'bukhari-1'], status: 'added' });
  });

  test('add refuses repeats, invalid ids, and a fifth', () => {
    const four = ['bukhari-1', 'bukhari-2', 'bukhari-3', 'bukhari-4'];
    expect(addId(['muslim-5'], 'muslim-5')).toEqual({ ids: ['muslim-5'], status: 'duplicate' });
    expect(addId(['muslim-5'], 'bukhari-63')).toEqual({ ids: ['muslim-5'], status: 'invalid' });
    const full = addId(four, 'muslim-5');
    expect(full.status).toBe('full');
    expect(full.ids).toBe(four);
  });

  test('remove drops one id and leaves the order of the rest', () => {
    expect(removeId(['a-1', 'muslim-5', 'bukhari-1'], 'muslim-5')).toEqual(['a-1', 'bukhari-1']);
    expect(removeId(['muslim-5'], 'bukhari-1')).toEqual(['muslim-5']);
  });

  test('toggle adds, then removes, and reports which', () => {
    const added = toggleId([], 'bukhari-1');
    expect(added).toEqual({ ids: ['bukhari-1'], status: 'added' });
    expect(toggleId(added.ids, 'bukhari-1')).toEqual({ ids: [], status: 'removed' });
  });

  test('toggle on a full list removes a chosen one but will not add a fifth', () => {
    const four = ['bukhari-1', 'bukhari-2', 'bukhari-3', 'bukhari-4'];
    expect(toggleId(four, 'muslim-5').status).toBe('full');
    expect(toggleId(four, 'bukhari-2')).toEqual({ ids: ['bukhari-1', 'bukhari-3', 'bukhari-4'], status: 'removed' });
  });
});

describe('the selection kept for this visit (sessionStorage)', () => {
  const makeStorage = () => {
    const data = new Map();
    return { getItem: (k) => (data.has(k) ? data.get(k) : null), setItem: (k, v) => data.set(k, v), data };
  };

  test('saves and loads the list', () => {
    const storage = makeStorage();
    saveSelection(['bukhari-1', 'muslim-5'], storage);
    expect(storage.data.get(STORAGE_KEY)).toBe('bukhari-1,muslim-5');
    expect(loadSelection(storage)).toEqual(['bukhari-1', 'muslim-5']);
  });

  test('cleans whatever was stored', () => {
    const storage = makeStorage();
    storage.setItem(STORAGE_KEY, 'bukhari-1,junk,bukhari-1,muslim-5');
    expect(loadSelection(storage)).toEqual(['bukhari-1', 'muslim-5']);
  });

  test('storage that throws never breaks anything', () => {
    const blocked = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    };
    expect(loadSelection(blocked)).toEqual([]);
    expect(() => saveSelection(['bukhari-1'], blocked)).not.toThrow();
    expect(loadSelection(null)).toEqual([]);
    expect(() => saveSelection(['bukhari-1'], null)).not.toThrow();
  });
});

describe('the selection saved under the old site name', () => {
  const makeStorage = (initial = {}) => {
    const data = new Map(Object.entries(initial));
    return { getItem: (k) => (data.has(k) ? data.get(k) : null), setItem: (k, v) => data.set(k, v), data };
  };

  test('the keys are the new and the old name', () => {
    expect(STORAGE_KEY).toBe('alhashor.compare');
    expect(LEGACY_KEY).toBe('boikotha.compare');
  });

  test('only the old key present: the list is read and copied to the new key', () => {
    const storage = makeStorage({ 'boikotha.compare': 'bukhari-1,muslim-5' });
    expect(loadSelection(storage)).toEqual(['bukhari-1', 'muslim-5']);
    expect(storage.data.get('alhashor.compare')).toBe('bukhari-1,muslim-5');
  });

  test('only the new key present', () => {
    const storage = makeStorage({ 'alhashor.compare': 'muslim-5' });
    expect(loadSelection(storage)).toEqual(['muslim-5']);
    expect(storage.data.has('boikotha.compare')).toBe(false);
  });

  test('both present: the new key wins, even when it is an emptied list', () => {
    expect(loadSelection(makeStorage({ 'alhashor.compare': 'muslim-5', 'boikotha.compare': 'bukhari-1' }))).toEqual(['muslim-5']);
    expect(loadSelection(makeStorage({ 'alhashor.compare': '', 'boikotha.compare': 'bukhari-1' }))).toEqual([]);
  });
});
