import { DEFAULT_SETTINGS, applySettings, clampSettings, loadSettings, saveSettings } from './settings';

function memoryStorage(initial = {}) {
  const data = { ...initial };
  return {
    getItem: (key) => (key in data ? data[key] : null),
    setItem: (key, value) => { data[key] = String(value); },
    data,
  };
}

test('defaults are the comfortable reading values', () => {
  expect(DEFAULT_SETTINGS).toEqual({ theme: 'auto', size: 16, lineHeight: 1.9, width: 34, digits: 'bn' });
});

test('clampSettings keeps every value in range and falls back for bad input', () => {
  expect(clampSettings({ size: 99, lineHeight: 0, width: 5, theme: 'neon', digits: 'xx' })).toEqual({
    theme: 'auto', size: 28, lineHeight: 1.5, width: 26, digits: 'bn',
  });
  expect(clampSettings({ size: 'abc' }).size).toBe(16);
  expect(clampSettings({ theme: 'dark', digits: 'en', size: 22 })).toMatchObject({ theme: 'dark', digits: 'en', size: 22 });
});

test('saved settings come back', () => {
  const storage = memoryStorage();
  saveSettings({ ...DEFAULT_SETTINGS, theme: 'sepia', size: 22 }, storage);
  expect(loadSettings(storage)).toMatchObject({ theme: 'sepia', size: 22 });
});

test('nothing saved, garbage saved or a broken storage all give the defaults', () => {
  expect(loadSettings(memoryStorage())).toEqual(DEFAULT_SETTINGS);
  expect(loadSettings(memoryStorage({ 'boikotha.settings': '{not json' }))).toEqual(DEFAULT_SETTINGS);
  const broken = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } };
  expect(loadSettings(broken)).toEqual(DEFAULT_SETTINGS);
  expect(() => saveSettings(DEFAULT_SETTINGS, broken)).not.toThrow();
});

test('applySettings sets the theme and the reading variables', () => {
  const root = document.createElement('html');
  applySettings({ ...DEFAULT_SETTINGS, theme: 'dark', size: 22, lineHeight: 2, width: 40 }, root);
  expect(root.getAttribute('data-theme')).toBe('dark');
  expect(root.style.getPropertyValue('--rs')).toBe('22px');
  expect(root.style.getPropertyValue('--rlh')).toBe('2');
  expect(root.style.getPropertyValue('--rw')).toBe('40em');
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
