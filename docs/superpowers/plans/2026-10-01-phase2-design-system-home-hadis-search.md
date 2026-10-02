# Phase 2: Design System, Shell, Home, Hadis Page, Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the D2 design system, the new shell (top navigation, phone tab bar, footer), a redesigned Home, a brand-new hadis full page, and a redesigned Search with results, on top of the Next.js app from Phase 1.

**Architecture:** Design tokens are CSS variables (light, dark and sepia themes) loaded after the legacy stylesheets, and new components use new class names so the legacy Books and Topics pages keep working untouched until Phase 3. Pure logic (book data, tag and path helpers, narrator-chain splitting, snippets, typing helpers) lives in `src/lib/` and is test-first. Visual markup and CSS are ported from the D2 design file, with D5's calmer look on the hadis page and on the results list.

**Tech Stack:** Next.js 16 (App Router), React 19, Vitest + Testing Library, plain CSS with variables, `next/font/local` for self-hosted fonts, `@subhesadek/avro-phonetic` (MPL-2.0, zero dependencies) for Roman-letter typing.

**Spec:** [docs/redesign-plan.md](../../redesign-plan.md) (sections 1 to 4, 6, 11, 12) and the designs [docs/design/d2-modern-app.html](../../design/d2-modern-app.html) (blueprint) and [docs/design/d5-quiet-minimal.html](../../design/d5-quiet-minimal.html).

## Global Constraints

- **Self-contained:** no database, no outside services, no CDN fonts or scripts. Fonts are files in the repo. The check `scripts/check-self-contained.sh` must stay green.
- **The designs are a blueprint.** Port them faithfully, but fix anything that is not up to the mark, and add each departure to section 12 of `docs/redesign-plan.md`.
- **Production parts only:** no label pills, control bar, screen switcher, "নমুনা" notes or sample chips from the prototypes.
- **Real data only:** counts, numbers and neighbours come from the data. Sample texts in tests are real texts from `public/json/hadis`.
- **All visible text is Bengali** (brand `Alhashor` excepted). Bengali digits by default, with a setting for English digits.
- **Existing features keep working:** search by URL state (`q`, `page`), keyboard access, page titles, not-found page, copy, back-to-top. Books and Topics pages keep working with their legacy styles in the new shell.
- **Legacy stays until Phase 3:** Bootstrap and the legacy component stylesheets remain in `src/app/layout.jsx` for Books and Topics. New styles load after them.
- **Node >=20.9, React 19, Next 16.** Client Components only, except the hadis route's page file (a small Server Component that validates the address).
- **Local only:** work on a branch named `phase2/design-system`. No push, no deploy.
- **Tests:** Vitest globals; test first, watch it fail, then implement. Every task ends with `npx vitest run`, `npm run lint` and `npm run build` green.

## Review Focus

1. **A hadis address with a number that is out of range, not a number, or a wrong book** (`/hadis/bukhari/0`, `/hadis/bukhari/99999`, `/hadis/bukhari/abc`, `/hadis/nobook/1`) must be a real 404, not a crash. [Task 10]
2. **A hadis number inside the range but without a data file** (for example Bukhari 63) must show a clear "not found" message with working previous and next links, not a spinner. [Tasks 7 and 10]
3. **A hadis whose text has no recognisable narrator chain** must show its full text, with no folded block and no lost words. [Task 6]
4. **A search word spelled with the other form of a letter, or with an invisible joiner**, must still be highlighted and must still produce a snippet. [Task 11]
5. **First paint must not flash the wrong theme**: a visitor with a saved dark theme must not see a light flash before the page hydrates. [Task 3]

---

## File Structure

| File | Responsibility |
|---|---|
| `public/fonts/*.ttf`, `src/fonts.js` | Self-hosted fonts and their CSS variables |
| `src/styles/tokens.css`, `base.css`, `ui.css` | Design tokens and themes, base elements, component styles (new classes only) |
| `src/settings/settings.js`, `SettingsProvider.jsx` | Theme and reading settings, saved on the device |
| `src/lib/books.js` | The six books: ids, codes, names, colours, counts, gaps |
| `src/lib/hadisRoute.js` | Tag, address and neighbour helpers |
| `src/lib/digits.js` | Bengali and English digit helpers |
| `src/lib/hadisText.js` | Narrator-chain splitting, reading time |
| `src/lib/useHadisText.js` | Loads one hadis text with a cache and a clear status |
| `src/lib/matchPattern.js` | Spelling-tolerant matcher, snippets, highlight parts |
| `src/lib/roman.js` | Roman-letter typing suggestions |
| `src/lib/searchResults.js` | Per-book counts and filtering of result tags |
| `src/ui/*.jsx` | Shared pieces: `Icon`, `Button`, `Chip`, `BookBadge`, `Toast` |
| `src/shell/*.jsx` | `TopNav`, `TabBar`, `Footer`, `BackToTop` (restyled) |
| `src/home/Home.jsx` (replaces `src/Home/*`) | Redesigned Home |
| `src/hadis/*.jsx` | Hadis full page pieces |
| `src/app/hadis/[book]/[number]/page.jsx` | The hadis route |
| `src/search/*.jsx` (replaces `src/Search/Search.jsx`, `Suggestions.jsx`) | Redesigned search |

---

### Task 1: Self-hosted fonts

**Files:**
- Create: `public/fonts/` (font files), `src/fonts.js`, `src/fonts.test.js`
- Modify: `src/app/layout.jsx`

**Interfaces:**
- Produces: `src/fonts.js` exports `uiFont`, `readFont`, `latinFont`, each a `next/font/local` result with a `.variable` class name. `layout.jsx` puts all three `.variable` classes on `<html>`, which defines `--f-ui`, `--f-read` and `--f-lat`.

- [ ] **Step 1: Download the three open-licence families into the repo**

Fonts come from the Google Fonts repository (SIL Open Font License) and are committed as files, so the running site never contacts Google:

```bash
mkdir -p public/fonts && cd public/fonts
B=https://github.com/google/fonts/raw/main/ofl
curl -sSL -o HindSiliguri-Regular.ttf  "$B/hindsiliguri/HindSiliguri-Regular.ttf"
curl -sSL -o HindSiliguri-Medium.ttf   "$B/hindsiliguri/HindSiliguri-Medium.ttf"
curl -sSL -o HindSiliguri-SemiBold.ttf "$B/hindsiliguri/HindSiliguri-SemiBold.ttf"
curl -sSL -o HindSiliguri-Bold.ttf     "$B/hindsiliguri/HindSiliguri-Bold.ttf"
curl -sSL -o NotoSerifBengali.ttf      "$B/notoserifbengali/NotoSerifBengali%5Bwdth%2Cwght%5D.ttf"
curl -sSL -o PlusJakartaSans.ttf       "$B/plusjakartasans/PlusJakartaSans%5Bwght%5D.ttf"
curl -sSL -o OFL.txt                   "$B/hindsiliguri/OFL.txt"
ls -la && file *.ttf
cd ../..
```

Expected: six `.ttf` files (each a real TrueType font, tens to hundreds of KB) and `OFL.txt`. If a download returns an HTML error page (`file` says "HTML"), find the current path in the `google/fonts` repo under `ofl/` and fix the URL.

- [ ] **Step 2: Write the failing test**

`src/fonts.test.js`:

```js
import { existsSync } from 'node:fs';
import path from 'node:path';

const fontFiles = [
  'HindSiliguri-Regular.ttf',
  'HindSiliguri-Medium.ttf',
  'HindSiliguri-SemiBold.ttf',
  'HindSiliguri-Bold.ttf',
  'NotoSerifBengali.ttf',
  'PlusJakartaSans.ttf',
];

test.each(fontFiles)('the font file %s is in the repository', (file) => {
  expect(existsSync(path.resolve(process.cwd(), 'public/fonts', file))).toBe(true);
});

test('the fonts module names the three CSS variables', async () => {
  vi.doMock('next/font/local', () => ({
    default: (options) => ({ variable: options.variable, className: 'c' }),
  }));
  const { uiFont, readFont, latinFont } = await import('./fonts.js');
  expect(uiFont.variable).toBe('--f-ui');
  expect(readFont.variable).toBe('--f-read');
  expect(latinFont.variable).toBe('--f-lat');
});
```

- [ ] **Step 3: Run it to verify it fails**

Run: `npx vitest run src/fonts.test.js`
Expected: the file checks pass (Step 1 created them) and the `fonts.js` test FAILs (`Failed to resolve import "./fonts.js"`).

- [ ] **Step 4: Implement**

`src/fonts.js`:

```js
import localFont from 'next/font/local';

// Fonts are files in public/fonts (SIL Open Font License), not loaded from any outside server.
export const uiFont = localFont({
  src: [
    { path: '../public/fonts/HindSiliguri-Regular.ttf', weight: '400' },
    { path: '../public/fonts/HindSiliguri-Medium.ttf', weight: '500' },
    { path: '../public/fonts/HindSiliguri-SemiBold.ttf', weight: '600' },
    { path: '../public/fonts/HindSiliguri-Bold.ttf', weight: '700' },
  ],
  variable: '--f-ui',
  display: 'swap',
});

export const readFont = localFont({
  src: '../public/fonts/NotoSerifBengali.ttf',
  variable: '--f-read',
  display: 'swap',
});

export const latinFont = localFont({
  src: '../public/fonts/PlusJakartaSans.ttf',
  variable: '--f-lat',
  display: 'swap',
});
```

In `src/app/layout.jsx` add `import { uiFont, readFont, latinFont } from '../fonts';` and change the `<html>` line to:

```jsx
    <html lang="bn" className={`${uiFont.variable} ${readFont.variable} ${latinFont.variable}`}>
```

Also change the layout test in `src/app/pages.test.jsx` so the `next/font/local` module works in tests: add at the top of the file `vi.mock('next/font/local', () => ({ default: (options) => ({ variable: options.variable, className: '' }) }));` (hoisted by Vitest).

- [ ] **Step 5: Verify**

Run: `npx vitest run && npm run lint && npm run build`
Expected: all pass, and the build output lists font files under `.next/static/media`. Then run the self-contained check: `scripts/with-server.sh 5056 "npx next start -p 5056" scripts/check-self-contained.sh http://localhost:5056` (Expected: four `ok` lines, exit 0, which proves the fonts do not come from another host).

- [ ] **Step 6: Commit**

```bash
git add public/fonts src/fonts.js src/fonts.test.js src/app/layout.jsx src/app/pages.test.jsx
git commit -m "feat: self-hosted fonts (Hind Siliguri, Noto Serif Bengali, Plus Jakarta Sans)"
```

---

### Task 2: Design tokens, themes and base styles

**Files:**
- Create: `src/styles/tokens.css`, `src/styles/base.css`, `src/styles/tokens.test.js`
- Modify: `src/app/layout.jsx`, `src/app/pages.test.jsx` (the stylesheet-order test)

**Interfaces:**
- Produces: CSS variables on `:root` for the light theme, overridden by `:root[data-theme="dark"]` and `:root[data-theme="sepia"]`, and by `prefers-color-scheme: dark` when no `data-theme` is set. Variables: `--page --bg --surface --surface2 --line --ink --ink2 --ink3 --accent --accent2 --on-accent --accent-soft --hl --hl-ink --ok --warn --bad --link --bk-bukhari --bk-muslim --bk-tirmidhi --bk-abudawud --bk-ibnmajah --bk-nasai --on-bk --shadow`, and reading variables `--rs` (font size), `--rlh` (line height), `--rw` (text width). The values are taken from D2 lines 20 to 52.

- [ ] **Step 1: Write the failing test**

`src/styles/tokens.test.js`:

```js
import { readFileSync } from 'node:fs';
import path from 'node:path';

const css = readFileSync(path.resolve(process.cwd(), 'src/styles/tokens.css'), 'utf8');

const required = [
  '--page', '--bg', '--surface', '--surface2', '--line', '--ink', '--ink2', '--ink3',
  '--accent', '--accent2', '--on-accent', '--accent-soft', '--hl', '--hl-ink',
  '--ok', '--warn', '--bad', '--link',
  '--bk-bukhari', '--bk-muslim', '--bk-tirmidhi', '--bk-abudawud', '--bk-ibnmajah', '--bk-nasai', '--on-bk',
  '--shadow', '--rs', '--rlh', '--rw',
];

test.each(required)('the light theme defines %s', (name) => {
  const light = css.slice(0, css.indexOf(':root[data-theme="dark"]'));
  expect(light).toMatch(new RegExp(`${name}\\s*:`));
});

test('dark and sepia redefine the colour variables', () => {
  for (const theme of ['dark', 'sepia']) {
    const block = css.slice(css.indexOf(`:root[data-theme="${theme}"]`));
    for (const name of ['--bg', '--surface', '--ink', '--accent']) {
      expect(block).toMatch(new RegExp(`${name}\\s*:`));
    }
  }
});

test('a visitor whose device prefers dark gets dark unless a theme is chosen', () => {
  expect(css).toContain('@media (prefers-color-scheme: dark)');
  expect(css).toContain(':root:not([data-theme])');
});

test('the six book colours match the design', () => {
  expect(css).toContain('--bk-bukhari:#0f8a66');
  expect(css).toContain('--bk-muslim:#3a63c8');
  expect(css).toContain('--bk-tirmidhi:#c08108');
  expect(css).toContain('--bk-abudawud:#8a4bb8');
  expect(css).toContain('--bk-ibnmajah:#d3582a');
  expect(css).toContain('--bk-nasai:#c3387f');
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/styles`
Expected: FAIL (file not found).

- [ ] **Step 3: Implement**

`src/styles/tokens.css`: copy the `:root{...}` block (D2 lines 20 to 34) for the light theme, then add the dark and sepia blocks. Use selectors `:root[data-theme="dark"]` and `:root[data-theme="sepia"]` (D2 calls the attribute `data-skin`; this app uses `data-theme`). Add a `@media (prefers-color-scheme: dark) { :root:not([data-theme]) { ...dark values... } }` block so a visitor without a saved choice follows the device. Write colour values without spaces after colons in the book-colour lines exactly as the test expects (`--bk-bukhari:#0f8a66`). Set the reading defaults in the light block: `--rs:18px; --rlh:1.9; --rw:34em;`. Font variables are defined by Task 1, not here.

`src/styles/base.css`: port D2 lines 100 to 107 ("base" rules: `box-sizing`, `body` colours, `button`/`input` inheritance, `:focus-visible` ring, `mark`, `a`) but scope the body font to `font-family: var(--f-ui)`. Because the legacy Bootstrap pages still exist, do not reset margins that legacy CSS depends on; limit `base.css` to: body background `var(--page)`, body text colour `var(--ink)`, `font-family: var(--f-ui), system-ui, sans-serif`, `:focus-visible` outline in `var(--accent)`, `mark` highlight, and `@media (prefers-reduced-motion: reduce)` that disables animation.

In `src/app/layout.jsx`, after the last legacy import add:

```jsx
import '../styles/tokens.css';
import '../styles/base.css';
```

Update the expected list in the stylesheet-order test in `src/app/pages.test.jsx` by appending `'../styles/tokens.css'` and `'../styles/base.css'`.

- [ ] **Step 4: Verify**

Run: `npx vitest run && npm run lint && npm run build`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/styles src/app/layout.jsx src/app/pages.test.jsx
git commit -m "feat: design tokens with light, dark and sepia themes"
```

---

### Task 3: Settings (theme and reading) with no flash on first paint

**Files:**
- Create: `src/settings/settings.js`, `src/settings/settings.test.js`, `src/settings/SettingsProvider.jsx`, `src/settings/SettingsProvider.test.jsx`, `src/settings/themeScript.js`
- Modify: `src/app/layout.jsx`

**Interfaces:**
- Produces in `settings.js`:
  - `DEFAULT_SETTINGS = { theme: 'auto', size: 18, lineHeight: 1.9, width: 34, digits: 'bn' }`
  - `clampSettings(partial): Settings` (keeps values inside `size 14..28`, `lineHeight 1.5..2.4`, `width 26..46`, `theme` in `auto|light|dark|sepia`, `digits` in `bn|en`)
  - `loadSettings(storage = localStorage): Settings` and `saveSettings(settings, storage = localStorage): void` (both safe if storage throws or holds garbage; key `alhashor.settings`)
  - `applySettings(settings, root = document.documentElement): void` (sets `data-theme` unless `auto`, removes it for `auto`, and sets `--rs`, `--rlh`, `--rw`)
- Produces in `SettingsProvider.jsx`: `SettingsProvider({ children })` and `useSettings(): { settings, update(partial), reset() }`.
- Produces in `themeScript.js`: `themeScript: string`, a tiny inline script that applies the saved theme before first paint.

- [ ] **Step 1: Write the failing tests**

`src/settings/settings.test.js`:

```js
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
  expect(DEFAULT_SETTINGS).toEqual({ theme: 'auto', size: 18, lineHeight: 1.9, width: 34, digits: 'bn' });
});

test('clampSettings keeps every value in range and falls back for bad input', () => {
  expect(clampSettings({ size: 99, lineHeight: 0, width: 5, theme: 'neon', digits: 'xx' })).toEqual({
    theme: 'auto', size: 28, lineHeight: 1.5, width: 26, digits: 'bn',
  });
  expect(clampSettings({ size: 'abc' }).size).toBe(18);
  expect(clampSettings({ theme: 'dark', digits: 'en', size: 22 })).toMatchObject({ theme: 'dark', digits: 'en', size: 22 });
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
  applySettings({ ...DEFAULT_SETTINGS, theme: 'dark', size: 22, lineHeight: 2, width: 40 }, root);
  expect(root.getAttribute('data-theme')).toBe('dark');
  expect(root.style.getPropertyValue('--rs')).toBe('22px');
  expect(root.style.getPropertyValue('--rlh')).toBe('2');
  expect(root.style.getPropertyValue('--rw')).toBe('40em');
  applySettings({ ...DEFAULT_SETTINGS, theme: 'auto' }, root);
  expect(root.hasAttribute('data-theme')).toBe(false);
});
```

`src/settings/SettingsProvider.test.jsx`:

```jsx
import { act, render, screen } from '@testing-library/react';
import { SettingsProvider, useSettings } from './SettingsProvider';

function Probe() {
  const { settings, update, reset } = useSettings();
  return (
    <div>
      <span data-testid="theme">{settings.theme}</span>
      <button onClick={() => update({ theme: 'dark' })}>dark</button>
      <button onClick={reset}>reset</button>
    </div>
  );
}

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
});

test('starts from the saved settings and applies them to the page', () => {
  localStorage.setItem('alhashor.settings', JSON.stringify({ theme: 'sepia' }));
  render(<SettingsProvider><Probe /></SettingsProvider>);
  expect(screen.getByTestId('theme')).toHaveTextContent('sepia');
  expect(document.documentElement.getAttribute('data-theme')).toBe('sepia');
});

test('an update is applied, saved and shared with every reader', () => {
  render(<SettingsProvider><Probe /></SettingsProvider>);
  act(() => screen.getByText('dark').click());
  expect(screen.getByTestId('theme')).toHaveTextContent('dark');
  expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  expect(JSON.parse(localStorage.getItem('alhashor.settings')).theme).toBe('dark');
});

test('reset goes back to the defaults', () => {
  render(<SettingsProvider><Probe /></SettingsProvider>);
  act(() => screen.getByText('dark').click());
  act(() => screen.getByText('reset').click());
  expect(screen.getByTestId('theme')).toHaveTextContent('auto');
  expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
});

test('the inline theme script applies a saved theme before first paint (Review Focus 5)', async () => {
  const { themeScript } = await import('./themeScript');
  localStorage.setItem('alhashor.settings', JSON.stringify({ theme: 'dark' }));
  new Function(themeScript)();
  expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run src/settings`
Expected: FAIL (modules missing).

- [ ] **Step 3: Implement**

`src/settings/settings.js`:

```js
export const STORAGE_KEY = 'alhashor.settings';

export const DEFAULT_SETTINGS = { theme: 'auto', size: 18, lineHeight: 1.9, width: 34, digits: 'bn' };

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

export function loadSettings(storage = globalThis.localStorage) {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    return raw ? clampSettings(JSON.parse(raw)) : { ...DEFAULT_SETTINGS };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings, storage = globalThis.localStorage) {
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
```

`src/settings/themeScript.js` (runs inline in `<head>` before first paint; it is part of the app, not an outside script):

```js
export const themeScript = `try{var s=JSON.parse(localStorage.getItem('alhashor.settings')||'{}');if(s.theme&&s.theme!=='auto'){document.documentElement.setAttribute('data-theme',s.theme)}}catch(e){}`;
```

`src/settings/SettingsProvider.jsx`:

```jsx
'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { DEFAULT_SETTINGS, applySettings, clampSettings, loadSettings, saveSettings } from './settings';

const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(() => (typeof window === 'undefined' ? DEFAULT_SETTINGS : loadSettings()));

  useEffect(() => {
    applySettings(settings);
  }, [settings]);

  const update = useCallback((partial) => {
    setSettings((current) => {
      const next = clampSettings({ ...current, ...partial });
      saveSettings(next);
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    saveSettings(DEFAULT_SETTINGS);
    setSettings({ ...DEFAULT_SETTINGS });
  }, []);

  const value = useMemo(() => ({ settings, update, reset }), [settings, update, reset]);
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const value = useContext(SettingsContext);
  if (!value) throw new Error('useSettings must be used inside SettingsProvider');
  return value;
}
```

In `src/app/layout.jsx`: import `SettingsProvider` and `themeScript`; inside `<html>` add `<head><script dangerouslySetInnerHTML={{ __html: themeScript }} /></head>` before `<body>`, and wrap the body contents (`NavBar`, `children`, `BackToTop`) in `<SettingsProvider>`. Add `suppressHydrationWarning` on `<html>` because the script changes its attributes before React hydrates.

- [ ] **Step 4: Verify**

Run: `npx vitest run && npm run lint && npm run build`
Expected: all pass. The layout test in `src/app/pages.test.jsx` still passes (the provider renders on the server with the defaults).

- [ ] **Step 5: Commit**

```bash
git add src/settings src/app/layout.jsx
git commit -m "feat: reading and theme settings, saved on the device, no flash on first paint"
```

---

### Task 4: Book data and address helpers

**Files:**
- Create: `src/lib/books.js`, `src/lib/books.test.js`, `src/lib/hadisRoute.js`, `src/lib/hadisRoute.test.js`
- Modify: `src/Books/bookList.js` (becomes a thin adapter)

**Interfaces:**
- Produces in `books.js`: `BOOKS` (array in display order) where each book is `{ id, code, folder, slug, name, full, cite, badge, legacyName, colorVar, total, missing }` (`slug === id`), `bookById(id)`, `bookByCode(code)`, `hadisCount(book)` (existing hadis = total minus gaps), `hasHadis(book, number)`.
- Produces in `hadisRoute.js`: `tagOf(bookId, number): string` (`BUK-124`), `parseTag(tag): { book, number } | null`, `hadisHref(bookId, number): string` (`/hadis/bukhari/124`), `parseHadisParams(bookSlug, numberText): { book, number } | null` (null for an unknown book, a non-integer, `< 1` or `> total`), `neighbours(book, number): { prev: number | null, next: number | null }` (the nearest existing numbers in the same book, skipping gaps).

- [ ] **Step 1: Write the failing tests**

`src/lib/books.test.js`:

```js
import { BOOKS, bookByCode, bookById, hadisCount, hasHadis } from './books';

test('the six books in display order', () => {
  expect(BOOKS.map((b) => b.id)).toEqual(['bukhari', 'muslim', 'tirmidhi', 'abudawud', 'ibnmajah', 'nasai']);
  expect(BOOKS.map((b) => b.code)).toEqual(['BUK', 'MUS', 'TIR', 'DAU', 'MAJ', 'NAS']);
  expect(BOOKS.map((b) => b.folder)).toEqual(['Bukhari', 'Muslim', 'Tirmiji', 'Daud', 'Majah', 'Nasae']);
});

test('each book has Bengali names, a citation, a badge and a colour variable', () => {
  const bukhari = bookById('bukhari');
  expect(bukhari.name).toBe('বুখারী');
  expect(bukhari.full).toBe('বুখারী শরীফ');
  expect(bukhari.cite).toBe('সহীহ বুখারী');
  expect(bukhari.colorVar).toBe('--bk-bukhari');
  expect(bukhari.badge.length).toBeGreaterThan(0);
});

test('lookups by id and by code, and unknowns give undefined', () => {
  expect(bookByCode('MUS').id).toBe('muslim');
  expect(bookById('nope')).toBeUndefined();
  expect(bookByCode('XXX')).toBeUndefined();
});

test('the counts match the files on disk', () => {
  expect(hadisCount(bookById('bukhari'))).toBe(6719);
  expect(hadisCount(bookById('muslim'))).toBe(7281);
  expect(hadisCount(bookById('tirmidhi'))).toBe(3608);
  expect(hadisCount(bookById('abudawud'))).toBe(5184);
  expect(hadisCount(bookById('ibnmajah'))).toBe(4341);
  expect(hadisCount(bookById('nasai'))).toBe(5753);
  expect(BOOKS.reduce((sum, b) => sum + hadisCount(b), 0)).toBe(32886);
});

test('hasHadis knows the gaps (Bukhari 63 has no file, 62 and 64 do)', () => {
  const bukhari = bookById('bukhari');
  expect(hasHadis(bukhari, 62)).toBe(true);
  expect(hasHadis(bukhari, 63)).toBe(false);
  expect(hasHadis(bukhari, 64)).toBe(true);
  expect(hasHadis(bukhari, 0)).toBe(false);
  expect(hasHadis(bukhari, 7054)).toBe(false);
});
```

`src/lib/hadisRoute.test.js`:

```js
import { bookById } from './books';
import { hadisHref, neighbours, parseHadisParams, parseTag, tagOf } from './hadisRoute';

test('tags and addresses', () => {
  expect(tagOf('bukhari', 124)).toBe('BUK-124');
  expect(hadisHref('bukhari', 124)).toBe('/hadis/bukhari/124');
  expect(parseTag('BUK-124')).toEqual({ book: bookById('bukhari'), number: 124 });
  expect(parseTag('XXX-1')).toBeNull();
  expect(parseTag('nonsense')).toBeNull();
});

test('parseHadisParams accepts real addresses', () => {
  expect(parseHadisParams('bukhari', '6628')).toEqual({ book: bookById('bukhari'), number: 6628 });
  expect(parseHadisParams('tirmidhi', '3608').number).toBe(3608);
});

test.each([
  ['nobook', '1'],
  ['bukhari', '0'],
  ['bukhari', '-5'],
  ['bukhari', '7054'],
  ['bukhari', '99999'],
  ['bukhari', 'abc'],
  ['bukhari', '12.5'],
  ['bukhari', '1e3'],
  ['bukhari', ''],
])('parseHadisParams rejects %s / %s (Review Focus 1)', (book, number) => {
  expect(parseHadisParams(book, number)).toBeNull();
});

test('a number inside the range but without a file is still a valid address (Review Focus 2)', () => {
  expect(parseHadisParams('bukhari', '63')).toEqual({ book: bookById('bukhari'), number: 63 });
});

test('neighbours skip the gaps in a book', () => {
  const bukhari = bookById('bukhari');
  expect(neighbours(bukhari, 64)).toEqual({ prev: 62, next: 65 });
  expect(neighbours(bukhari, 62)).toEqual({ prev: 61, next: 64 });
  expect(neighbours(bukhari, 63)).toEqual({ prev: 62, next: 64 });
});

test('the first and last hadis have no previous or next', () => {
  expect(neighbours(bookById('muslim'), 1)).toEqual({ prev: null, next: 2 });
  expect(neighbours(bookById('muslim'), 7281)).toEqual({ prev: 7280, next: null });
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run src/lib`
Expected: FAIL (modules missing).

- [ ] **Step 3: Implement**

`src/lib/books.js`: move the `missing` range lists (Bukhari 124 ranges, Nasa'i 4 ranges) and totals from `src/Books/bookList.js` here, verbatim, and build `BOOKS` with the fields in the interface. Use these values:

| id | code | folder | name | full | cite | badge | legacyName | total |
|---|---|---|---|---|---|---|---|---|
| bukhari | BUK | Bukhari | বুখারী | বুখারী শরীফ | সহীহ বুখারী | বু | বুখারি শরীফ | 7053 |
| muslim | MUS | Muslim | মুসলিম | মুসলিম শরীফ | সহীহ মুসলিম | মু | মুসলিম শরীফ | 7281 |
| tirmidhi | TIR | Tirmiji | তিরমিযী | তিরমিযী শরীফ | জামে‘ তিরমিযী | তি | তিরমিজি শরীফ | 3608 |
| abudawud | DAU | Daud | আবু দাউদ | আবু দাউদ শরীফ | সুনান আবু দাউদ | আ | আবু দাউদ শরীফ | 5184 |
| ibnmajah | MAJ | Majah | ইবনে মাজাহ | ইবনে মাজাহ শরীফ | সুনান ইবনে মাজাহ | ই | সুনানু ইবনে মাজাহ | 4341 |
| nasai | NAS | Nasae | নাসাঈ | নাসাঈ শরীফ | সুনান নাসাঈ | না | সুনানু নাসাঈ শরীফ | 5758 |

`colorVar` is `--bk-<id>`. `missing` is `[]` except Bukhari and Nasa'i. `hadisCount(book)` is `total` minus the sum of range lengths. `hasHadis(book, n)` is `Number.isInteger(n) && n >= 1 && n <= total` and `n` is in no gap range.

`src/lib/hadisRoute.js`:

```js
import { BOOKS, bookByCode, bookById, hasHadis } from './books';

export function tagOf(bookId, number) {
  return `${bookById(bookId).code}-${number}`;
}

export function parseTag(tag) {
  const match = /^([A-Z]{3})-(\d+)$/.exec(tag);
  const book = match && bookByCode(match[1]);
  return book ? { book, number: Number(match[2]) } : null;
}

export function hadisHref(bookId, number) {
  return `/hadis/${bookId}/${number}`;
}

export function parseHadisParams(bookSlug, numberText) {
  const book = BOOKS.find((b) => b.slug === bookSlug);
  if (!book || !/^\d+$/.test(numberText)) return null;
  const number = Number(numberText);
  return number >= 1 && number <= book.total ? { book, number } : null;
}

// The nearest existing hadis numbers before and after, in the same book.
export function neighbours(book, number) {
  let prev = number - 1;
  while (prev >= 1 && !hasHadis(book, prev)) prev--;
  let next = number + 1;
  while (next <= book.total && !hasHadis(book, next)) next++;
  return { prev: prev >= 1 ? prev : null, next: next <= book.total ? next : null };
}
```

Rewrite `src/Books/bookList.js` as an adapter so the legacy Books page keeps its old names and `hadisNumbers`: `export const BOOKS = lib.BOOKS.map((b) => ({ code: b.code, name: b.legacyName, total: b.total, missing: b.missing }))`, and keep `hadisNumbers(book)` exactly as it is (it only needs `total` and `missing`).

- [ ] **Step 4: Verify**

Run: `npx vitest run && npm run lint && npm run build`
Expected: all pass (the legacy Books tests still pass through the adapter).

- [ ] **Step 5: Commit**

```bash
git add src/lib src/Books/bookList.js
git commit -m "feat: one book list with names, colours and gaps; hadis address helpers"
```

---

### Task 5: Digits

**Files:**
- Create: `src/lib/digits.js`, `src/lib/digits.test.js`, `src/lib/useDigits.js`, `src/lib/useDigits.test.jsx`

**Interfaces:**
- Produces: `toBengaliDigits(text): string`, `toEnglishDigits(text): string`, `formatNumber(n, digits = 'bn'): string` (grouped with commas, then converted: `7053` with `bn` is `৭,০৫৩`), and the hook `useDigits(): (value) => string` that formats numbers or digit strings in the visitor's chosen digit style.

- [ ] **Step 1: Write the failing tests**

`src/lib/digits.test.js`:

```js
import { formatNumber, toBengaliDigits, toEnglishDigits } from './digits';

test('converts between digit styles and leaves other text alone', () => {
  expect(toBengaliDigits('হাদীস 124')).toBe('হাদীস ১২৪');
  expect(toEnglishDigits('হাদীস ১২৪')).toBe('হাদীস 124');
  expect(toBengaliDigits('abc')).toBe('abc');
});

test('formatNumber groups thousands and respects the style', () => {
  expect(formatNumber(7053)).toBe('৭,০৫৩');
  expect(formatNumber(7053, 'en')).toBe('7,053');
  expect(formatNumber(403, 'bn')).toBe('৪০৩');
  expect(formatNumber('12')).toBe('১২');
});
```

`src/lib/useDigits.test.jsx`:

```jsx
import { render, screen } from '@testing-library/react';
import { SettingsProvider } from '../settings/SettingsProvider';
import { useDigits } from './useDigits';

function Probe() {
  const d = useDigits();
  return <span data-testid="out">{d(6628)}</span>;
}

beforeEach(() => localStorage.clear());

test('uses Bengali digits by default', () => {
  render(<SettingsProvider><Probe /></SettingsProvider>);
  expect(screen.getByTestId('out')).toHaveTextContent('৬,৬২৮');
});

test('uses English digits when the visitor chose them', () => {
  localStorage.setItem('alhashor.settings', JSON.stringify({ digits: 'en' }));
  render(<SettingsProvider><Probe /></SettingsProvider>);
  expect(screen.getByTestId('out')).toHaveTextContent('6,628');
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run src/lib/digits.test.js src/lib/useDigits.test.jsx`
Expected: FAIL (modules missing).

- [ ] **Step 3: Implement**

`src/lib/digits.js`:

```js
const BENGALI = '০১২৩৪৫৬৭৮৯';

export const toBengaliDigits = (text) => String(text).replace(/[0-9]/g, (d) => BENGALI[d]);
export const toEnglishDigits = (text) => String(text).replace(/[০-৯]/g, (d) => BENGALI.indexOf(d));

export function formatNumber(value, digits = 'bn') {
  const text = Number(value).toLocaleString('en-US');
  return digits === 'en' ? text : toBengaliDigits(text);
}
```

`src/lib/useDigits.js`:

```js
'use client';

import { useCallback } from 'react';
import { useSettings } from '../settings/SettingsProvider';
import { formatNumber } from './digits';

export function useDigits() {
  const { settings } = useSettings();
  return useCallback((value) => formatNumber(value, settings.digits), [settings.digits]);
}
```

- [ ] **Step 4: Verify and commit**

Run: `npx vitest run && npm run lint`
Expected: pass.

```bash
git add src/lib/digits.js src/lib/digits.test.js src/lib/useDigits.js src/lib/useDigits.test.jsx
git commit -m "feat: Bengali and English digit helpers"
```

---

### Task 6: Narrator chain and reading time

**Files:**
- Create: `src/lib/hadisText.js`, `src/lib/hadisText.test.js`

**Interfaces:**
- Produces: `splitHadis(text): { number, chain, body, summary }` (all strings; `chain` is empty when no chain is recognised, and then `body` is the whole text after the number), `wordCount(text): number`, `readingTime(words): string` (`আধা মিনিটেরও কম` under 45 words, otherwise `প্রায় <n> মিনিট` with Bengali digits, at 150 words a minute).

- [ ] **Step 1: Write the failing tests** (real texts from the data)

`src/lib/hadisText.test.js`:

```js
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { readingTime, splitHadis, wordCount } from './hadisText';

const BUKHARI_6628 = '৬৬২৮। আদম ইবনু আবূ ইয়াস (রহঃ) ... হুযায়ফা ইবনুু-ইয়ামান (রাঃ) থেকে বর্ণিত। তিনি বলেন, বর্তমান যুগের মুনাফিকরা নবী সাল্লাল্লাহু আলাইহি ওয়াসাল্লাম এর যুগের মুনাফিকদের চাইতেও জঘন্য। কেননা, সে যুগে তারা (মুনাফিকী) করত গোপনে আর আজ করে প্রকাশ্যে।';
const TIRMIDHI_987 = '৯৮৭. কুতায়বা (রহঃ) ...... আনাস (রাঃ) থেকে বর্ণিত আছে যে, রাসূলুল্লাহ সাল্লাল্লাহু আলাইহি ওয়াসাল্লাম বলেছেন, কষ্টের প্রথম অবস্থায়ই ধৈর্যধারণ করতে হয়।';
const DAUD_203 = '২০৩. হায়ওয়াত শুরায়হ্ .... আলী ইবনু আবূ তালিব (রাঃ) হতে বর্ণিত। রাসূলুল্লাহ্ সাল্লাল্লাহু আলাইহি ওয়া সাল্লাম বলেছেনঃ চক্ষু হল পাশ্চাদ্বারের সংরক্ষণকারী। অতএব যে ব্যক্তি চোখ মুদে নিদ্রা যায় সে যেন উযূ করে।';
const MAJAH_201 = '২৫/২০১। জাবির ইবনু আবদুল্লাহ (রাঃ) থেকে বর্ণিত। তিনি বলেন, রাসূলুল্লাহ সাল্লাল্লাহু আলাইহি ওয়াসাল্লাম হাজ্জের (হজ্জ) মৌসুমে নিজেকে লোকেদের সামনে পেশ করতেন।';
const BUKHARI_307 = '৩০৭। আবদুল্লাহ ইবনু ’আবদুল ওয়াহহাব (রহঃ) ..... উম্মে ’আতিয়া (রাঃ) থেকে বর্ণিত, তিনি বলেনঃ কোন মৃত ব্যাক্তির জন্য আমাদের তিন দিনের বেশী শোক পালন করা থেকে নিষেধ করা হত। এই বর্ণনা হিশাম ইবনু হাসসান (রহঃ) হাফসা (রাঃ) থেকে, তিনি উম্মে ’আতিয়্যা (রাঃ) থেকে এবং তিনি নবী সাল্লাল্লাহু আলাইহি ওয়াসাল্লাম থেকে বিবৃত করেছেন।';

test('splits a Bukhari hadis into number, chain, saying and summary', () => {
  const parts = splitHadis(BUKHARI_6628);
  expect(parts.number).toBe('৬৬২৮');
  expect(parts.chain).toBe('আদম ইবনু আবূ ইয়াস (রহঃ) ... হুযায়ফা ইবনুু-ইয়ামান (রাঃ) থেকে বর্ণিত।');
  expect(parts.body.startsWith('তিনি বলেন, বর্তমান যুগের মুনাফিকরা')).toBe(true);
  expect(parts.summary).toBe('আদম ইবনু আবূ ইয়াস (রহঃ) ... হুযায়ফা ইবনুু-ইয়ামান (রাঃ)');
});

test('handles the "বর্ণিত আছে যে," form and a dot after the number (Tirmidhi)', () => {
  const parts = splitHadis(TIRMIDHI_987);
  expect(parts.number).toBe('৯৮৭');
  expect(parts.chain).toBe('কুতায়বা (রহঃ) ...... আনাস (রাঃ) থেকে বর্ণিত আছে যে,');
  expect(parts.body.startsWith('রাসূলুল্লাহ সাল্লাল্লাহু')).toBe(true);
  expect(parts.summary).toBe('কুতায়বা (রহঃ) ... আনাস (রাঃ)');
});

test('handles "হতে বর্ণিত" (Abu Dawud)', () => {
  const parts = splitHadis(DAUD_203);
  expect(parts.number).toBe('২০৩');
  expect(parts.body.startsWith('রাসূলুল্লাহ্ সাল্লাল্লাহু')).toBe(true);
  expect(parts.summary).toBe('হায়ওয়াত শুরায়হ্ ... আলী ইবনু আবূ তালিব (রাঃ)');
});

test('handles a book-and-hadis number like ২৫/২০১ and a single narrator (Ibn Majah)', () => {
  const parts = splitHadis(MAJAH_201);
  expect(parts.number).toBe('২৫/২০১');
  expect(parts.summary).toBe('জাবির ইবনু আবদুল্লাহ (রাঃ)');
  expect(parts.body.startsWith('তিনি বলেন, রাসূলুল্লাহ')).toBe(true);
});

test('only the first "থেকে বর্ণিত" ends the chain; later mentions stay in the saying', () => {
  const parts = splitHadis(BUKHARI_307);
  expect(parts.chain.endsWith('থেকে বর্ণিত,')).toBe(true);
  expect(parts.body).toContain('হাফসা (রাঃ) থেকে, তিনি');
});

test('no chain and no number: the full text is the body, nothing is lost (Review Focus 3)', () => {
  const text = 'রাসূলুল্লাহ সাল্লাল্লাহু আলাইহি ওয়াসাল্লাম বলেছেন, সত্য কথা বলো।';
  expect(splitHadis(text)).toEqual({ number: '', chain: '', body: text, summary: '' });
  expect(splitHadis('')).toEqual({ number: '', chain: '', body: '', summary: '' });
});

test('a chain marker far into a long text is not treated as a chain', () => {
  const far = 'শব্দ '.repeat(120) + 'আনাস (রাঃ) থেকে বর্ণিত। পরের কথা।';
  expect(splitHadis(far).chain).toBe('');
});

test('words are counted by spaces', () => {
  expect(wordCount('এক দুই  তিন')).toBe(3);
  expect(wordCount('')).toBe(0);
});

test('reading time is half a minute for short hadis and whole minutes for long ones', () => {
  expect(readingTime(30)).toBe('আধা মিনিটেরও কম');
  expect(readingTime(44)).toBe('আধা মিনিটেরও কম');
  expect(readingTime(45)).toBe('প্রায় ১ মিনিট');
  expect(readingTime(300)).toBe('প্রায় ২ মিনিট');
  expect(readingTime(301)).toBe('প্রায় ৩ মিনিট');
});

test('on the real data, most hadis have a recognisable chain and no text is ever lost (Review Focus 3)', () => {
  const root = path.resolve(process.cwd(), 'public/json/hadis');
  let total = 0;
  let withChain = 0;
  for (const folder of readdirSync(root)) {
    const dirs = readdirSync(path.join(root, folder)).filter((d) => /^\d+$/.test(d)).sort();
    for (let i = 0; i < dirs.length; i += 20) {
      const text = JSON.parse(readFileSync(path.join(root, folder, dirs[i], 'text.txt'), 'utf8'), undefined);
      const parts = splitHadis(text);
      total++;
      if (parts.chain) withChain++;
      const rejoined = `${parts.chain} ${parts.body}`.replace(/\s+/g, ' ').trim();
      const original = text.replace(/^\s*(?:[০-৯]+\/)?[০-৯]+\s*[।.]\s*/, '').replace(/\s+/g, ' ').trim();
      expect(rejoined).toBe(original);
    }
  }
  expect(withChain / total).toBeGreaterThan(0.7);
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run src/lib/hadisText.test.js`
Expected: FAIL (module missing). Note: one real data file (Nasa'i 435) has a raw control character that strict JSON parsing rejects. The sample test above reads every 20th file, which skips it, but if a run hits it, parse with a tolerant step (replace control characters inside the string) in the test only.

- [ ] **Step 3: Implement**

`src/lib/hadisText.js`:

```js
import { formatNumber } from './digits';

const NUMBER_PREFIX = /^\s*((?:[০-৯]+\/)?[০-৯]+)\s*[।.]\s*/;
const CHAIN_END = /(?:থেকে|হতে)\s+বর্ণিত(?:\s+আছে\s+যে)?[,।:ঃ]?/;
const SEARCH_WINDOW = 400;

// Shows the first and last narrator, joined by an ellipsis, when the chain has several.
function summarise(names) {
  const parts = names.split(/\s*(?:\.{2,}|…)\s*/).map((part) => part.trim()).filter(Boolean);
  if (parts.length <= 1) return parts[0] || '';
  return `${parts[0]} ... ${parts[parts.length - 1]}`;
}

export function splitHadis(text) {
  const numberMatch = NUMBER_PREFIX.exec(text);
  const number = numberMatch ? numberMatch[1] : '';
  const rest = numberMatch ? text.slice(numberMatch[0].length) : text;
  const end = CHAIN_END.exec(rest.slice(0, SEARCH_WINDOW));
  if (!end) return { number, chain: '', body: rest.trim(), summary: '' };
  const chainEnd = end.index + end[0].length;
  return {
    number,
    chain: rest.slice(0, chainEnd).trim(),
    body: rest.slice(chainEnd).trim(),
    summary: summarise(rest.slice(0, end.index)),
  };
}

export function wordCount(text) {
  return text.split(/\s+/).filter(Boolean).length;
}

export function readingTime(words) {
  if (words < 45) return 'আধা মিনিটেরও কম';
  return `প্রায় ${formatNumber(Math.ceil(words / 150), 'bn')} মিনিট`;
}
```

- [ ] **Step 4: Verify**

Run: `npx vitest run src/lib/hadisText.test.js`
Expected: PASS, including the real-data test (more than 70% with a chain, and no text lost in any sampled hadis). Write the measured percentage in the commit message. If the real-data test finds lost text, fix the splitter (never the test).

- [ ] **Step 5: Commit**

```bash
git add src/lib/hadisText.js src/lib/hadisText.test.js
git commit -m "feat: split a hadis into number, narrator chain and saying; reading time"
```

---

### Task 7: Loading one hadis text

**Files:**
- Create: `src/lib/useHadisText.js`, `src/lib/useHadisText.test.jsx`

**Interfaces:**
- Consumes: `hadisUrl(tag)` from `src/Helpers/hadisPath.js` (returns `null` for an unknown book).
- Produces: `loadHadisText(tag): Promise<{ status: 'ok', text } | { status: 'missing' } | { status: 'error' }>` with an in-memory cache (only `ok` and `missing` are cached), and the hook `useHadisText(tag): { status: 'loading' | 'ok' | 'missing' | 'error', text: string }`.

- [ ] **Step 1: Write the failing tests**

`src/lib/useHadisText.test.jsx`:

```jsx
import { render, screen } from '@testing-library/react';
import { loadHadisText, useHadisText } from './useHadisText';

function Probe({ tag }) {
  const { status, text } = useHadisText(tag);
  return <div data-testid="out">{status}:{text}</div>;
}

afterEach(() => {
  delete global.fetch;
});

function serve(map) {
  global.fetch = vi.fn((url) => {
    if (url in map) return Promise.resolve({ ok: true, json: () => Promise.resolve(map[url]) });
    return Promise.resolve({ ok: false, status: 404 });
  });
}

test('loads a hadis text', async () => {
  serve({ '/json/hadis/Bukhari/0001/text.txt': 'এক দুই' });
  render(<Probe tag="BUK-1" />);
  expect(screen.getByTestId('out')).toHaveTextContent('loading:');
  expect(await screen.findByText('ok:এক দুই')).toBeInTheDocument();
});

test('a number with no data file is "missing", not an error or a spinner (Review Focus 2)', async () => {
  serve({});
  render(<Probe tag="BUK-63" />);
  expect(await screen.findByText('missing:')).toBeInTheDocument();
});

test('an unknown book is "missing"', async () => {
  serve({});
  render(<Probe tag="XXX-1" />);
  expect(await screen.findByText('missing:')).toBeInTheDocument();
});

test('a network failure is an "error" and is retried on the next request', async () => {
  let calls = 0;
  global.fetch = vi.fn(() => {
    calls++;
    return calls === 1 ? Promise.reject(new Error('offline')) : Promise.resolve({ ok: true, json: () => Promise.resolve('ok text') });
  });
  expect(await loadHadisText('MUS-7')).toEqual({ status: 'error' });
  expect(await loadHadisText('MUS-7')).toEqual({ status: 'ok', text: 'ok text' });
});

test('a text is fetched once however often it is asked for', async () => {
  serve({ '/json/hadis/Daud/0203/text.txt': 'দাউদ' });
  await loadHadisText('DAU-203');
  await loadHadisText('DAU-203');
  expect(global.fetch).toHaveBeenCalledTimes(1);
});

test('changing the tag loads the new text', async () => {
  serve({
    '/json/hadis/Bukhari/0001/text.txt': 'প্রথম',
    '/json/hadis/Bukhari/0002/text.txt': 'দ্বিতীয়',
  });
  const { rerender } = render(<Probe tag="BUK-1" />);
  await screen.findByText('ok:প্রথম');
  rerender(<Probe tag="BUK-2" />);
  expect(await screen.findByText('ok:দ্বিতীয়')).toBeInTheDocument();
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run src/lib/useHadisText.test.jsx`
Expected: FAIL (module missing).

- [ ] **Step 3: Implement**

`src/lib/useHadisText.js`:

```js
'use client';

import { useEffect, useState } from 'react';
import { hadisUrl } from '../Helpers/hadisPath';

const cache = new Map(); // tag -> Promise of a settled result ('ok' or 'missing')

export function loadHadisText(tag) {
  if (cache.has(tag)) return cache.get(tag);
  const url = hadisUrl(tag);
  if (url === null) return Promise.resolve({ status: 'missing' });

  const request = fetch(url)
    .then(async (response) => {
      if (!response.ok) return { status: 'missing' };
      return { status: 'ok', text: await response.json() };
    })
    .catch(() => {
      cache.delete(tag); // a network failure is retried next time
      return { status: 'error' };
    });
  cache.set(tag, request);
  return request;
}

export function useHadisText(tag) {
  const [state, setState] = useState({ tag, status: 'loading', text: '' });

  useEffect(() => {
    let cancelled = false;
    loadHadisText(tag).then((result) => {
      if (!cancelled) setState({ tag, status: result.status, text: result.text || '' });
    });
    return () => {
      cancelled = true;
    };
  }, [tag]);

  return state.tag === tag ? state : { tag, status: 'loading', text: '' };
}
```

- [ ] **Step 4: Verify and commit**

Run: `npx vitest run && npm run lint`
Expected: pass.

```bash
git add src/lib/useHadisText.js src/lib/useHadisText.test.jsx
git commit -m "feat: load one hadis text with a cache and clear loading, missing and error states"
```

---

### Task 8: UI pieces and the shell (top navigation, tab bar, footer, back-to-top)

**Files:**
- Create: `src/ui/Icon.jsx`, `src/ui/Button.jsx`, `src/ui/Chip.jsx`, `src/ui/BookBadge.jsx`, `src/ui/Toast.jsx`, `src/ui/ui.test.jsx`, `src/shell/TopNav.jsx`, `src/shell/TabBar.jsx`, `src/shell/Footer.jsx`, `src/shell/shell.test.jsx`, `src/styles/ui.css`
- Modify: `src/app/layout.jsx`, `src/Helpers/BackToTop.jsx` (restyle), `src/app/pages.test.jsx` (stylesheet list and the navigation assertions)
- Delete: `src/Navbar/Navbar.jsx`, `src/Navbar/Navbar.css`, `src/Navbar/Navbar.test.jsx` (replaced by the shell)

**Interfaces:**
- Produces in `src/ui/`: `Icon({ name, size = 20 })` (names: `home search book tag copy share link cr cl cd check x up clock cols sliders more`), `Button({ variant = 'default'|'primary'|'ghost', size, children, ...props })`, `Chip({ pressed, dot, children, ...props })` (a toggle button with `aria-pressed`), `BookBadge({ bookId, size })`, and `ToastProvider` plus `useToast(): (message) => void` (a polite live region that disappears after 1.9 seconds).
- Produces in `src/shell/`: `TopNav` (brand link, links Home / Search / Books / Topics with `aria-current="page"` on the active one, a settings button linking to `/settings`), `TabBar` (phone bottom bar, five buttons: Home, Search, Books, Topics, More), `Footer`. Active state comes from `usePathname()`.

- [ ] **Step 1: Write the failing tests**

`src/ui/ui.test.jsx`:

```jsx
import { act, fireEvent, render, screen } from '@testing-library/react';
import BookBadge from './BookBadge';
import Button from './Button';
import Chip from './Chip';
import Icon from './Icon';
import { ToastProvider, useToast } from './Toast';

test('an icon is hidden from screen readers', () => {
  const { container } = render(<Icon name="home" />);
  expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
});

test('a button forwards clicks and has a primary variant', () => {
  const onClick = vi.fn();
  render(<Button variant="primary" onClick={onClick}>যাই</Button>);
  fireEvent.click(screen.getByRole('button', { name: 'যাই' }));
  expect(onClick).toHaveBeenCalled();
  expect(screen.getByRole('button', { name: 'যাই' }).className).toContain('ui-btn');
  expect(screen.getByRole('button', { name: 'যাই' }).className).toContain('primary');
});

test('a chip is a toggle button', () => {
  render(<Chip pressed>সব</Chip>);
  expect(screen.getByRole('button', { name: 'সব' })).toHaveAttribute('aria-pressed', 'true');
});

test('a book badge shows the book letter and carries the book colour', () => {
  render(<BookBadge bookId="muslim" />);
  const badge = screen.getByText('মু');
  expect(badge.style.getPropertyValue('--bk')).toBe('var(--bk-muslim)');
});

test('a toast is announced politely and goes away by itself', () => {
  vi.useFakeTimers();
  function Probe() {
    const toast = useToast();
    return <button onClick={() => toast('কপি করা হয়েছে')}>go</button>;
  }
  render(<ToastProvider><Probe /></ToastProvider>);
  fireEvent.click(screen.getByText('go'));
  expect(screen.getByRole('status')).toHaveTextContent('কপি করা হয়েছে');
  act(() => vi.advanceTimersByTime(2100));
  expect(screen.getByRole('status')).toBeEmptyDOMElement();
  vi.useRealTimers();
});
```

`src/shell/shell.test.jsx`:

```jsx
import { fireEvent, render, screen } from '@testing-library/react';
import { getUrl, setUrl } from '../test/nextNavigation';
import Footer from './Footer';
import TabBar from './TabBar';
import TopNav from './TopNav';

test.each([
  ['/', 'হোম'],
  ['/search', 'সার্চ'],
  ['/books', 'হাদীস বই'],
  ['/topics', 'বিষয়ভিত্তিক হাদীস'],
])('on %s the top navigation marks %s as the current page', (path, label) => {
  setUrl(path);
  render(<TopNav />);
  expect(screen.getByRole('link', { name: label })).toHaveAttribute('aria-current', 'page');
  expect(screen.getAllByRole('link').filter((a) => a.getAttribute('aria-current') === 'page')).toHaveLength(1);
});

test('a hadis page belongs to no top-level tab but keeps the books tab current', () => {
  setUrl('/hadis/bukhari/124');
  render(<TopNav />);
  expect(screen.getByRole('link', { name: 'হাদীস বই' })).toHaveAttribute('aria-current', 'page');
});

test('the brand links home and a settings link exists', () => {
  render(<TopNav />);
  expect(screen.getByRole('link', { name: /Alhashor/ })).toHaveAttribute('href', '/');
  expect(screen.getByRole('link', { name: 'পড়ার সেটিং' })).toHaveAttribute('href', '/settings');
});

test('the tab bar has five tabs and navigates without reloading', () => {
  render(<TabBar />);
  expect(screen.getAllByRole('link')).toHaveLength(4);
  fireEvent.click(screen.getByRole('link', { name: 'সার্চ' }));
  expect(getUrl().pathname).toBe('/search');
});

test('the tab bar "more" button opens a menu with the settings link', () => {
  render(<TabBar />);
  fireEvent.click(screen.getByRole('button', { name: 'আরও' }));
  expect(screen.getByRole('link', { name: 'পড়ার সেটিং' })).toBeInTheDocument();
});

test('the footer names the site and counts the hadis', () => {
  render(<Footer />);
  expect(screen.getByText(/৩২,৮৮৬/)).toBeInTheDocument();
  expect(screen.getByText(/Alhashor/)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run src/ui src/shell`
Expected: FAIL (modules missing).

- [ ] **Step 3: Implement**

Port from D2: the icon paths (D2 script, the `IC` object around lines 524 to 560) into `Icon.jsx` (an object of path strings and one `<svg>` with `stroke="currentColor"`, `fill="none"`, `aria-hidden="true"`); the button, chip, pill and badge CSS (D2 lines 126 to 177) into `src/styles/ui.css` with the prefix `ui-` (`.ui-btn`, `.ui-btn.primary`, `.ui-chip`, `.ui-badge`) and the nav, tab bar and footer CSS (D2 lines 89 to 125 and 210 to 214) with prefixes `.shell-nav`, `.shell-tabbar`, `.shell-footer`; replace container queries with `@media (max-width: 640px)` and `@media (min-width: 641px)`. Drop the prototype control bar, stage frame and label pills.

Structure contracts the tests above pin:
- `BookBadge`: a `<span className="ui-badge" style={{ '--bk': 'var(--bk-<id>)' }}>` with the book's `badge` letter.
- `Toast`: `ToastProvider` renders `children` plus `<div role="status" aria-live="polite" className="ui-toast">{message}</div>`; `useToast()` returns a function that sets the message and clears it after 1900 ms.
- `TopNav`: `<header className="shell-nav">`, a brand `<Link href="/">` whose text includes `Alhashor`, a `<nav aria-label="প্রধান মেনু">` with four `Link`s, and a `Link` to `/settings` with `aria-label="পড়ার সেটিং"`. The active link is computed by `usePathname()`: `/` only matches exactly; `/hadis/...` and `/books...` both mark Books; `/search...` marks Search; `/topics...` marks Topics.
- `TabBar`: `<nav className="shell-tabbar" aria-label="নিচের মেনু">` with four `Link`s (Home, Search, Books, Topics) and a fifth `<button>` named `আরও` that toggles a menu holding a `Link` to `/settings` named `পড়ার সেটিং`.
- `Footer`: brand, the line `ছয়টি প্রধান গ্রন্থ · ৩২,৮৮৬ হাদীস · শুধু বাংলা পাঠ · বিনামূল্যে` using `formatNumber` and the `BOOKS` total, and links Home / Search / Books / Topics.

In `layout.jsx`: replace `NavBar` with `TopNav`, add `TabBar` and `Footer`, wrap the body contents in `ToastProvider` (inside `SettingsProvider`), and import `../styles/ui.css` after `base.css`. Remove `../Navbar/Navbar.css` from the stylesheet list. Restyle `BackToTop` with the D2 `.fab` look (round button, `aria-label="Back to top"`, shown only after scrolling 300 px) while keeping its accessible name, role, and Enter and click behavior.

Delete `src/Navbar/` (its tests are replaced by `shell.test.jsx`). Update `src/app/pages.test.jsx`: the stylesheet-order list (remove `Navbar.css`, append `'../styles/ui.css'`) and the layout test (it now expects `href="/search"` from `TopNav`, which it already does, and `Back to top`). Update `src/Helpers/BackToTop.test.jsx` if the "shows only after scrolling" behavior needs a scroll event in the test (set `window.scrollY` and dispatch `scroll`).

- [ ] **Step 4: Verify**

Run: `npx vitest run && npm run lint && npm run build`
Expected: all pass. Then take screenshots (`scripts/with-server.sh 5056 "npx next start -p 5056" scripts/screenshots.sh http://localhost:5056 /tmp/shots-shell`) and look at the home, search and not-found images: the top navigation and footer should look like D2's at desktop width (teal accent, rounded links, pill for the current page).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: UI pieces and the new shell (top navigation, tab bar, footer, back-to-top)"
```

---

### Task 9: Home

**Files:**
- Create: `src/home/Home.jsx`, `src/home/Home.test.jsx`, `src/styles/home.css`
- Modify: `src/app/page.jsx`, `src/app/layout.jsx` (styles), `src/app/pages.test.jsx`
- Delete: `src/Home/Home.jsx`, `src/Home/Home.css`, `src/Home/Home.test.jsx`

**Interfaces:**
- Consumes: `BOOKS`, `hadisCount` (Task 4), `formatNumber`/`useDigits` (Task 5), `BookBadge`, `Icon` (Task 8).
- Produces: `Home` (default export) with sections: hero (title, lead, a search entry linking to `/search`), three entry tiles (Search, Topics, Books) and a "coming soon" tile, a bookshelf of six spines (each a link to `/books` with the book's name and real count), and a quick-links row.

- [ ] **Step 1: Write the failing tests**

`src/home/Home.test.jsx`:

```jsx
import { fireEvent, render, screen } from '@testing-library/react';
import { SettingsProvider } from '../settings/SettingsProvider';
import { getUrl } from '../test/nextNavigation';
import Home from './Home';

const renderHome = () => render(<SettingsProvider><Home /></SettingsProvider>);

test('has a clear title and a search entry that opens the search page', () => {
  renderHome();
  expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('link', { name: /হাদীস খুঁজুন/ }));
  expect(getUrl().pathname).toBe('/search');
});

test('offers the three ways in, each a real link', () => {
  renderHome();
  fireEvent.click(screen.getByRole('link', { name: /বিষয়ভিত্তিক হাদীস/ }));
  expect(getUrl().pathname).toBe('/topics');
});

test('shows all six books on a bookshelf with their real hadis counts', () => {
  renderHome();
  for (const [name, count] of [['বুখারী', '৬,৭১৯'], ['মুসলিম', '৭,২৮১'], ['তিরমিযী', '৩,৬০৮'], ['আবু দাউদ', '৫,১৮৪'], ['ইবনে মাজাহ', '৪,৩৪১'], ['নাসাঈ', '৫,৭৫৩']]) {
    const spine = screen.getByRole('link', { name: new RegExp(name) });
    expect(spine).toHaveTextContent(count);
  }
});

test('says more is coming', () => {
  renderHome();
  expect(screen.getByText(/শীঘ্রই আসছে/)).toBeInTheDocument();
});

test('sets the home page title', () => {
  renderHome();
  expect(document.title).toBe('Alhashor - হাদীস সম্ভার');
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/home`
Expected: FAIL (module missing).

- [ ] **Step 3: Implement**

Port D2's home (`SC.home` at line 755, CSS at lines 178 to 209): hero card with the accent-soft gradient and two soft circles, the fake search field as a `Link` to `/search` (text `হাদীস খুঁজুন: শব্দ, বিষয় বা হাদীস নম্বর`), a 2-column grid of tiles (Search, Topics, Books, "more coming soon" as a dashed tile), and the bookshelf (six spines as links to `/books`, heights proportional to the real counts, each with the book name, real count and colour from `--bk-*`). Leave out D2's daily hadis card and quick-links row for now (Daily is Phase 3). Use `usePageTitle()` for the title. Put the CSS in `src/styles/home.css` with the `home-` prefix.

Point `src/app/page.jsx` at the new component (`import Home from '../home/Home'`), add `../styles/home.css` to the layout imports, remove `'../Home/Home.css'` from the list, and update the stylesheet-order test accordingly. Delete `src/Home/`.

- [ ] **Step 4: Verify**

Run: `npx vitest run && npm run lint && npm run build`
Expected: all pass. Then compare against D2 visually: serve the build, screenshot `/` at desktop width and at phone width (`CHROME_FLAGS` not needed: extend `scripts/screenshots.sh` with a second size via an optional third argument `<width>x<height>` defaulting to `1200x900`, and run it with `390x844` into `/tmp/shots-phone`). Open both images and check the hero, tiles and bookshelf against the D2 home screen at the same widths; fix spacing and colour differences in `home.css` until they read as the same design.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: redesigned Home (hero, entry tiles, bookshelf)"
```

---

### Task 10: The hadis full page

**Files:**
- Create: `src/app/hadis/[book]/[number]/page.jsx`, `src/hadis/HadisPage.jsx`, `src/hadis/Breadcrumb.jsx`, `src/hadis/HadisArticle.jsx`, `src/hadis/ReadingProgress.jsx`, `src/hadis/PrevNext.jsx`, `src/hadis/HadisPage.test.jsx`, `src/hadis/PrevNext.test.jsx`, `src/app/hadis/route.test.js`, `src/styles/hadis.css`
- Modify: `src/app/layout.jsx` (styles), `src/app/pages.test.jsx`

**Interfaces:**
- Consumes: `parseHadisParams`, `neighbours`, `hadisHref`, `tagOf` (Task 4), `splitHadis`, `wordCount`, `readingTime` (Task 6), `useHadisText` (Task 7), `useDigits` (Task 5), `useToast` and `BookBadge` (Task 8).
- Produces: the route `/hadis/<book-slug>/<number>`. `page.jsx` is an async Server Component that reads `params`, calls `parseHadisParams`, calls `notFound()` for an invalid address, and renders `<HadisPage bookId number />`. It also exports `generateMetadata` returning the title `<full book name> - হাদীস নং <bengali number> - Alhashor`.

**Design (D2 with D5's calm, section 3 of the plan):** a breadcrumb as quiet text (`হোম › <book full name> › হাদীস নং ৬৬২৮` with the book link); a thin sticky reading-progress line with `পড়তে প্রায় ১ মিনিট · ১০২ শব্দ` beside it; then the article with no heavy card: the book badge and the title, the saying in the reading font at `--rs`, `--rlh`, `--rw`, then the folded narrator chain (`বর্ণনায়:` and the summary with an expand button); quiet actions (`কপি`, `উদ্ধৃতি কপি`, `লিংক কপি`); the permanent link as small text; previous and next as two plain text links under a hairline. No related list yet (Phase 4).

- [ ] **Step 1: Write the failing tests**

`src/app/hadis/route.test.js` (the address rules, Review Focus 1):

```js
import { generateMetadata } from './[book]/[number]/page';

test('the title names the book and the number in Bengali', async () => {
  const metadata = await generateMetadata({ params: Promise.resolve({ book: 'bukhari', number: '6628' }) });
  expect(metadata.title).toBe('বুখারী শরীফ - হাদীস নং ৬,৬২৮ - Alhashor');
});

test('an invalid address asks Next.js for a 404', async () => {
  const { default: Page } = await import('./[book]/[number]/page');
  for (const [book, number] of [['nobook', '1'], ['bukhari', '0'], ['bukhari', '99999'], ['bukhari', 'abc']]) {
    await expect(Page({ params: Promise.resolve({ book, number }) })).rejects.toThrow(/NEXT_HTTP_ERROR_FALLBACK;404|NEXT_NOT_FOUND/);
  }
});

test('a valid address renders the hadis page', async () => {
  const { default: Page } = await import('./[book]/[number]/page');
  const element = await Page({ params: Promise.resolve({ book: 'bukhari', number: '6628' }) });
  expect(element.props).toMatchObject({ bookId: 'bukhari', number: 6628 });
});
```

`src/hadis/HadisPage.test.jsx`:

```jsx
import { fireEvent, render, screen } from '@testing-library/react';
import { SettingsProvider } from '../settings/SettingsProvider';
import { ToastProvider } from '../ui/Toast';
import { getUrl } from '../test/nextNavigation';
import HadisPage from './HadisPage';

const BUKHARI_6628 = '৬৬২৮। আদম ইবনু আবূ ইয়াস (রহঃ) ... হুযায়ফা ইবনুু-ইয়ামান (রাঃ) থেকে বর্ণিত। তিনি বলেন, বর্তমান যুগের মুনাফিকরা নবী সাল্লাল্লাহু আলাইহি ওয়াসাল্লাম এর যুগের মুনাফিকদের চাইতেও জঘন্য।';

function serve(map) {
  global.fetch = vi.fn((url) =>
    url in map
      ? Promise.resolve({ ok: true, json: () => Promise.resolve(map[url]) })
      : Promise.resolve({ ok: false, status: 404 })
  );
}

const show = (bookId, number) =>
  render(
    <SettingsProvider>
      <ToastProvider>
        <HadisPage bookId={bookId} number={number} />
      </ToastProvider>
    </SettingsProvider>
  );

beforeEach(() => {
  localStorage.clear();
  Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue() } });
});

afterEach(() => {
  delete global.fetch;
});

test('shows the book, the number, the saying first and the chain folded', async () => {
  serve({ '/json/hadis/Bukhari/6628/text.txt': BUKHARI_6628 });
  show('bukhari', 6628);
  expect(await screen.findByRole('heading', { level: 1, name: /বুখারী শরীফ - হাদীস নং ৬,৬২৮/ })).toBeInTheDocument();
  expect(screen.getByText(/তিনি বলেন, বর্তমান যুগের/)).toBeInTheDocument();
  const toggle = screen.getByRole('button', { name: /বর্ণনায়/ });
  expect(toggle).toHaveAttribute('aria-expanded', 'false');
  expect(screen.queryByText(/থেকে বর্ণিত।$/)).not.toBeInTheDocument();
  fireEvent.click(toggle);
  expect(toggle).toHaveAttribute('aria-expanded', 'true');
  expect(screen.getByText(/ইয়ামান \(রাঃ\) থেকে বর্ণিত।/)).toBeInTheDocument();
});

test('a hadis with no recognisable chain shows its whole text and no fold (Review Focus 3)', async () => {
  serve({ '/json/hadis/Muslim/0005/text.txt': 'রাসূলুল্লাহ সাল্লাল্লাহু আলাইহি ওয়াসাল্লাম বলেছেন, সত্য কথা বলো।' });
  show('muslim', 5);
  expect(await screen.findByText(/সত্য কথা বলো/)).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /বর্ণনায়/ })).not.toBeInTheDocument();
});

test('has a breadcrumb with a link to the book and the home page', async () => {
  serve({ '/json/hadis/Bukhari/6628/text.txt': BUKHARI_6628 });
  show('bukhari', 6628);
  await screen.findByRole('heading', { level: 1 });
  const crumbs = screen.getByRole('navigation', { name: 'পথ' });
  expect(crumbs).toHaveTextContent('হোম');
  expect(crumbs).toHaveTextContent('বুখারী শরীফ');
  fireEvent.click(screen.getByRole('link', { name: 'বুখারী শরীফ' }));
  expect(getUrl().pathname).toBe('/books');
});

test('shows reading time and the word count', async () => {
  serve({ '/json/hadis/Bukhari/6628/text.txt': BUKHARI_6628 });
  show('bukhari', 6628);
  expect(await screen.findByText(/আধা মিনিটেরও কম/)).toBeInTheDocument();
  expect(screen.getByRole('progressbar', { name: 'পড়ার অগ্রগতি' })).toBeInTheDocument();
});

test('copy, copy citation and copy link put the right text on the clipboard', async () => {
  serve({ '/json/hadis/Bukhari/6628/text.txt': BUKHARI_6628 });
  show('bukhari', 6628);
  await screen.findByRole('heading', { level: 1 });

  fireEvent.click(screen.getByRole('button', { name: 'কপি' }));
  expect(navigator.clipboard.writeText).toHaveBeenLastCalledWith(BUKHARI_6628);

  fireEvent.click(screen.getByRole('button', { name: 'উদ্ধৃতি কপি' }));
  expect(navigator.clipboard.writeText).toHaveBeenLastCalledWith('সহীহ বুখারী, হাদীস নং ৬,৬২৮');

  fireEvent.click(screen.getByRole('button', { name: 'লিংক কপি' }));
  expect(navigator.clipboard.writeText).toHaveBeenLastCalledWith(`${window.location.origin}/hadis/bukhari/6628`);
  expect(screen.getByRole('status')).toHaveTextContent('কপি করা হয়েছে');
});

test('a number with no data file says so and still offers previous and next (Review Focus 2)', async () => {
  serve({});
  show('bukhari', 63);
  expect(await screen.findByText(/এই হাদীসটি পাওয়া যায়নি/)).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /আগের/ })).toHaveAttribute('href', '/hadis/bukhari/62');
  expect(screen.getByRole('link', { name: /পরের/ })).toHaveAttribute('href', '/hadis/bukhari/64');
});

test('a network failure offers a retry instead of a spinner', async () => {
  global.fetch = vi.fn(() => Promise.reject(new Error('offline')));
  show('bukhari', 10);
  expect(await screen.findByRole('button', { name: 'আবার চেষ্টা করুন' })).toBeInTheDocument();
});

test('sets the page title', async () => {
  serve({ '/json/hadis/Bukhari/6628/text.txt': BUKHARI_6628 });
  show('bukhari', 6628);
  await screen.findByRole('heading', { level: 1 });
  expect(document.title).toBe('বুখারী শরীফ - হাদীস নং ৬,৬২৮ - Alhashor');
});
```

`src/hadis/PrevNext.test.jsx`:

```jsx
import { fireEvent, render, screen } from '@testing-library/react';
import { SettingsProvider } from '../settings/SettingsProvider';
import { getUrl } from '../test/nextNavigation';
import PrevNext from './PrevNext';

const show = (ui) => render(<SettingsProvider>{ui}</SettingsProvider>);

test('links to the neighbouring hadis of the same book, skipping gaps', () => {
  show(<PrevNext bookId="bukhari" number={64} />);
  expect(screen.getByRole('link', { name: /আগের/ })).toHaveAttribute('href', '/hadis/bukhari/62');
  expect(screen.getByRole('link', { name: /পরের/ })).toHaveAttribute('href', '/hadis/bukhari/65');
});

test('the first hadis has no previous link and the last has no next link', () => {
  show(<PrevNext bookId="muslim" number={1} />);
  expect(screen.queryByRole('link', { name: /আগের/ })).not.toBeInTheDocument();
  show(<PrevNext bookId="muslim" number={7281} />);
  expect(screen.queryByRole('link', { name: /পরের/ })).not.toBeInTheDocument();
});

test('the arrow keys move to the previous and next hadis', () => {
  show(<PrevNext bookId="bukhari" number={10} />);
  fireEvent.keyDown(window, { key: 'ArrowRight' });
  expect(getUrl().pathname).toBe('/hadis/bukhari/11');
  fireEvent.keyDown(window, { key: 'ArrowLeft' });
  expect(getUrl().pathname).toBe('/hadis/bukhari/9');
});

test('arrow keys are ignored while typing in a field', () => {
  show(
    <div>
      <input aria-label="box" />
      <PrevNext bookId="bukhari" number={10} />
    </div>
  );
  fireEvent.keyDown(screen.getByLabelText('box'), { key: 'ArrowRight' });
  expect(getUrl().pathname).toBe('/');
});

test('a horizontal swipe on the article area moves between hadis', () => {
  show(<PrevNext bookId="bukhari" number={10} swipeTarget="page" />);
  const area = document.body;
  fireEvent.touchStart(area, { touches: [{ clientX: 300, clientY: 200 }] });
  fireEvent.touchEnd(area, { changedTouches: [{ clientX: 120, clientY: 210 }] });
  expect(getUrl().pathname).toBe('/hadis/bukhari/11');
});

test('a mostly vertical swipe (scrolling) does nothing', () => {
  show(<PrevNext bookId="bukhari" number={10} swipeTarget="page" />);
  fireEvent.touchStart(document.body, { touches: [{ clientX: 200, clientY: 100 }] });
  fireEvent.touchEnd(document.body, { changedTouches: [{ clientX: 150, clientY: 400 }] });
  expect(getUrl().pathname).toBe('/');
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run src/hadis src/app/hadis`
Expected: FAIL (modules missing).

- [ ] **Step 3: Implement**

`src/app/hadis/[book]/[number]/page.jsx`:

```jsx
import { notFound } from 'next/navigation';
import HadisPage from '../../../../hadis/HadisPage';
import { formatNumber } from '../../../../lib/digits';
import { parseHadisParams } from '../../../../lib/hadisRoute';

export async function generateMetadata({ params }) {
  const { book: slug, number: text } = await params;
  const parsed = parseHadisParams(slug, text);
  if (!parsed) return { title: 'পৃষ্ঠাটি পাওয়া যায়নি - Alhashor' };
  return { title: `${parsed.book.full} - হাদীস নং ${formatNumber(parsed.number)} - Alhashor` };
}

export default async function Page({ params }) {
  const { book: slug, number: text } = await params;
  const parsed = parseHadisParams(slug, text);
  if (!parsed) notFound();
  return <HadisPage bookId={parsed.book.id} number={parsed.number} />;
}
```

Components (all `'use client'`, in `src/hadis/`):
- `HadisPage({ bookId, number })`: loads the text with `useHadisText(tagOf(bookId, number))`, sets `usePageTitle`-style title `<full> - হাদীস নং <n> - Alhashor` (the `useDigits`-formatted number), and renders `Breadcrumb`, then by status: `loading` a skeleton (three `.hadis-skel` lines), `missing` a message `এই হাদীসটি পাওয়া যায়নি` plus `PrevNext`, `error` a message with a `আবার চেষ্টা করুন` button that calls `loadHadisText` again (re-run by bumping a retry counter), `ok` the `ReadingProgress`, the `HadisArticle` and `PrevNext`.
- `Breadcrumb({ book, number })`: `<nav aria-label="পথ">` with an ordered list: `হোম` (link `/`), the book `full` name (link `/books`), and the current `হাদীস নং <n>` (plain text, `aria-current="page"`).
- `HadisArticle({ book, number, text })`: uses `splitHadis`; the heading `<h1>` `<full> - হাদীস নং <n>` with `BookBadge`; the saying `<p className="hadis-read">` (body); when `chain` is non-empty, a button `বর্ণনায়: <summary>` (`aria-expanded`) that reveals the full chain in a `<p>`; three quiet buttons `কপি` (whole original text), `উদ্ধৃতি কপি` (`<cite>, হাদীস নং <n>` with the formatted number), `লিংক কপি` (`${window.location.origin}${hadisHref(...)}`); each copy calls `useToast()('কপি করা হয়েছে')`; the permanent link shown as small text.
- `ReadingProgress({ words, targetId })`: shows `readingTime(words) · <words> শব্দ` and a `role="progressbar"` `aria-label="পড়ার অগ্রগতি"` thin line whose width follows the scroll position through the article (listen to `scroll`, clamp 0 to 100, `aria-valuenow`).
- `PrevNext({ bookId, number, swipeTarget })`: two `Link`s with `‹ আগের হাদীস` and `পরের হাদীস ›` and the neighbour numbers (omitted when `neighbours` returns `null`); a `keydown` listener on `window` for `ArrowLeft` (previous) and `ArrowRight` (next) that does nothing when the event target is an `input`, `textarea`, `select` or contenteditable; touch listeners on `document` when `swipeTarget === 'page'` (used by `HadisPage`): a swipe needs a horizontal distance of at least 60 px and a vertical distance under 40 px. Left swipe (finger moves left) goes next, right swipe goes previous. Navigation uses `useRouter().push(hadisHref(...))`.

Port the look from D5 (`docs/design/d5-quiet-minimal.html`, hadis screen at lines 607 to 621, CSS for `.crumb`, `.prog`, `.article`, `.chain`, `.pn`, lines 267 to 310 in D5's style block) with D2's colours, fonts, pill buttons and accent, into `src/styles/hadis.css` with the prefix `hadis-`. Include `../styles/hadis.css` in the layout imports and the stylesheet-order test.

- [ ] **Step 4: Verify**

Run: `npx vitest run && npm run lint && npm run build`
Expected: all pass, and `next build` lists `/hadis/[book]/[number]` as a dynamic route. Then run in a real browser:

```bash
scripts/with-server.sh 5056 "npx next start -p 5056" bash -c '
  curl -s -o /dev/null -w "%{http_code} " http://localhost:5056/hadis/bukhari/6628
  curl -s -o /dev/null -w "%{http_code} " http://localhost:5056/hadis/bukhari/0
  curl -s -o /dev/null -w "%{http_code} " http://localhost:5056/hadis/bukhari/99999
  curl -s -o /dev/null -w "%{http_code} " http://localhost:5056/hadis/nobook/1
  curl -s -o /dev/null -w "%{http_code}\n" http://localhost:5056/hadis/bukhari/63'
```

Expected: `200 404 404 404 200` (the gap number 63 is a valid address, and the page itself says the hadis was not found). Add these checks to `scripts/smoke.sh` (status checks, plus `expect_text /hadis/bukhari/6628 "হাদীস নং" "a hadis page renders"`), and run the smoke script: all `ok`. Take screenshots of `/hadis/bukhari/6628` and `/hadis/bukhari/307` (the long one) at 1200x900 and 390x844, and compare with the D2 and D5 hadis screens (open them in a browser from `docs/design/`, switch to the hadis screen): the page should read as D2 with D5's calm.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: hadis full page (breadcrumb, folded narrator chain, reading progress, previous/next, copy)"
```

---

### Task 11: Searching helpers: matching, snippets, filters and Roman typing

**Files:**
- Create: `src/lib/matchPattern.js`, `src/lib/matchPattern.test.js`, `src/lib/searchResults.js`, `src/lib/searchResults.test.js`, `src/lib/roman.js`, `src/lib/roman.test.js`
- Modify: `package.json` (dependency `@subhesadek/avro-phonetic`)

**Interfaces:**
- Produces in `matchPattern.js`: `buildMatcher(words): RegExp | null` (global, case-insensitive, one alternative per word; each character accepts the spelling variants of the data: য় as one character or two, ড় and ঢ় likewise, ো and ৌ as one character or two, and an optional invisible joiner between any two characters; `null` for no usable words), `highlightParts(text, matcher): Array<{ text, match }>` (parts in order that join back to exactly `text`), `makeSnippet(text, matcher, { before = 70, after = 95 }): { text, cutStart, cutEnd }` (a window around the first match, widened to word boundaries; the whole text when it is short; the start of the text when nothing matches).
- Produces in `searchResults.js`: `countByBook(tags): Record<bookId, number>` (all six ids always present), `filterByBook(tags, bookId | 'all'): string[]`.
- Produces in `roman.js`: `isRoman(text): boolean`, `curatedSuggestions(text): string[]` (from a fixed list of common terms: `namaz`, `salat`, `roja`, `roza`, `hajj`, `hoj`, `zakat`, `jannat`, `jahannam`, `iman`, `dua`, `sabr`, `munafik`, `kabor`, `gosol`, `ujur`, `ozu`, `abuhurairah`, `abuhurayra`), `romanSuggestions(text): Promise<string[]>` (curated first, then the library's conversion, without duplicates).

- [ ] **Step 1: Install the library**

```bash
npm install --no-audit --no-fund @subhesadek/avro-phonetic
```

Expected: one package added, licence MPL-2.0.

- [ ] **Step 2: Write the failing tests**

`src/lib/matchPattern.test.js`:

```js
import { buildMatcher, highlightParts, makeSnippet } from './matchPattern';

const YA_ONE = 'য়'; // য় as one character
const YA_TWO = 'য়'; // য + ়
const O_ONE = 'ো'; // ো
const O_TWO = 'ো'; // ে + া

test('no usable words gives no matcher', () => {
  expect(buildMatcher([])).toBeNull();
  expect(buildMatcher(['', '  '])).toBeNull();
});

test('finds plain words and parts of longer words', () => {
  const m = buildMatcher(['নামায']);
  expect('আমরা নামায পড়ি এবং নামাযের সময়'.match(m)).toEqual(['নামায', 'নামায']);
});

test('finds a word written with the other spelling of a letter (Review Focus 4)', () => {
  const m = buildMatcher([`ম${YA_ONE}লা`]);
  expect(`এটা ম${YA_TWO}লা`.match(m)).toHaveLength(1);
  const m2 = buildMatcher([`ক${O_TWO}ন`]);
  expect(`সে ক${O_ONE}ন`.match(m2)).toHaveLength(1);
});

test('finds a word with an invisible joiner inside it (Review Focus 4)', () => {
  const m = buildMatcher(['করা']);
  expect('সে কর‌া'.match(m)).toHaveLength(1);
});

test('characters that mean something in a pattern are matched literally', () => {
  const m = buildMatcher(['(রাঃ)', 'a.b']);
  expect('আনাস (রাঃ) থেকে'.match(m)).toEqual(['(রাঃ)']);
  expect('axb'.match(m)).toBeNull();
});

test('highlightParts rebuilds the original text exactly', () => {
  const text = 'তিনি বলেন, নামায পড়ো এবং নামায ছাড়ো না।';
  const parts = highlightParts(text, buildMatcher(['নামায']));
  expect(parts.map((p) => p.text).join('')).toBe(text);
  expect(parts.filter((p) => p.match).map((p) => p.text)).toEqual(['নামায', 'নামায']);
});

test('highlightParts with no matcher returns the text as one plain part', () => {
  expect(highlightParts('কথা', null)).toEqual([{ text: 'কথা', match: false }]);
});

test('a short text is returned whole', () => {
  const snippet = makeSnippet('ছোট নামায কথা', buildMatcher(['নামায']));
  expect(snippet).toEqual({ text: 'ছোট নামায কথা', cutStart: false, cutEnd: false });
});

test('a long text gets a window around the first match, cut at word boundaries', () => {
  const filler = (n) => Array.from({ length: n }, (_, i) => `শব্দ${i}`).join(' ');
  const text = `${filler(60)} নামায ${filler(60)}`;
  const snippet = makeSnippet(text, buildMatcher(['নামায']));
  expect(snippet.cutStart).toBe(true);
  expect(snippet.cutEnd).toBe(true);
  expect(snippet.text).toContain('নামায');
  expect(snippet.text.length).toBeLessThan(260);
  expect(snippet.text.startsWith(' ')).toBe(false);
  expect(/\s$/.test(snippet.text)).toBe(false);
});

test('when nothing matches the snippet is the start of the text', () => {
  const text = Array.from({ length: 200 }, (_, i) => `শব্দ${i}`).join(' ');
  const snippet = makeSnippet(text, buildMatcher(['অমিল']));
  expect(text.startsWith(snippet.text)).toBe(true);
  expect(snippet.cutStart).toBe(false);
  expect(snippet.cutEnd).toBe(true);
});
```

`src/lib/searchResults.test.js`:

```js
import { countByBook, filterByBook } from './searchResults';

const tags = ['BUK-1', 'BUK-2', 'MUS-5', 'TIR-7', 'BUK-9', 'NAS-3'];

test('counts per book always list all six books', () => {
  expect(countByBook(tags)).toEqual({ bukhari: 3, muslim: 1, tirmidhi: 1, abudawud: 0, ibnmajah: 0, nasai: 1 });
  expect(countByBook([])).toEqual({ bukhari: 0, muslim: 0, tirmidhi: 0, abudawud: 0, ibnmajah: 0, nasai: 0 });
});

test('unknown tags are ignored in the counts', () => {
  expect(countByBook(['XXX-1', 'BUK-1']).bukhari).toBe(1);
});

test('filtering keeps the order and "all" keeps everything', () => {
  expect(filterByBook(tags, 'bukhari')).toEqual(['BUK-1', 'BUK-2', 'BUK-9']);
  expect(filterByBook(tags, 'all')).toEqual(tags);
  expect(filterByBook(tags, 'abudawud')).toEqual([]);
});
```

`src/lib/roman.test.js`:

```js
import { curatedSuggestions, isRoman, romanSuggestions } from './roman';

test('recognises text typed in Roman letters', () => {
  expect(isRoman('namaz')).toBe(true);
  expect(isRoman('abu hurairah')).toBe(true);
  expect(isRoman('নামায')).toBe(false);
  expect(isRoman('namaz নামায')).toBe(false);
  expect(isRoman('১২৩')).toBe(false);
  expect(isRoman('   ')).toBe(false);
});

test('common terms give the spellings found in the hadis', () => {
  expect(curatedSuggestions('namaz')).toEqual(['নামায', 'নামাজ', 'সালাত']);
  expect(curatedSuggestions('Roja')).toEqual(['রোজা', 'রোযা']);
  expect(curatedSuggestions('unknownword')).toEqual([]);
});

test('romanSuggestions lists curated spellings first, then the converter, without repeats', async () => {
  const result = await romanSuggestions('namaz');
  expect(result.slice(0, 3)).toEqual(['নামায', 'নামাজ', 'সালাত']);
  expect(new Set(result).size).toBe(result.length);
});

test('words outside the list are converted by the phonetic library', async () => {
  const result = await romanSuggestions('kitab');
  expect(result).toContain('কিতাব');
});

test('Bengali or empty input has no suggestions', async () => {
  expect(await romanSuggestions('নামায')).toEqual([]);
  expect(await romanSuggestions('')).toEqual([]);
});
```

- [ ] **Step 3: Run them to verify they fail**

Run: `npx vitest run src/lib/matchPattern.test.js src/lib/searchResults.test.js src/lib/roman.test.js`
Expected: FAIL (modules missing).

- [ ] **Step 4: Implement**

`src/lib/matchPattern.js`:

```js
import { normalizeBengali } from '../Helpers/bengali';

const JOINER = '[\\u200c\\u200d]*';
const escape = (char) => char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Normalized unit -> regular-expression text accepting every way the data spells it.
const UNITS = [
  ['য়', '(?:\\u09af\\u09bc|\\u09df)'], // য়
  ['ড়', '(?:\\u09a1\\u09bc|\\u09dc)'], // ড়
  ['ঢ়', '(?:\\u09a2\\u09bc|\\u09dd)'], // ঢ়
  ['ো', '(?:\\u09cb|\\u09c7\\u09be)'], // ো
  ['ৌ', '(?:\\u09cc|\\u09c7\\u09d7)'], // ৌ
];

function wordPattern(word) {
  const normalized = normalizeBengali(word);
  const pieces = [];
  for (let i = 0; i < normalized.length;) {
    const unit = UNITS.find(([canonical]) => normalized.startsWith(canonical, i));
    if (unit) {
      pieces.push(unit[1]);
      i += unit[0].length;
    } else {
      pieces.push(escape(normalized[i]));
      i += 1;
    }
  }
  return pieces.join(JOINER);
}

export function buildMatcher(words) {
  const patterns = words.map((w) => w.trim()).filter(Boolean).map(wordPattern);
  return patterns.length ? new RegExp(patterns.join('|'), 'gi') : null;
}

export function highlightParts(text, matcher) {
  if (!matcher) return [{ text, match: false }];
  const parts = [];
  let last = 0;
  for (const match of text.matchAll(matcher)) {
    if (match[0] === '') continue;
    if (match.index > last) parts.push({ text: text.slice(last, match.index), match: false });
    parts.push({ text: match[0], match: true });
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push({ text: text.slice(last), match: false });
  return parts.length ? parts : [{ text, match: false }];
}

export function makeSnippet(text, matcher, { before = 70, after = 95 } = {}) {
  const limit = before + after + 40;
  if (text.length <= limit) return { text, cutStart: false, cutEnd: false };
  const first = matcher ? new RegExp(matcher.source, 'i').exec(text) : null;
  if (!first) {
    const end = text.lastIndexOf(' ', before + after);
    return { text: text.slice(0, end > 0 ? end : before + after), cutStart: false, cutEnd: true };
  }
  let start = Math.max(0, first.index - before);
  let end = Math.min(text.length, first.index + first[0].length + after);
  if (start > 0) {
    const space = text.indexOf(' ', start);
    if (space !== -1 && space < first.index) start = space + 1;
  }
  if (end < text.length) {
    const space = text.lastIndexOf(' ', end);
    if (space > first.index + first[0].length) end = space;
  }
  return { text: text.slice(start, end).trim(), cutStart: start > 0, cutEnd: end < text.length };
}
```

`src/lib/searchResults.js`:

```js
import { BOOKS } from './books';
import { parseTag } from './hadisRoute';

export function countByBook(tags) {
  const counts = Object.fromEntries(BOOKS.map((book) => [book.id, 0]));
  for (const tag of tags) {
    const parsed = parseTag(tag);
    if (parsed) counts[parsed.book.id] += 1;
  }
  return counts;
}

export function filterByBook(tags, bookId) {
  if (bookId === 'all') return tags;
  return tags.filter((tag) => parseTag(tag)?.book.id === bookId);
}
```

`src/lib/roman.js`:

```js
const CURATED = {
  namaz: ['নামায', 'নামাজ', 'সালাত'],
  salat: ['সালাত', 'নামায'],
  roja: ['রোজা', 'রোযা'],
  roza: ['রোজা', 'রোযা'],
  hajj: ['হজ্জ', 'হাজ্জ'],
  hoj: ['হজ্জ'],
  zakat: ['যাকাত'],
  jannat: ['জান্নাত'],
  jahannam: ['জাহান্নাম'],
  iman: ['ঈমান'],
  dua: ['দোয়া'],
  sabr: ['ধৈর্য', 'সবর'],
  munafik: ['মুনাফিক'],
  kabor: ['কবর'],
  gosol: ['গোসল'],
  ujur: ['উযূ'],
  ozu: ['উযূ'],
  abuhurairah: ['আবূ হুরায়রা'],
  abuhurayra: ['আবূ হুরায়রা'],
};

export function isRoman(text) {
  return /^[a-z0-9\s'.-]+$/i.test(text) && /[a-z]/i.test(text);
}

export function curatedSuggestions(text) {
  return CURATED[text.trim().toLowerCase()] || [];
}

export async function romanSuggestions(text) {
  const value = text.trim();
  if (!isRoman(value)) return [];
  const suggestions = [...curatedSuggestions(value)];
  const { toBangla } = await import('@subhesadek/avro-phonetic'); // loaded only when someone types Roman letters
  const converted = toBangla(value);
  if (converted && !suggestions.includes(converted)) suggestions.push(converted);
  return suggestions;
}
```

- [ ] **Step 5: Verify and commit**

Run: `npx vitest run && npm run lint && npm run build`
Expected: all pass. If a `makeSnippet` boundary assertion is off by a space, fix the implementation (not the test) until the window reads cleanly.

```bash
git add package.json package-lock.json src/lib
git commit -m "feat: spelling-tolerant matching, snippets, per-book counts and Roman-letter typing"
```

---

### Task 12: The search page

**Files:**
- Create: `src/search/SearchPage.jsx`, `src/search/SearchBox.jsx`, `src/search/ResultItem.jsx`, `src/search/BookFilter.jsx`, `src/search/Pager.jsx`, `src/search/SearchPage.test.jsx`, `src/styles/search.css`
- Modify: `src/app/search/page.jsx`, `src/app/layout.jsx` (styles), `src/app/pages.test.jsx`
- Delete: `src/Search/Search.jsx`, `src/Search/Search.css`, `src/Search/Suggestions.jsx`, `src/Search/suggestions.css`, `src/Search/Search.test.jsx`, `src/Search/Suggestions.test.jsx` (the new tests carry every behavior over). Keep `src/Search/searchIndex.js` and its test.

**Interfaces:**
- Consumes: `searchTags`, `normalizeQuery` (`src/Search/searchIndex.js`), `useUrlParams` (`src/Helpers/useUrlParams.js`), `buildMatcher`, `highlightParts`, `makeSnippet`, `countByBook`, `filterByBook`, `romanSuggestions`, `isRoman`, `useHadisText`, `hadisHref`, `parseTag`, `splitHadis`, `BOOKS`, `BookBadge`, `Chip`, `Button`, `useDigits`, `useToast`, `pageFromParam`, `pageSlice`, `usePageTitle`.
- Produces: `SearchPage` (client component used by `src/app/search/page.jsx` inside `Suspense`).

**Behavior to carry over from the old page (each has a test below):** the address is the source of truth (`/search?q=<words>&book=<id>&page=<n>`); an empty submit does nothing; a new search goes back to page 1 and clears the book filter; a slow earlier search cannot overwrite a newer one; `মোট <n> টি হাদিস পাওয়া গেছে` and `<a> - <b> পর্যন্ত দেখানো হচ্ছে`; 20 per page; a page past the end shows the last page; the loading indicator while searching; the not-found note when nothing matches; example chips before the first search; titles `হাদীস সার্চ - Alhashor` and `<words> - হাদীস সার্চ - Alhashor`; each result links to its hadis page; copy on each result.

**New behavior:** the Bengali-only note; Roman-letter suggestions under the box while typing Roman letters (chips that replace the box text); a filter chip row `সব <total>` plus one chip per book with its count (a book with zero hits is shown disabled); `book=<id>` in the address narrows the list and the counts stay for the whole search; results as an unboxed hairline list (D5) whose items show the book badge and title (a link), a snippet of the text around the match with matched words highlighted, `সম্পূর্ণ হাদীস দেখুন...` linking to the hadis page when the snippet is cut, and quiet `কপি` and `হাদীস পাতা` links.

- [ ] **Step 1: Write the failing tests**

`src/search/SearchPage.test.jsx`: carry over every test from `src/Search/Search.test.jsx` (empty search does nothing; results and count; not-found note; no note while running; stale search cannot overwrite; address tests for link, submit, page, next, clamp, new search resets, suggestion fills the box; StrictMode once) adapted to the new markup (the submit button is named `খুঁজুন`; the box has the accessible name `খোঁজার শব্দ`; the pager buttons are named `আগের` and `পরের`; result items are `listitem`s), using the same `serve` and `servePaged` helpers (hadis `n` has the text `t<n>`; search `q=pagedword` finds 45 hadis). Then add these tests:

```jsx
test('filter chips show the count per book and narrow the list (book=<id> in the address)', async () => {
  // 'bookword' matches BUK-1, BUK-2, MUS-5
  renderSearch('/search?q=bookword');
  expect(await screen.findByRole('button', { name: /সব\s*৩/ })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /বুখারী\s*২/ })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /মুসলিম\s*১/ })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /আবু দাউদ\s*০/ })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: /মুসলিম\s*১/ }));
  expect(where()).toHaveTextContent(/^\/search\?q=bookword&book=muslim$/);
  expect(await screen.findByText(/মোট ১ টি হাদিস পাওয়া গেছে/)).toBeInTheDocument();
});

test('a result shows a snippet with the matched word highlighted and links to the hadis page', async () => {
  // hadis text contains the word "snipword" inside 300 words of filler
  renderSearch('/search?q=snipword');
  const mark = await screen.findByText('snipword', { selector: 'mark' });
  expect(mark).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /সম্পূর্ণ হাদীস দেখুন/ })).toHaveAttribute('href', '/hadis/bukhari/1');
});

test('a word spelled with the other form of a letter is highlighted too (Review Focus 4)', async () => {
  // data holds ময়লা; the query uses ময়লা
  renderSearch('/search?q=' + encodeURIComponent('ময়লা'));
  expect(await screen.findByText('ময়লা', { selector: 'mark' })).toBeInTheDocument();
});

test('typing Roman letters offers Bengali spellings that fill the box', async () => {
  renderSearch();
  fireEvent.change(screen.getByRole('textbox', { name: 'খোঁজার শব্দ' }), { target: { value: 'namaz' } });
  fireEvent.click(await screen.findByRole('button', { name: 'নামাজ' }));
  expect(screen.getByRole('textbox', { name: 'খোঁজার শব্দ' })).toHaveValue('নামাজ');
});

test('the Bengali-only note and the example chips show before the first search', () => {
  renderSearch();
  expect(screen.getByText(/বাংলায় লিখে সার্চ করুন/)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'নফল নামায' })).toBeInTheDocument();
});

test('the loading indicator says "খুঁজছি..." while a search runs', async () => {
  global.fetch = vi.fn(() => new Promise(() => {}));
  renderSearch('/search?q=slowword');
  expect(await screen.findByText('খুঁজছি...')).toBeInTheDocument();
});

test('the list is an unboxed list of results', async () => {
  servePaged('listword', 3);
  renderSearch('/search?q=listword');
  expect(await screen.findAllByRole('listitem')).toHaveLength(3);
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run src/search`
Expected: FAIL (modules missing).

- [ ] **Step 3: Implement**

Structure:
- `SearchPage`: reads `q`, `page`, `book` from `useUrlParams()`; `words = normalizeQuery(q)`; runs `searchTags(words)` in an effect with the same cancellation pattern as the old page; derives `counts = countByBook(tags)`, `visible = filterByBook(tags, book)`, `page = pageFromParam(params.get('page'), visible.length)`, `slice = pageSlice(visible, page)`; `setParams` builds `{ q }`, plus `book` when not `all`, plus `page` when greater than 1. The search box submit clears `book` and `page`. Sets the title with `usePageTitle(words.join(' '), 'হাদীস সার্চ')`.
- `SearchBox`: a controlled input named `খোঁজার শব্দ`, submit button `খুঁজুন`, the Bengali-only note, example chips (`রোজা`, `নফল নামায`, `লায়লাতুল কদর`, `১৫০`, `২৪২২`, `আবু হুরায়রা`, `আয়েশা (রাঃ)`, `প্রত্যেক কাজ নিয়তের সাথে সম্পর্কিত`, `ইসলামের ভিত্তি পাঁচটি`) shown while there is no query, and the Roman-letter chips from `romanSuggestions` (resolved in an effect, ignoring stale results).
- `BookFilter`: a `role="group"` row: `Chip`s `সব <n>` and one per book (`<name> <n>`, a colour dot, `disabled` at zero); clicking calls back with the book id or `'all'`.
- `ResultItem`: a `<li>` with `BookBadge`, a title `Link` to `hadisHref`, and the text from `useHadisText(tag)`: loading shows a skeleton line, `missing` shows `এই হাদীসটি পাওয়া যায়নি`, `ok` shows `splitHadis(text).body` (chain dropped so the snippet is about the saying) through `makeSnippet(body, matcher)` rendered with `highlightParts` as `<mark>` for matched parts (no `dangerouslySetInnerHTML`); when the snippet is cut, a `সম্পূর্ণ হাদীস দেখুন...` link to the hadis page; quiet `কপি` button (copies the whole original text and shows the toast `কপি করা হয়েছে`).
- `Pager`: `<nav aria-label="পাতা">` with `আগের`, `পাতা <n> / <m>` and `পরের`; disabled at the ends; scrolls to the top when changing pages.
- The count line: `মোট <n> টি হাদিস পাওয়া গেছে` with the second line `<a> - <b> পর্যন্ত দেখানো হচ্ছে`, numbers through `useDigits`.
- States: the not-found note (`কোনো ফলাফল পাওয়া যায়নি। বানান পরিবর্তন করে বা অন্য শব্দ দিয়ে খুঁজুন।`) only when a search finished with zero hits; `খুঁজছি...` with a thin animated line while searching.

Port the look from D2's search CSS (lines 235 to 266: `.sbox`, chips, `.srch-ind`, `.dym`) for the box, chips and indicator, and D5's list (`docs/design/d5-quiet-minimal.html`, `results()` at lines 593 to 604 and the `.list`, `.card`, `.cnt`, `.pager`, `.filters` rules) for the results, into `src/styles/search.css` with the prefix `search-`. Update `src/app/search/page.jsx` to render `SearchPage`, update the layout imports and the stylesheet-order test (remove `Search.css` and `suggestions.css`, add `search.css`), and delete the old files listed above.

- [ ] **Step 4: Verify**

Run: `npx vitest run && npm run lint && npm run build`
Expected: all pass.

Then in a real browser:

```bash
scripts/with-server.sh 5056 "npx next start -p 5056" scripts/smoke.sh http://localhost:5056
scripts/with-server.sh 5056 "npx next start -p 5056" scripts/check-self-contained.sh http://localhost:5056 "/hadis/bukhari/6628" "/hadis/bukhari/307"
```

Expected: every line `ok`. Take screenshots of `/search`, `/search?q=%E0%A6%B0%E0%A7%8B%E0%A6%9C%E0%A6%BE` (results) at 1200x900 and 390x844, and compare with D2's search screens and D5's results screen: the page should read as D2 with D5's calm list.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: redesigned search (Roman-letter typing, book filters, snippets, calm result list)"
```

---

### Task 13: Quality pass, record and merge

**Files:**
- Modify: `docs/redesign-plan.md` (phase 2 result and deviations), `scripts/screenshots.sh` (optional size argument, if not already done in Task 9)

- [ ] **Step 1: Every theme at both widths**

For each of `light`, `dark`, `sepia` set the theme through the saved settings (`localStorage` key `alhashor.settings`, e.g. `{"theme":"dark"}`) and take screenshots of `/`, `/search`, `/search?q=...`, `/hadis/bukhari/307` at 390x844 and 1200x900. Add to `scripts/screenshots.sh` an optional fourth argument `<theme>` that passes `--user-data-dir` preseeded with that settings value (or load the page with a tiny query flag `?theme=` read by the settings provider in development only is NOT allowed; preseed storage instead). Read each image: check contrast (text readable on the background), the focus ring, the highlight colour (`mark`) and the book colours in dark and sepia. Fix any token that fails in `tokens.css`, each fix with a test in `tokens.test.js` only when it is a missing variable.

- [ ] **Step 2: Accessibility pass**

Run a keyboard walk in a real browser through `/`, `/search` and a hadis page using only Tab, Enter, Space and the arrow keys (document what works in the commit message). Check: a visible focus ring on every control, the tab order follows the visual order, buttons and links have accessible names, the current page is announced in the navigation, `prefers-reduced-motion` removes animation, and text can be enlarged to 200% without loss.

- [ ] **Step 3: Full verification and record**

```bash
npx vitest run && npm run lint && npm run build
scripts/with-server.sh 5056 "npx next start -p 5056" scripts/check-self-contained.sh http://localhost:5056
scripts/with-server.sh 5056 "npx next start -p 5056" scripts/smoke.sh http://localhost:5056
```

Expected: all green. In `docs/redesign-plan.md` mark phase 2 as done (phases table: `0B`, `1`, `2`, `3` rows for what was built), and add to section 12 every departure from the designs made during this phase (for example previous/next staying inside one book, no related list yet, no daily card yet, the real counts, the theme attribute name, anything changed for contrast).

- [ ] **Step 4: Commit and merge locally**

```bash
git add -A
git commit -m "docs: phase 2 done (design system, shell, home, hadis page, search)"
git checkout main && git merge --ff-only phase2/design-system && git log --oneline -3
```

Expected: a fast-forward merge. Nothing is pushed.

---

## Self-Review

**Spec coverage** (`docs/redesign-plan.md` sections 1 to 4 and 6): design tokens and three themes (Tasks 1 to 3); book colours (Tasks 2 and 4); fonts self-hosted (Task 1); shell with top navigation, phone tab bar, footer and back-to-top (Task 8); reading settings and digits (Tasks 3 and 5; the settings *page* is Phase 3); Home with hero, tiles and bookshelf (Task 9); hadis full page with breadcrumb, folded chain, reading time and progress, previous and next with swipe and keys, copy, citation and link (Task 10); search with Roman typing, book filters with counts, snippets and the D5 list (Tasks 11 and 12); self-contained rule (Tasks 1, 12 and 13). Deferred on purpose to Phase 3: daily card, settings page, share sheet and quote card, compare, plans and the Books and Topics redesign. Deferred to Phase 4: related hadis, forgiving search, proximity, the Web Worker.

**Placeholder scan:** code is given for every piece of logic and every test. The visual tasks (8, 9, 10, 12) name the exact D2 and D5 line ranges to port and the structure and behavior contracts the tests pin. The one conditional (a dead font URL in Task 1, a snippet boundary off by a space in Task 11) names the cause and where to fix it.

**Name consistency:** `BOOKS`/`bookById`/`bookByCode`/`hasHadis`/`hadisCount` (Task 4) are the names used in Tasks 8, 9, 10, 11 and 12. `formatNumber`/`useDigits` (Task 5) are used in Tasks 6, 8, 9, 10 and 12. `splitHadis` returns `{ number, chain, body, summary }` and Task 10 and Task 12 read those keys. `loadHadisText`/`useHadisText` return `status` values `loading|ok|missing|error` everywhere. `hadisHref` and `tagOf` produce `/hadis/<slug>/<n>` and `BUK-<n>` consistently.

**Review Focus coverage:** 1 (Task 4 tests and Task 10 route tests and the curl checks), 2 (Tasks 4, 7 and 10), 3 (Tasks 6 and 10), 4 (Tasks 11 and 12), 5 (Task 3).
