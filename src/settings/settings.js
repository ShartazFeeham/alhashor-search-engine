export const STORAGE_KEY = 'boikotha.settings';

export const DEFAULT_SETTINGS = { theme: 'auto', size: 16, lineHeight: 1.9, width: 34, digits: 'bn' };

const THEMES = ['auto', 'light', 'dark', 'sepia'];
const DIGITS = ['bn', 'en'];

function number(value, fallback, min, max) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(Math.max(n, min), max);
}

export function clampSettings(partial = {}) {
  const d = DEFAULT_SETTINGS;
  return {
    theme: THEMES.includes(partial.theme) ? partial.theme : d.theme,
    size: number(partial.size ?? d.size, d.size, 14, 28),
    lineHeight: number(partial.lineHeight ?? d.lineHeight, d.lineHeight, 1.5, 2.4),
    width: number(partial.width ?? d.width, d.width, 26, 46),
    digits: DIGITS.includes(partial.digits) ? partial.digits : d.digits,
  };
}

// Merely reading window.localStorage throws when the visitor blocks site data, so it is read here.
function defaultStorage() {
  try {
    return globalThis.localStorage;
  } catch {
    return null;
  }
}

export function loadSettings(storage = defaultStorage()) {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    return raw ? clampSettings(JSON.parse(raw)) : { ...DEFAULT_SETTINGS };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings, storage = defaultStorage()) {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Storage can be blocked (private mode); settings then last only for this visit.
  }
}

export function applySettings(settings, root = document.documentElement) {
  if (settings.theme === 'auto') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', settings.theme);
  root.style.setProperty('--rs', `${settings.size}px`);
  root.style.setProperty('--rlh', String(settings.lineHeight));
  root.style.setProperty('--rw', `${settings.width}em`);
}
