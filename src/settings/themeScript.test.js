import { clampSettings } from './settings';
import { themeScript } from './themeScript';

const root = document.documentElement;
const run = () => new Function(themeScript)();

beforeEach(() => {
  localStorage.clear();
  root.removeAttribute('data-theme');
  root.removeAttribute('style');
});

test('the inline script sets the reading size, line gap and width before first paint', () => {
  localStorage.setItem('boikotha.settings', JSON.stringify({ theme: 'sepia', size: 22, lineHeight: 2.1, width: 40 }));
  run();
  expect(root.getAttribute('data-theme')).toBe('sepia');
  expect(root.style.getPropertyValue('--rs')).toBe('22px');
  expect(root.style.getPropertyValue('--rlh')).toBe('2.1');
  expect(root.style.getPropertyValue('--rw')).toBe('40em');
});

test('with nothing saved the script sets nothing, so the stylesheet defaults stay', () => {
  run();
  expect(root.hasAttribute('data-theme')).toBe(false);
  expect(root.style.getPropertyValue('--rs')).toBe('');
  expect(root.style.getPropertyValue('--rlh')).toBe('');
  expect(root.style.getPropertyValue('--rw')).toBe('');
});

test.each([
  { size: 99, lineHeight: 9, width: 99 },
  { size: 1, lineHeight: 0.2, width: 3 },
  { size: '20', lineHeight: '1.6', width: '30' },
  { size: 'big', lineHeight: null, width: undefined },
])('the script clamps %j exactly as the settings code does', (saved) => {
  localStorage.setItem('boikotha.settings', JSON.stringify(saved));
  run();
  const clamped = clampSettings(saved);
  const get = (name) => root.style.getPropertyValue(name);
  // A value that is not a number is left to the stylesheet, which holds the same defaults.
  expect(get('--rs') || '18px').toBe(`${clamped.size}px`);
  expect(get('--rlh') || '1.9').toBe(String(clamped.lineHeight));
  expect(get('--rw') || '34em').toBe(`${clamped.width}em`);
});

test('unreadable saved text does not throw and changes nothing', () => {
  localStorage.setItem('boikotha.settings', '{not json');
  expect(run).not.toThrow();
  expect(root.style.getPropertyValue('--rs')).toBe('');
  localStorage.setItem('boikotha.settings', 'null');
  expect(run).not.toThrow();
});

test('blocked storage does not throw (reading localStorage itself throws)', () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw new DOMException('blocked', 'SecurityError'); } });
  try {
    expect(run).not.toThrow();
    expect(root.hasAttribute('data-theme')).toBe(false);
    expect(root.style.getPropertyValue('--rs')).toBe('');
  } finally {
    Object.defineProperty(globalThis, 'localStorage', original);
  }
});

test('the theme is applied even when the reading numbers are unusable', () => {
  localStorage.setItem('boikotha.settings', JSON.stringify({ theme: 'dark', size: 'x' }));
  run();
  expect(root.getAttribute('data-theme')).toBe('dark');
});
