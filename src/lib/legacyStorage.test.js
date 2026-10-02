import { readWithLegacy } from './legacyStorage';

const makeStorage = (initial = {}) => {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => data.set(key, String(value)),
    data,
  };
};

describe('readWithLegacy (a value saved under the old name still counts)', () => {
  test('only the old key present: the value is read and copied to the new key, the old key stays', () => {
    const storage = makeStorage({ 'boikotha.x': 'saved' });
    expect(readWithLegacy(storage, 'alhashor.x', 'boikotha.x')).toBe('saved');
    expect(storage.data.get('alhashor.x')).toBe('saved');
    expect(storage.data.get('boikotha.x')).toBe('saved');
  });

  test('only the new key present: it is read and nothing else is written', () => {
    const storage = makeStorage({ 'alhashor.x': 'new' });
    expect(readWithLegacy(storage, 'alhashor.x', 'boikotha.x')).toBe('new');
    expect([...storage.data.keys()]).toEqual(['alhashor.x']);
  });

  test('both present: the new key wins and is not overwritten', () => {
    const storage = makeStorage({ 'alhashor.x': 'new', 'boikotha.x': 'old' });
    expect(readWithLegacy(storage, 'alhashor.x', 'boikotha.x')).toBe('new');
    expect(storage.data.get('alhashor.x')).toBe('new');
  });

  test('an empty value under the new key still wins over the old key', () => {
    const storage = makeStorage({ 'alhashor.x': '', 'boikotha.x': 'old' });
    expect(readWithLegacy(storage, 'alhashor.x', 'boikotha.x')).toBe('');
  });

  test('neither present gives null', () => {
    expect(readWithLegacy(makeStorage(), 'alhashor.x', 'boikotha.x')).toBeNull();
  });

  test('a write that fails (full or blocked) still returns the old value', () => {
    const storage = makeStorage({ 'boikotha.x': 'saved' });
    storage.setItem = () => { throw new DOMException('full', 'QuotaExceededError'); };
    expect(readWithLegacy(storage, 'alhashor.x', 'boikotha.x')).toBe('saved');
  });

  test('blocked storage throws from the read, as before, for the caller to handle', () => {
    const blocked = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } };
    expect(() => readWithLegacy(blocked, 'alhashor.x', 'boikotha.x')).toThrow('blocked');
    expect(() => readWithLegacy(null, 'alhashor.x', 'boikotha.x')).toThrow();
  });
});
