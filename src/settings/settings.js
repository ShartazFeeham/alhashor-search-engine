import { readWithLegacy } from '../lib/legacyStorage';

export const STORAGE_KEY = 'alhashor.settings';
export const LEGACY_KEY = 'boikotha.settings'; // the key before the site was renamed; read once, then copied

export const DEFAULT_SETTINGS = { theme: 'auto', size: 16, lineHeight: 1.9, digits: 'bn' };

// What the settings page offers: the text size in px (whole steps), the line gap as a multiple of
// the text size. The reading column width is not a setting; it is a fixed value in tokens.css.
export const LIMITS = {
  size: { min: 3, max: 30, step: 1 },
  lineHeight: { min: 0.5, max: 2.5, step: 0.1 },
};

const THEMES = ['auto', 'light', 'dark', 'sepia'];
const DIGITS = ['bn', 'en'];

function number(value, fallback, min, max) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(Math.max(n, min), max);
}

// Only the known fields are kept, so a field saved by an older version (the text width) is dropped.
export function clampSettings(partial = {}) {
  const d = DEFAULT_SETTINGS;
  return {
    theme: THEMES.includes(partial.theme) ? partial.theme : d.theme,
    size: number(partial.size ?? d.size, d.size, LIMITS.size.min, LIMITS.size.max),
    lineHeight: number(partial.lineHeight ?? d.lineHeight, d.lineHeight, LIMITS.lineHeight.min, LIMITS.lineHeight.max),
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
    const raw = readWithLegacy(storage, STORAGE_KEY, LEGACY_KEY);
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
}
