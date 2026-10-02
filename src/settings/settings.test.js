import { DEFAULT_SETTINGS, LIMITS, LEGACY_KEY, STORAGE_KEY, applySettings, clampSettings, loadSettings, saveSettings } from './settings';

function memoryStorage(initial = {}) {
  const data = { ...initial };
  return {
    getItem: (key) => (key in data ? data[key] : null),
    setItem: (key, value) => { data[key] = String(value); },
    data,
  };
}

test('defaults are the comfortable reading values', () => {
  expect(DEFAULT_SETTINGS).toEqual({ theme: 'auto', size: 16, lineHeight: 1.9, digits: 'bn' });
});

test('the ranges are 3 to 30 px in steps of 1, and 0.5 to 2.5 in steps of 0.1', () => {
  expect(LIMITS.size).toEqual({ min: 3, max: 30, step: 1 });
  expect(LIMITS.lineHeight).toEqual({ min: 0.5, max: 2.5, step: 0.1 });
});

test('there is no text width setting any more', () => {
  expect(DEFAULT_SETTINGS).not.toHaveProperty('width');
  expect(clampSettings({ width: 40 })).not.toHaveProperty('width');
});

test('clampSettings keeps every value in range and falls back for bad input', () => {
  expect(clampSettings({ size: 99, lineHeight: 0, theme: 'neon', digits: 'xx' })).toEqual({
    theme: 'auto', size: 30, lineHeight: 0.5, digits: 'bn',
  });
  expect(clampSettings({ size: 0, lineHeight: 9 })).toMatchObject({ size: 3, lineHeight: 2.5 });
  for (const size of [3, 4, 11, 16, 29, 30]) expect(clampSettings({ size }).size).toBe(size);
  for (const lineHeight of [0.5, 0.6, 1.5, 1.9, 2.4, 2.5]) expect(clampSettings({ lineHeight }).lineHeight).toBe(lineHeight);
  expect(clampSettings({ size: 'abc' }).size).toBe(16);
  expect(clampSettings({ theme: 'dark', digits: 'en', size: 22 })).toMatchObject({ theme: 'dark', digits: 'en', size: 22 });
});

test('values valid in the old ranges (14 to 28, 1.5 to 2.4) stay exactly as they are', () => {
  for (const size of [14, 16, 18, 20, 22, 24, 26, 28]) expect(clampSettings({ size }).size).toBe(size);
  for (const lineHeight of [1.5, 1.6, 1.9, 2, 2.4]) expect(clampSettings({ lineHeight }).lineHeight).toBe(lineHeight);
});

test('a stale saved width is ignored: no crash, and it is not written back', () => {
  const storage = memoryStorage({ 'alhashor.settings': JSON.stringify({ theme: 'dark', size: 20, width: 40 }) });
  const loaded = loadSettings(storage);
  expect(loaded).toEqual({ theme: 'dark', size: 20, lineHeight: 1.9, digits: 'bn' });
  expect(JSON.parse(storage.data['alhashor.settings'])).toHaveProperty('width', 40); // loading never writes
  saveSettings(loaded, storage);
  expect(JSON.parse(storage.data['alhashor.settings'])).not.toHaveProperty('width');
});

test('saved settings come back', () => {
  const storage = memoryStorage();
  saveSettings({ ...DEFAULT_SETTINGS, theme: 'sepia', size: 22 }, storage);
  expect(loadSettings(storage)).toMatchObject({ theme: 'sepia', size: 22 });
});

test('nothing saved, garbage saved or a broken storage all give the defaults', () => {
  expect(loadSettings(memoryStorage())).toEqual(DEFAULT_SETTINGS);
  expect(loadSettings(memoryStorage({ 'alhashor.settings': '{not json' }))).toEqual(DEFAULT_SETTINGS);
  const broken = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } };
  expect(loadSettings(broken)).toEqual(DEFAULT_SETTINGS);
  expect(() => saveSettings(DEFAULT_SETTINGS, broken)).not.toThrow();
});

test('applySettings sets the theme and the reading variables', () => {
  const root = document.createElement('html');
  applySettings({ ...DEFAULT_SETTINGS, theme: 'dark', size: 22, lineHeight: 2 }, root);
  expect(root.getAttribute('data-theme')).toBe('dark');
  expect(root.style.getPropertyValue('--rs')).toBe('22px');
  expect(root.style.getPropertyValue('--rlh')).toBe('2');
  expect(root.style.getPropertyValue('--rw')).toBe(''); // the reading width is fixed in the stylesheet
  applySettings({ ...DEFAULT_SETTINGS, theme: 'auto' }, root);
  expect(root.hasAttribute('data-theme')).toBe(false);
});

test('storage that throws the moment it is read (site data blocked) does not break loading or saving', () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw new DOMException('blocked', 'SecurityError'); } });
  try {
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
    expect(() => saveSettings(DEFAULT_SETTINGS)).not.toThrow();
  } finally {
    Object.defineProperty(globalThis, 'localStorage', original);
  }
});

describe('settings saved under the old site name (boikotha.settings)', () => {
  test('the keys are the new and the old name', () => {
    expect(STORAGE_KEY).toBe('alhashor.settings');
    expect(LEGACY_KEY).toBe('boikotha.settings');
  });

  test('only the old key present: the settings are read and copied to the new key', () => {
    const storage = memoryStorage({ 'boikotha.settings': JSON.stringify({ theme: 'dark', size: 22 }) });
    expect(loadSettings(storage)).toMatchObject({ theme: 'dark', size: 22 });
    expect(JSON.parse(storage.data['alhashor.settings'])).toMatchObject({ theme: 'dark', size: 22 });
    expect(storage.data['boikotha.settings']).toBeDefined();
  });

  test('only the new key present', () => {
    const storage = memoryStorage({ 'alhashor.settings': JSON.stringify({ theme: 'sepia' }) });
    expect(loadSettings(storage).theme).toBe('sepia');
    expect(storage.data['boikotha.settings']).toBeUndefined();
  });

  test('both present: the new key wins', () => {
    const storage = memoryStorage({
      'alhashor.settings': JSON.stringify({ theme: 'sepia' }),
      'boikotha.settings': JSON.stringify({ theme: 'dark' }),
    });
    expect(loadSettings(storage).theme).toBe('sepia');
    expect(JSON.parse(storage.data['alhashor.settings']).theme).toBe('sepia');
  });

  test('blocked storage still gives the defaults', () => {
    const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw new DOMException('blocked', 'SecurityError'); } });
    try {
      expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
    } finally {
      Object.defineProperty(globalThis, 'localStorage', original);
    }
  });

  test('saving writes only the new key', () => {
    const storage = memoryStorage();
    saveSettings({ ...DEFAULT_SETTINGS, theme: 'dark' }, storage);
    expect(Object.keys(storage.data)).toEqual(['alhashor.settings']);
  });
});
