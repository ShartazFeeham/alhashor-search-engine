
export const STORAGE_KEY = 'alhashor.settings';

// Light is the default for every visitor. 'auto' (follow the device) is an explicit choice, and a
// value saved with it before still follows the device.
export const DEFAULT_SETTINGS = { theme: 'light', size: 16, lineHeight: 1.9, digits: 'bn' };

// What the settings page offers: the text size in px (whole steps), the line gap as a multiple of
// the text size. The reading column width is not a setting; it is a fixed value in tokens.css.
export const LIMITS = {
  size: { min: 3, max: 30, step: 1 },
  lineHeight: { min: 0.5, max: 2.5, step: 0.1 },
};

const THEMES = ['auto', 'light', 'dark', 'sepia'];

// The page colour (--bg) of each theme, for the browser bar (theme-color meta). themeScript.js repeats these.
export const THEME_COLORS = { light: '#f2f8f6', dark: '#0c1714', sepia: '#f4ead3' };

function barColor(theme) {
  if (theme === 'auto') {
    const dark = typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches;
    return dark ? THEME_COLORS.dark : THEME_COLORS.light;
  }
  return THEME_COLORS[theme] ?? THEME_COLORS.light;
}
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
  for (const meta of root.ownerDocument.querySelectorAll('meta[name="theme-color"]')) {
    meta.removeAttribute('media');
    meta.setAttribute('content', barColor(settings.theme));
  }
  root.style.setProperty('--rs', `${settings.size}px`);
  root.style.setProperty('--rlh', String(settings.lineHeight));
}
