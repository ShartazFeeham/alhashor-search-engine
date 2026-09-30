# Next.js Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the site from React + Vite + react-router to Next.js (App Router), with no change in behavior, so the redesign and the server features that come later are built once.

**Architecture:** Every page and component stays a Client Component for now. The Vite entry (`index.html`, `App.jsx`, `index.jsx`) is replaced by the Next.js App Router (`src/app/...`). `react-router-dom` hooks and links are replaced by `next/navigation` and `next/link`, behind one small hook (`useUrlParams`) so Search and Topics change as little as possible. Tests keep running on Vitest, with an in-memory stand-in for the Next router.

**Tech Stack:** Next.js 16 (App Router), React 19, Vitest 3 + jsdom + Testing Library 16, ESLint 9, plain JavaScript (no TypeScript).

**Spec:** [docs/redesign-plan.md](../../redesign-plan.md), sections 10 (Next.js first) and 11 (self-contained rule).

## Global Constraints

- **Behavior does not change.** Every page, URL, Bengali text and keyboard behavior that works today keeps working. The 104 existing tests keep passing, and are edited only where the router changes.
- **Versions:** Next.js 16.x, React 19.x, Node `>=20.9` (CI uses Node 20 through `.nvmrc`).
- **Self-contained:** no database, no outside services, no CDN or web fonts. `public/json/**` and `public/photos/**` stay in `public/` and are requested with absolute paths (`/json/...`, `/photos/...`).
- **Client Components only.** No async Server Components in this phase (Vitest can't test them).
- **Keep Bootstrap and react-bootstrap** in this phase. They are removed later, in the design-system phase.
- **CSS order is preserved:** `index.css` first, then Bootstrap, then component CSS.
- **Local only:** commit on a branch named `migrate/nextjs`. No push, no deploy.
- **Language and copy:** all visible text stays Bengali exactly as it is now.
- **Tests:** Vitest globals with Testing Library. Write the failing test first, watch it fail, then implement.

## Review Focus

The inputs and conditions most likely to bite that no feature test in the spec names. Each has a test or check in the task named in brackets.

1. **Reloading a deep link with a Bengali query** (`/search?q=রোজা&page=2`) must render the results, not a blank page. [Task 8 smoke check]
2. **`useSearchParams` without a `Suspense` boundary breaks `next build`.** The pages must wrap Search and Topics in `Suspense`. [Task 6, build step]
3. **A missing data file must be a real 404**, not an HTML page with status 200 (the Vite/Netlify setup used to return `index.html`). Search treats a failed load as "no hadis for that word", so an unknown word must show the not-found note. [Task 8 smoke check]
4. **`next/link` and the router inside unit tests.** Without a stand-in, a clicked link tries a real browser navigation in jsdom. [Task 2 harness]
5. **React StrictMode runs effects twice in development.** A search must still download each data file only once. [Task 5 StrictMode test]

---

## File Structure

| File | Responsibility |
|---|---|
| `next.config.mjs` (new) | Next.js settings |
| `vitest.config.js` (new) | Test runner settings (replaces the test block in `vite.config.js`) |
| `vite.config.js` (delete, Task 6) | Old app build config |
| `src/app/layout.jsx` (new) | Root layout: `<html lang="bn">`, global CSS, site metadata, navigation, back-to-top |
| `src/app/page.jsx`, `search/page.jsx`, `books/page.jsx`, `topics/page.jsx` (new) | One route each; wrap client screens, with `Suspense` where the screen reads the query string |
| `src/app/not-found.jsx` (new) | Not-found page |
| `src/Helpers/BackToTop.jsx` (new) | The floating back-to-top button (was inline in `index.jsx`) |
| `src/Helpers/useUrlParams.js` (new) | Read the address's query string and change it with the router |
| `src/Helpers/basePath.js` (new) | `BASE_PATH` for data and image URLs |
| `src/test/nextNavigation.js`, `src/test/nextLink.jsx` (new) | In-memory stand-ins for `next/navigation` and `next/link` in tests |
| `src/setupTests.js` (modify) | Registers the stand-ins and resets the address before each test |
| `scripts/with-server.sh`, `screenshots.sh`, `compare-screenshots.py`, `check-self-contained.sh` (new) | Checks that run against a real server and headless Chrome |
| `src/Search/Search.jsx`, `src/Topics/Topics.jsx` (modify) | Use `useUrlParams` |
| `src/Navbar/Navbar.jsx`, `src/Home/Home.jsx`, `src/NotFound/NotFound.jsx` (modify) | Use `next/link` |
| `src/App.jsx`, `src/index.jsx`, `index.html` (delete, Task 6); `src/App.test.jsx` (delete, Task 4) | Replaced by the App Router files and new tests |

---

### Task 1: Branch, dependencies, test config and screenshot tools

**Files:**
- Create: `vitest.config.js`, `scripts/with-server.sh`, `scripts/screenshots.sh`, `scripts/compare-screenshots.py`
- Modify: `package.json`, `package-lock.json`

**Interfaces:**
- Produces: `scripts/with-server.sh <port> "<start command>" <command...>` runs a command while a server is up. `scripts/screenshots.sh <base-url> <out-dir>` writes `home.png`, `topics.png`, `search.png`, `books.png`, `not-found.png`. `scripts/compare-screenshots.py <dir-a> <dir-b>` prints the pixel differences per image. Later tasks rely on all three.

- [ ] **Step 1: Create the branch**

```bash
git checkout main && git checkout -b migrate/nextjs
```

- [ ] **Step 2: Write the three helper scripts**

`scripts/with-server.sh`:

```bash
#!/bin/bash
# Usage: scripts/with-server.sh <port> "<start command>" <command...>
# Starts a server, waits until it answers, runs the command, then stops the server.
set -u
PORT="$1"; START="$2"; shift 2
bash -c "exec $START" >/dev/null 2>&1 &
cleanup() { lsof -ti "tcp:$PORT" | xargs kill 2>/dev/null; }
trap cleanup EXIT
for _ in $(seq 1 90); do
  curl -s -o /dev/null "http://localhost:$PORT/" && break
  sleep 1
done
"$@"
```

`scripts/screenshots.sh`:

```bash
#!/bin/bash
# Usage: scripts/screenshots.sh <base-url> <out-dir>
# Takes 1200x900 screenshots of the main pages with headless Chrome.
set -u
BASE="$1"; OUT="$2"
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
mkdir -p "$OUT"
shoot() { # <name> <route>
  local name="$1" route="$2" file="$OUT/$1.png" profile pid
  profile="$(mktemp -d)"
  rm -f "$file"
  "$CHROME" --headless=new --disable-gpu --no-sandbox --hide-scrollbars \
    --user-data-dir="$profile" --window-size=1200,900 --virtual-time-budget=5000 \
    --screenshot="$file" "$BASE$route" >/dev/null 2>&1 &
  pid=$!
  for _ in $(seq 1 30); do [ -s "$file" ] && break; sleep 1; done
  kill "$pid" 2>/dev/null
  pkill -9 -f "$profile" 2>/dev/null
  rm -rf "$profile"
  if [ -s "$file" ]; then echo "ok   $name"; else echo "FAIL $name"; fi
}
shoot home /
shoot topics /topics
shoot search /search
shoot books /books
shoot not-found /no-such-page
```

`scripts/compare-screenshots.py`:

```python
#!/usr/bin/env python3
"""Usage: compare-screenshots.py <dir-a> <dir-b>
Prints, for each image in dir-a, how many pixels differ in dir-b and by how much."""
import os
import sys
from PIL import Image, ImageChops

a_dir, b_dir = sys.argv[1], sys.argv[2]
worst = 0
for name in sorted(os.listdir(a_dir)):
    if not name.endswith(".png"):
        continue
    a = Image.open(os.path.join(a_dir, name)).convert("RGB")
    b = Image.open(os.path.join(b_dir, name)).convert("RGB")
    if a.size != b.size:
        print(f"{name:16} size differs {a.size} vs {b.size}")
        worst = 1
        continue
    diff = ImageChops.difference(a, b)
    values = [max(p) for p in diff.getdata() if p != (0, 0, 0)]
    share = 100 * len(values) / (a.size[0] * a.size[1])
    biggest = max(values) if values else 0
    print(f"{name:16} differing pixels: {len(values):7} ({share:5.2f}%)  largest channel difference: {biggest}/255")
    if biggest > 40:
        worst = 1
sys.exit(worst)
```

- [ ] **Step 3: Make the scripts executable and capture the baseline screenshots from the current (Vite) build**

```bash
chmod +x scripts/with-server.sh scripts/screenshots.sh scripts/compare-screenshots.py
npm run build
scripts/with-server.sh 5055 "npx vite preview --port 5055" scripts/screenshots.sh http://localhost:5055 /tmp/shots-before
```

Expected: five `ok` lines, and five PNG files in `/tmp/shots-before`.

- [ ] **Step 4: Install the new dependencies**

```bash
npm install next@16 react@19 react-dom@19
npm install @testing-library/react@16 @testing-library/dom@10
```

- [ ] **Step 5: Create the test config**

`vitest.config.js`:

```js
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.js',
    restoreMocks: true,
  },
});
```

- [ ] **Step 6: Confirm the existing tests still pass on React 19**

Run: `npx vitest run`
Expected: `Tests 104 passed (104)`. The test runner now reads `vitest.config.js` (it takes priority over `vite.config.js`). If something fails on React 19, read the failure and fix it in this task before committing. Likely causes are the `act` import or a removed legacy API.

- [ ] **Step 7: Commit**

```bash
git add scripts vitest.config.js package.json package-lock.json
git commit -m "chore: add Next.js 16, React 19 and screenshot/check scripts"
```

---

### Task 2: Test stand-ins for the Next router and links

**Files:**
- Create: `src/test/nextNavigation.js`, `src/test/nextLink.jsx`, `src/test/nextNavigation.test.jsx`
- Modify: `src/setupTests.js`

**Interfaces:**
- Produces: `setUrl(path: string): void` sets the current address (and notifies readers). `getUrl(): URL` returns it. `getHistory(): string[]` returns the addresses pushed so far. The module also exports `useSearchParams()`, `usePathname()` and `useRouter()` (with `push(path)` and `replace(path)`), matching `next/navigation`. `src/test/nextLink.jsx` default-exports a `Link` component matching `next/link`. After this task every test file automatically gets `next/navigation` and `next/link` replaced by these, and the address reset to `/` before each test.

- [ ] **Step 1: Write the failing test**

`src/test/nextNavigation.test.jsx`:

```jsx
import { act, fireEvent, render, screen } from '@testing-library/react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { getHistory, getUrl, setUrl } from './nextNavigation';

function Probe() {
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  return (
    <div>
      <span data-testid="where">{pathname + '?' + params.toString()}</span>
      <button onClick={() => router.push('/books?x=1')}>push</button>
      <button onClick={() => router.replace('/topics?y=2')}>replace</button>
      <Link href="/search?q=a">link</Link>
    </div>
  );
}

test('readers see the current address', () => {
  setUrl('/search?q=abc');
  render(<Probe />);
  expect(screen.getByTestId('where')).toHaveTextContent('/search?q=abc');
});

test('router.push changes the address, re-renders readers and records history', () => {
  render(<Probe />);
  fireEvent.click(screen.getByText('push'));
  expect(screen.getByTestId('where')).toHaveTextContent('/books?x=1');
  expect(getHistory()).toHaveLength(1);
});

test('router.replace changes the address without adding history', () => {
  render(<Probe />);
  fireEvent.click(screen.getByText('replace'));
  expect(screen.getByTestId('where')).toHaveTextContent('/topics?y=2');
  expect(getHistory()).toHaveLength(0);
});

test('a Link click navigates without a page load', () => {
  render(<Probe />);
  fireEvent.click(screen.getByText('link'));
  expect(getUrl().pathname + getUrl().search).toBe('/search?q=a');
  expect(screen.getByTestId('where')).toHaveTextContent('/search?q=a');
});

test('the address is reset to / before each test', () => {
  expect(getUrl().pathname).toBe('/');
  expect(getHistory()).toHaveLength(0);
});

test('setUrl outside React is seen by a mounted reader', () => {
  render(<Probe />);
  act(() => setUrl('/books'));
  expect(screen.getByTestId('where')).toHaveTextContent('/books');
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/test`
Expected: FAIL (`Failed to resolve import "./nextNavigation"`).

- [ ] **Step 3: Write the stand-ins**

`src/test/nextNavigation.js`:

```js
import { useSyncExternalStore } from 'react';

// In-memory stand-in for next/navigation, used by every test (see setupTests.js).
let url = new URL('http://localhost/');
let history = [];
const listeners = new Set();

const notify = () => listeners.forEach((listener) => listener());
const subscribe = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export function setUrl(path) {
  url = new URL(path, 'http://localhost');
  notify();
}

export function getUrl() {
  return url;
}

export function getHistory() {
  return history;
}

export function resetNavigation() {
  history = [];
  setUrl('/');
}

const router = {
  push(path) {
    history = [...history, url.href];
    setUrl(path);
  },
  replace(path) {
    setUrl(path);
  },
};

export function useRouter() {
  return router;
}

export function usePathname() {
  useSyncExternalStore(subscribe, () => url.href);
  return url.pathname;
}

export function useSearchParams() {
  useSyncExternalStore(subscribe, () => url.href);
  return new URLSearchParams(url.search);
}
```

`src/test/nextLink.jsx`:

```jsx
import { useRouter } from 'next/navigation';

// Stand-in for next/link: a plain anchor that navigates through the test router.
export default function Link({ href, children, onClick, ...rest }) {
  const router = useRouter();
  return (
    <a
      href={href}
      {...rest}
      onClick={(event) => {
        if (onClick) onClick(event);
        if (event.defaultPrevented) return;
        event.preventDefault();
        router.push(href);
      }}
    >
      {children}
    </a>
  );
}
```

`src/setupTests.js` (replace the whole file):

```js
// Adds DOM matchers such as toBeInTheDocument() and toHaveTextContent() to expect.
import '@testing-library/jest-dom';
import { beforeEach, vi } from 'vitest';
import { resetNavigation } from './test/nextNavigation';

// Every test runs against in-memory versions of the Next.js router and link.
vi.mock('next/navigation', () => import('./test/nextNavigation'));
vi.mock('next/link', () => import('./test/nextLink'));

beforeEach(() => resetNavigation());
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run`
Expected: all tests pass, including the six new ones (110 in total).

- [ ] **Step 5: Commit**

```bash
git add src/test src/setupTests.js
git commit -m "test: in-memory stand-ins for next/navigation and next/link"
```

---

### Task 3: One base path for data and image URLs

**Files:**
- Create: `src/Helpers/basePath.js`
- Modify: `src/Helpers/hadisPath.js`, `src/Search/searchIndex.js`
- Test: `src/Helpers/hadisPath.test.js`, `src/Search/searchIndex.test.js` (already cover the URLs)

**Interfaces:**
- Produces: `export const BASE_PATH: string` in `src/Helpers/basePath.js`, `''` unless `NEXT_PUBLIC_BASE_PATH` is set. `hadisUrl(tag)` and the shard URLs build on it and still return `/json/...`.

- [ ] **Step 1: Write the failing test**

Append to `src/Helpers/hadisPath.test.js`:

```js
import { BASE_PATH } from './basePath';

test('the base path is empty unless configured, so data URLs start at the site root', () => {
  expect(BASE_PATH).toBe('');
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/Helpers/hadisPath.test.js`
Expected: FAIL (`Failed to resolve import "./basePath"`).

- [ ] **Step 3: Implement**

`src/Helpers/basePath.js`:

```js
// Where the site is served from. Empty means the site root. Set NEXT_PUBLIC_BASE_PATH (for
// example "/hadis") only if the site is ever hosted under a sub-path.
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || '';
```

In `src/Helpers/hadisPath.js`, add `import { BASE_PATH } from "./basePath";` at the top and change the return line to:

```js
    return `${BASE_PATH}/json/hadis/${folder}/${number}/text.txt`;
```

In `src/Search/searchIndex.js`, add `import { BASE_PATH } from "../Helpers/basePath";` next to the other import and change the `url` line in `loadFile` to:

```js
        const url = `${BASE_PATH}/json/${kind}/${prefix}.json`;
```

- [ ] **Step 4: Run all tests**

Run: `npx vitest run`
Expected: all pass (no assertion about URLs changes, because the result is still `/json/...`).

- [ ] **Step 5: Commit**

```bash
git add src/Helpers/basePath.js src/Helpers/hadisPath.js src/Helpers/hadisPath.test.js src/Search/searchIndex.js
git commit -m "refactor: one base path for data URLs instead of Vite's BASE_URL"
```

---

### Task 4: Navigation links, Home, Not-found and Back-to-top

**Files:**
- Create: `src/Helpers/BackToTop.jsx`, `src/Helpers/BackToTop.test.jsx`, `src/Navbar/Navbar.test.jsx`, `src/Home/Home.test.jsx`, `src/NotFound/NotFound.test.jsx`, `src/Helpers/EngToBng.test.js`
- Modify: `src/Navbar/Navbar.jsx`, `src/Home/Home.jsx`, `src/NotFound/NotFound.jsx`
- Delete: `src/App.test.jsx`

**Note:** from this task until Task 6 the old Vite app no longer builds (its links now come from `next/link`). Only the tests run in between, and the app is whole again at the end of Task 6.

**Interfaces:**
- Consumes: the stand-ins from Task 2 (`getUrl` from `src/test/nextNavigation.js`).
- Produces: `BackToTop` (default export, no props), used by the layout in Task 6. `NavBar`, `Home` and `NotFound` are Client Components that link with `next/link`.

- [ ] **Step 1: Write the failing tests**

First move the two pure-function tests out of `src/App.test.jsx`, which is deleted in Step 4 because its router-based checks are replaced by the tests below and in Task 6.

`src/Helpers/EngToBng.test.js`:

```js
import getNum, { getBook } from './EngToBng';

test('converts English digits to Bengali digits', () => {
  expect(getNum('124')).toBe('১২৪');
  expect(getNum('7053')).toBe('৭০৫৩');
});

test('maps a hadis tag to its book name', () => {
  expect(getBook('BUK-124')).toBe('বুখারি শরীফ - হাদীস নং ');
  expect(getBook('MAJ-1')).toBe('সুনানু ইবনে মাজাহ - হাদীস নং ');
});
```

`src/Navbar/Navbar.test.jsx`:

```jsx
import { fireEvent, render, screen } from '@testing-library/react';
import { getUrl } from '../test/nextNavigation';
import NavBar from './Navbar';

test('shows the four main links', () => {
  render(<NavBar />);
  expect(screen.getByText('হোম')).toBeInTheDocument();
  expect(screen.getByText('সার্চ')).toBeInTheDocument();
  expect(screen.getByText('হাদীস বই')).toBeInTheDocument();
  expect(screen.getByText('বিষয়ভিত্তিক হাদীস')).toBeInTheDocument();
});

test.each([
  ['সার্চ', '/search'],
  ['হাদীস বই', '/books'],
  ['বিষয়ভিত্তিক হাদীস', '/topics'],
])('the %s link goes to %s without reloading', (label, path) => {
  render(<NavBar />);
  fireEvent.click(screen.getByText(label));
  expect(getUrl().pathname).toBe(path);
});

test('the logo links home', () => {
  render(<NavBar />);
  expect(screen.getAllByAltText('হোম')[0].closest('a').getAttribute('href')).toBe('/');
});
```

`src/Home/Home.test.jsx`:

```jsx
import { fireEvent, render, screen } from '@testing-library/react';
import { getUrl } from '../test/nextNavigation';
import Home from './Home';

test('the home buttons open their page without errors', () => {
  const onError = vi.fn();
  window.addEventListener('error', onError);
  render(<Home />);
  fireEvent.click(screen.getByText('হাদীস সার্চ'));
  window.removeEventListener('error', onError);

  expect(onError).not.toHaveBeenCalled();
  expect(getUrl().pathname).toBe('/search');
});

test.each([
  ['বিষয়ভিত্তিক হাদীস', '/topics'],
  ['হাদীসের বই', '/books'],
])('the %s card goes to %s', (label, path) => {
  render(<Home />);
  fireEvent.click(screen.getByText(label));
  expect(getUrl().pathname).toBe(path);
});

test('sets the home page title', () => {
  render(<Home />);
  expect(document.title).toBe('BoiKotha - হাদীস সম্ভার');
});
```

`src/NotFound/NotFound.test.jsx`:

```jsx
import { render, screen } from '@testing-library/react';
import NotFound from './NotFound';

test('says the page was not found and links home', () => {
  render(<NotFound />);
  expect(screen.getByText('পৃষ্ঠাটি পাওয়া যায়নি')).toBeInTheDocument();
  expect(screen.getByText('হোম পেজে ফিরে যান').getAttribute('href')).toBe('/');
});

test('sets its own page title', () => {
  render(<NotFound />);
  expect(document.title).toBe('পৃষ্ঠাটি পাওয়া যায়নি - BoiKotha');
});
```

`src/Helpers/BackToTop.test.jsx`:

```jsx
import { fireEvent, render, screen } from '@testing-library/react';
import BackToTop from './BackToTop';

test('is a labelled button', () => {
  render(<BackToTop />);
  expect(screen.getByRole('button', { name: 'Back to top' })).toBeInTheDocument();
});

test('scrolls to the top on click and on Enter', () => {
  render(<BackToTop />);
  const button = screen.getByRole('button', { name: 'Back to top' });

  document.documentElement.scrollTop = 500;
  fireEvent.click(button);
  expect(document.documentElement.scrollTop).toBe(0);

  document.documentElement.scrollTop = 500;
  fireEvent.keyDown(button, { key: 'Enter' });
  expect(document.documentElement.scrollTop).toBe(0);
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run src/Navbar src/Home src/NotFound src/Helpers/BackToTop`
Expected: FAIL. `Navbar`, `Home` and `NotFound` still import `react-router-dom` (no router context), and `BackToTop.jsx` does not exist.

- [ ] **Step 3: Implement**

`src/Helpers/BackToTop.jsx` (the button from `src/index.jsx`, unchanged in markup):

```jsx
'use client';

export default function BackToTop() {
  return (
    <div
      className="top"
      role="button"
      tabIndex={0}
      aria-label="Back to top"
      onClick={() => {
        document.documentElement.scrollTop = 0;
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter') document.documentElement.scrollTop = 0;
      }}
    >
      &#8673;
    </div>
  );
}
```

Apply these edits with a script:

```bash
python3 - <<'EOF'
def edit(path, pairs):
    s = open(path, encoding='utf-8').read()
    for old, new in pairs:
        assert s.count(old) >= 1, (path, old)
        s = s.replace(old, new)
    open(path, 'w', encoding='utf-8').write(s)

# Navbar: Next.js link, client component
edit('src/Navbar/Navbar.jsx', [
    ("import Container from 'react-bootstrap/Container';", "'use client';\n\nimport Container from 'react-bootstrap/Container';"),
    ("import { Link } from 'react-router-dom';", "import Link from 'next/link';"),
    ("as={Link} to='/'", "as={Link} href='/'"),
    ('as={Link} to="/"', 'as={Link} href="/"'),
    ('as={Link} to="/search"', 'as={Link} href="/search"'),
    ('as={Link} to="/books"', 'as={Link} href="/books"'),
    ('as={Link} to="/topics"', 'as={Link} href="/topics"'),
])

# Home: Next.js link, client component
edit('src/Home/Home.jsx', [
    ('import { Link } from "react-router-dom";', '\'use client\';\n\nimport Link from "next/link";'),
    ("<Link to={'/search'} className='link'>", "<Link href={'/search'} className='link'>"),
    ("<Link to={'/topics'} className='link'>", "<Link href={'/topics'} className='link'>"),
    ("<Link to={'/books'} className='link'>", "<Link href={'/books'} className='link'>"),
])

# NotFound: Next.js link, client component
edit('src/NotFound/NotFound.jsx', [
    ('import { Link } from "react-router-dom";', '\'use client\';\n\nimport Link from "next/link";'),
    ('<Link to="/">', '<Link href="/">'),
])
EOF
```

- [ ] **Step 4: Remove the old app-level test and run the tests to verify they pass**

```bash
git rm src/App.test.jsx
npx vitest run
```

Expected: PASS. `Search` and `Topics` still use react-router until Task 5, and their own tests still wrap them in `MemoryRouter`, so they keep passing.

- [ ] **Step 5: Commit**

```bash
git add src/Helpers src/Navbar src/Home src/NotFound
git commit -m "feat: navigation, home and not-found use next/link; back-to-top is its own component"
```

---

### Task 5: Search and Topics use the Next.js address (useUrlParams)

**Files:**
- Create: `src/Helpers/useUrlParams.js`
- Modify: `src/Search/Search.jsx`, `src/Topics/Topics.jsx`, `src/Search/Search.test.jsx`, `src/Topics/Topics.test.jsx`

**Interfaces:**
- Consumes: `useSearchParams`, `usePathname`, `useRouter` from `next/navigation` (real in the app, the stand-in in tests).
- Produces: `useUrlParams(): [URLSearchParams, (values: Record<string,string>) => void]`. The second element pushes `pathname?k=v&...` to the router (just `pathname` when `values` is empty), like `setSearchParams` in react-router.

- [ ] **Step 1: Update the tests to the new harness (they fail until the code is converted)**

Run this script. It swaps the react-router helpers in the two test files for the stand-in, and adds the StrictMode test:

```bash
python3 - <<'EOF'
def edit(path, pairs):
    s = open(path, encoding='utf-8').read()
    for old, new in pairs:
        assert s.count(old) == 1, (path, old[:50])
        s = s.replace(old, new)
    open(path, 'w', encoding='utf-8').write(s)

edit('src/Search/Search.test.jsx', [
    ("import { MemoryRouter, useLocation } from 'react-router-dom';\n",
     "import { StrictMode } from 'react';\nimport { usePathname, useSearchParams } from 'next/navigation';\nimport { setUrl } from '../test/nextNavigation';\n"),
    ("""function Where() {
  const location = useLocation();
  return <div data-testid="where">{decodeURIComponent(location.pathname + location.search)}</div>;
}

function renderSearch(url = '/search') {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <Search />
      <Where />
    </MemoryRouter>
  );
}
""", """function Where() {
  const pathname = usePathname();
  const query = useSearchParams().toString();
  return <div data-testid="where">{decodeURIComponent(pathname + (query ? '?' + query : ''))}</div>;
}

function renderSearch(url = '/search') {
  setUrl(url);
  return render(
    <>
      <Search />
      <Where />
    </>
  );
}
"""),
])

edit('src/Topics/Topics.test.jsx', [
    ("import { MemoryRouter, useLocation } from 'react-router-dom';\n",
     "import { usePathname, useSearchParams } from 'next/navigation';\nimport { setUrl } from '../test/nextNavigation';\n"),
    ("""function Where() {
  const location = useLocation();
  return <div data-testid="where">{decodeURIComponent(location.pathname + location.search)}</div>;
}

function renderTopics(url = '/topics') {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <Topics />
      <Where />
    </MemoryRouter>
  );
}
""", """function Where() {
  const pathname = usePathname();
  const query = useSearchParams().toString();
  return <div data-testid="where">{decodeURIComponent(pathname + (query ? '?' + query : ''))}</div>;
}

function renderTopics(url = '/topics') {
  setUrl(url);
  return render(
    <>
      <Topics />
      <Where />
    </>
  );
}
"""),
])
EOF
```

Append the StrictMode test (Review Focus 5) to `src/Search/Search.test.jsx`:

```jsx
test('in StrictMode a search still downloads each data file only once', async () => {
  servePaged('strictword', 2);
  setUrl('/search?q=strictword');
  render(
    <StrictMode>
      <Search />
    </StrictMode>
  );
  expect(await screen.findByText(/মোট ২ টি হাদিস পাওয়া গেছে/)).toBeInTheDocument();
  const shardRequests = global.fetch.mock.calls.filter(([url]) => url === '/json/tags/st.json');
  expect(shardRequests).toHaveLength(1);
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run src/Search/Search.test.jsx src/Topics/Topics.test.jsx`
Expected: FAIL. `Search` and `Topics` still use react-router's `useSearchParams`, which throws without a router.

- [ ] **Step 3: Implement the hook and convert the two screens**

`src/Helpers/useUrlParams.js`:

```js
'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';

// The address's query string, plus a setter that navigates to a new one on the same page.
// setParams({ q: 'রোজা', page: '2' }) goes to <pathname>?q=...&page=2 (just <pathname> if empty).
export function useUrlParams() {
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  function setParams(values) {
    const query = new URLSearchParams(values).toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  return [params, setParams];
}
```

```bash
python3 - <<'EOF'
def edit(path, pairs):
    s = open(path, encoding='utf-8').read()
    for old, new in pairs:
        assert s.count(old) == 1, (path, old)
        s = s.replace(old, new)
    open(path, 'w', encoding='utf-8').write(s)

edit('src/Search/Search.jsx', [
    ('import { useEffect, useMemo, useState } from "react";\nimport { useSearchParams } from "react-router-dom";\n',
     '\'use client\';\n\nimport { useEffect, useMemo, useState } from "react";\n'),
    ('import { usePageTitle } from "../Helpers/usePageTitle";',
     'import { usePageTitle } from "../Helpers/usePageTitle";\nimport { useUrlParams } from "../Helpers/useUrlParams";'),
    ('const [params, setParams] = useSearchParams();', 'const [params, setParams] = useUrlParams();'),
])
edit('src/Topics/Topics.jsx', [
    ('import { useEffect, useMemo, useState } from "react";\nimport { useSearchParams } from "react-router-dom";\n',
     '\'use client\';\n\nimport { useEffect, useMemo, useState } from "react";\n'),
    ('import { usePageTitle } from "../Helpers/usePageTitle";',
     'import { usePageTitle } from "../Helpers/usePageTitle";\nimport { useUrlParams } from "../Helpers/useUrlParams";'),
    ('const [params, setParams] = useSearchParams();', 'const [params, setParams] = useUrlParams();'),
])
EOF
```

Also add `'use client';` as the first line of `src/Books/Books.jsx` (it uses hooks and is a route entry in Task 6).

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/Search src/Topics src/Books`
Expected: PASS, including the StrictMode test (the data-file cache makes the double effect harmless).

- [ ] **Step 5: Commit**

```bash
git add src/Helpers/useUrlParams.js src/Search src/Topics src/Books
git commit -m "refactor: Search and Topics read and change the address through Next.js"
```

---

### Task 6: App Router shell and routes; remove the Vite app and react-router

**Files:**
- Create: `src/app/layout.jsx`, `src/app/page.jsx`, `src/app/search/page.jsx`, `src/app/books/page.jsx`, `src/app/topics/page.jsx`, `src/app/not-found.jsx`, `next.config.mjs`, `src/app/pages.test.jsx`
- Modify: `package.json`, `eslint.config.js`, `.gitignore`
- Delete: `src/App.jsx`, `src/index.jsx`, `index.html`, `vite.config.js`

**Interfaces:**
- Consumes: `NavBar` (Task 4), `BackToTop` (Task 4), `Home`, `Search`, `Books`, `Topics`, `NotFound`.
- Produces: the routes `/`, `/search`, `/books`, `/topics` and the not-found page, and `metadata` (title `BoiKotha - হাদীস সম্ভার`, description, manifest, icons) exported from `layout.jsx`.

- [ ] **Step 1: Write the page tests**

`src/app/pages.test.jsx`:

```jsx
import { fireEvent, render, screen } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { setUrl } from '../test/nextNavigation';
import RootLayout, { metadata } from './layout';
import HomePage from './page';
import SearchPage from './search/page';
import BooksPage from './books/page';
import TopicsPage from './topics/page';
import NotFoundPage from './not-found';

const pages = [
  ['/', HomePage],
  ['/search', SearchPage],
  ['/books', BooksPage],
  ['/topics', TopicsPage],
];

beforeEach(() => {
  global.fetch = vi.fn(() => Promise.resolve({ ok: false }));
});

afterEach(() => {
  delete global.fetch;
});

test.each(pages)('page %s renders without React warnings', (path, Page) => {
  const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
  setUrl(path);
  render(<Page />);
  const messages = errors.mock.calls.map((call) => String(call[0]));
  errors.mockRestore();
  expect(messages).toEqual([]);
});

test.each([
  ['/', HomePage, 'BoiKotha - হাদীস সম্ভার'],
  ['/search', SearchPage, 'হাদীস সার্চ - BoiKotha'],
  ['/search?q=রোজা', SearchPage, 'রোজা - হাদীস সার্চ - BoiKotha'],
  ['/books', BooksPage, 'হাদীসের বই - BoiKotha'],
  ['/topics', TopicsPage, 'বিষয়ভিত্তিক হাদীস - BoiKotha'],
  ['/topics?topic=ঈমান', TopicsPage, 'ঈমান - বিষয়ভিত্তিক হাদীস - BoiKotha'],
])('%s is titled %s', (path, Page, title) => {
  setUrl(path);
  render(<Page />);
  expect(document.title).toBe(title);
});

test('choosing a book puts its name in the title', () => {
  render(<BooksPage />);
  fireEvent.click(screen.getByText('মুসলিম শরীফ'));
  expect(document.title).toBe('মুসলিম শরীফ - হাদীসের বই - BoiKotha');
});

test('the not-found page explains and links home', () => {
  render(<NotFoundPage />);
  expect(screen.getByText('পৃষ্ঠাটি পাওয়া যায়নি')).toBeInTheDocument();
  expect(screen.getByText('হোম পেজে ফিরে যান').getAttribute('href')).toBe('/');
});

test('the layout sets the language and wraps each page with the navigation', () => {
  const html = renderToStaticMarkup(
    <RootLayout>
      <p>PAGE BODY</p>
    </RootLayout>
  );
  expect(html).toContain('<html lang="bn"');
  expect(html).toContain('href="/search"');
  expect(html).toContain('PAGE BODY');
  expect(html).toContain('Back to top');
});

test('site metadata names the site and describes it in Bengali', () => {
  expect(metadata.title).toBe('BoiKotha - হাদীস সম্ভার');
  expect(metadata.description).toContain('হাদীস');
  expect(metadata.manifest).toBe('/manifest.json');
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run src/app`
Expected: FAIL (`Failed to resolve import "./layout"`).

- [ ] **Step 3: Create the App Router files and config**

`src/app/layout.jsx` (import order keeps the CSS order: `index.css`, Bootstrap):

```jsx
import '../index.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import NavBar from '../Navbar/Navbar';
import BackToTop from '../Helpers/BackToTop';

export const metadata = {
  title: 'BoiKotha - হাদীস সম্ভার',
  description:
    'হাদীস খুঁজুন: বুখারি, মুসলিম, তিরমিজি, আবু দাউদ, ইবনে মাজাহ ও নাসাঈ শরীফের হাদীস বাংলায় সার্চ, বিষয়ভিত্তিক ও বই অনুযায়ী পড়ুন।',
  manifest: '/manifest.json',
  icons: { icon: '/favicon.ico', apple: '/logo192.png' },
};

export const viewport = { themeColor: '#000000' };

export default function RootLayout({ children }) {
  return (
    <html lang="bn">
      <body>
        <NavBar />
        {children}
        <BackToTop />
      </body>
    </html>
  );
}
```

`src/app/page.jsx`:

```jsx
import Home from '../Home/Home';

export default function Page() {
  return <Home />;
}
```

`src/app/search/page.jsx` (the `Suspense` is required because Search reads the query string):

```jsx
import { Suspense } from 'react';
import Search from '../../Search/Search';

export default function Page() {
  return (
    <Suspense>
      <Search />
    </Suspense>
  );
}
```

`src/app/topics/page.jsx`:

```jsx
import { Suspense } from 'react';
import Topics from '../../Topics/Topics';

export default function Page() {
  return (
    <Suspense>
      <Topics />
    </Suspense>
  );
}
```

`src/app/books/page.jsx`:

```jsx
import Books from '../../Books/Books';

export default function Page() {
  return <Books />;
}
```

`src/app/not-found.jsx`:

```jsx
import NotFound from '../NotFound/NotFound';

export default function NotFoundPage() {
  return <NotFound />;
}
```

`next.config.mjs`:

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
};

export default nextConfig;
```

- [ ] **Step 4: Remove the Vite app and react-router; update scripts, ESLint and .gitignore**

```bash
git rm src/App.jsx src/index.jsx index.html vite.config.js
npm uninstall react-router-dom
python3 - <<'EOF'
import json, collections
p = 'package.json'
d = json.load(open(p), object_pairs_hook=collections.OrderedDict)
d['scripts'] = collections.OrderedDict([
    ('dev', 'next dev -p 3000'),
    ('build', 'next build'),
    ('start', 'next start -p 3000'),
    ('test', 'vitest'),
    ('lint', 'eslint . --max-warnings=0'),
])
d['engines'] = {'node': '>=20.9'}
json.dump(d, open(p, 'w'), indent=2, ensure_ascii=False)
open(p, 'a').write('\n')

e = open('eslint.config.js', encoding='utf-8').read()
old = '{ ignores: ["build/**", "node_modules/**", "public/**"] },'
assert e.count(old) == 1
open('eslint.config.js', 'w', encoding='utf-8').write(
    e.replace(old, '{ ignores: ["build/**", ".next/**", "node_modules/**", "public/**", "next-env.d.ts"] },'))

g = open('.gitignore').read()
if '.next' not in g:
    open('.gitignore', 'a').write('\n# Next.js\n/.next/\nnext-env.d.ts\n')
EOF
```

- [ ] **Step 5: Run the tests, lint and the production build**

```bash
npx vitest run
npm run lint
npm run build
```

Expected: all tests pass; lint exits 0 with no warnings; `next build` finishes and lists the routes `/`, `/books`, `/search`, `/topics` and `/_not-found`. If the build fails with "useSearchParams() should be wrapped in a suspense boundary", a page is missing its `Suspense` (Review Focus 2). If lint complains about the `src/app` files, fix the reported lines in this task.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: Next.js App Router replaces the Vite entry and react-router"
```

---

### Task 7: Hosting config, CI and README for Next.js

**Files:**
- Modify: `netlify.toml`, `.github/workflows/ci.yml`, `README.md`

- [ ] **Step 1: Update `netlify.toml`** (the catch-all redirect is gone, since Next.js does its own routing; the data and image headers stay)

Replace the whole file with:

```toml
[build]
  command = "npm run build"

[build.environment]
  NODE_VERSION = "20"

# Data files: readable from other origins, cached for a day to cut repeat requests.
[[headers]]
  for = "/json/*"
  [headers.values]
    Access-Control-Allow-Origin = "*"
    Cache-Control = "public, max-age=86400"

[[headers]]
  for = "/photos/*"
  [headers.values]
    Cache-Control = "public, max-age=604800"
```

- [ ] **Step 2: Pause the deploy step in CI** (the old step deployed a static `build/` folder, which no longer exists; deploys are paused anyway and will be reworked when they resume)

In `.github/workflows/ci.yml`, replace the `Deploy to Netlify` step with:

```yaml
      # Deploys are paused. This step deployed a static build/ folder, which a Next.js site no
      # longer produces; rework it (Netlify's Next.js support) before turning it back on.
      - name: Deploy to Netlify
        if: ${{ false }}
        run: npx --yes netlify-cli@latest deploy --prod --dir=.next --no-build
        env:
          NETLIFY_AUTH_TOKEN: ${{ secrets.NETLIFY_AUTH_TOKEN }}
          NETLIFY_SITE_ID: ${{ secrets.NETLIFY_SITE_ID }}
```

- [ ] **Step 3: Update the README commands**

In `README.md`, replace the line `Requires Node 20.19 or newer (see \`.nvmrc\`). Built with Vite and tested with Vitest.` with `Requires Node 20.9 or newer (see \`.nvmrc\`). Built with Next.js and tested with Vitest.`, and replace the commands block with:

```
npm ci          # install dependencies
npm run dev     # dev server at http://localhost:3000
npm test        # tests in watch mode; add -- --run to run them once
npm run lint    # ESLint, zero warnings allowed
npm run build   # production build
npm start       # serve the production build at http://localhost:3000
```

Replace the whole "Deployment" section (from its heading up to the "Notes" heading) with:

```
## Deployment

Deploys are paused while the site moves to Next.js. The CI workflow ([.github/workflows/ci.yml](.github/workflows/ci.yml)) still installs, lints, tests and builds on every push and pull request. [netlify.toml](netlify.toml) keeps the cache and CORS headers for `/json/*` and `/photos/*`.
```

- [ ] **Step 3b: Run everything once more**

Run: `npx vitest run && npm run lint && npm run build`
Expected: all pass.

- [ ] **Step 4: Commit**

```bash
git add netlify.toml .github/workflows/ci.yml README.md
git commit -m "chore: hosting config, CI and README for Next.js; deploys paused"
```

---

### Task 8: Real-browser checks: self-contained, deep links, missing data

**Files:**
- Create: `scripts/check-self-contained.sh`, `scripts/smoke.sh`

**Interfaces:**
- Produces: `scripts/check-self-contained.sh <base-url>` exits 0 only if the main pages load without any request to a host other than the site. `scripts/smoke.sh <base-url>` exits 0 only if the smoke checks below pass.

- [ ] **Step 1: Write the self-contained check**

`scripts/check-self-contained.sh`:

```bash
#!/bin/bash
# Usage: scripts/check-self-contained.sh <base-url> [extra-route ...]
# Loads the main pages in headless Chrome and records every network request. The check fails if
# any request goes to a host other than this site (no CDN fonts, analytics, outside APIs).
set -u
BASE="$1"; shift
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
ROUTES=("/" "/search?q=%E0%A6%B0%E0%A7%8B%E0%A6%9C%E0%A6%BE" "/topics" "/books" "$@")
fail=0
for route in "${ROUTES[@]}"; do
  profile="$(mktemp -d)"; netlog="$(mktemp)"; dom="$(mktemp)"
  "$CHROME" --headless=new --disable-gpu --no-sandbox --user-data-dir="$profile" \
    --disable-background-networking --disable-component-update --disable-sync --no-first-run \
    --disable-default-apps --disable-domain-reliability \
    --log-net-log="$netlog" --virtual-time-budget=8000 --dump-dom "$BASE$route" >"$dom" 2>/dev/null &
  pid=$!
  for _ in $(seq 1 40); do kill -0 "$pid" 2>/dev/null || break; sleep 1; done
  kill "$pid" 2>/dev/null; pkill -9 -f "$profile" 2>/dev/null
  hosts="$(grep -o '"url":"https\?://[^/"]*' "$netlog" | sed 's/.*:\/\///' | sort -u \
    | grep -v -E '^(localhost|127\.0\.0\.1)(:[0-9]+)?$')"
  if [ -n "$hosts" ]; then
    echo "FAIL $route reached other hosts: $(echo "$hosts" | tr '\n' ' ')"; fail=1
  elif [ ! -s "$dom" ]; then
    echo "FAIL $route produced no page"; fail=1
  else
    echo "ok   $route"
  fi
  rm -rf "$profile" "$netlog" "$dom"
done
exit $fail
```

- [ ] **Step 2: Prove the check can fail (negative control), then pass**

```bash
chmod +x scripts/check-self-contained.sh
printf '<!doctype html><script src="https://example.com/outside.js"></script><p>probe</p>' > public/zz-probe.html
npm run build
scripts/with-server.sh 5056 "npx next start -p 5056" scripts/check-self-contained.sh http://localhost:5056 /zz-probe.html
echo "exit code: $?"
```

Expected: the `/zz-probe.html` line says `FAIL ... reached other hosts: example.com` and the exit code is 1. This proves the check detects outside requests. Then remove the probe:

```bash
rm public/zz-probe.html
npm run build
scripts/with-server.sh 5056 "npx next start -p 5056" scripts/check-self-contained.sh http://localhost:5056
echo "exit code: $?"
```

Expected: four `ok` lines and exit code 0. If a host shows up, first check whether it is Chrome's own background traffic (for example a Google update or sync address) and, if so, add the matching `--disable-...` flag to the script; if it is one of our pages, find where it is requested (most likely a font or script link) and remove it in this task.

- [ ] **Step 3: Write the smoke checks**

`scripts/smoke.sh`:

```bash
#!/bin/bash
# Usage: scripts/smoke.sh <base-url>
# Checks the running site: data files and images are served, a missing data file is a real 404,
# and deep links render in a real browser.
set -u
BASE="$1"
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
fail=0
status() { curl -s -o /dev/null -w '%{http_code}' "$BASE$1"; }
expect_status() { # <path> <code>
  got="$(status "$1")"
  if [ "$got" = "$2" ]; then echo "ok   $1 -> $got"; else echo "FAIL $1 -> $got (wanted $2)"; fail=1; fi
}
dump() { # <route> -> page HTML after scripts ran
  local profile out pid; profile="$(mktemp -d)"; out="$(mktemp)"
  "$CHROME" --headless=new --disable-gpu --no-sandbox --user-data-dir="$profile" \
    --virtual-time-budget=12000 --dump-dom "$BASE$1" >"$out" 2>/dev/null &
  pid=$!
  for _ in $(seq 1 40); do kill -0 "$pid" 2>/dev/null || break; sleep 1; done
  kill "$pid" 2>/dev/null; pkill -9 -f "$profile" 2>/dev/null
  cat "$out"; rm -rf "$profile" "$out"
}
expect_text() { # <route> <text> <what>
  if dump "$1" | grep -q "$2"; then echo "ok   $3"; else echo "FAIL $3"; fail=1; fi
}

expect_status /json/hadis/Bukhari/0001/text.txt 200
expect_status "/json/tags/%E0%A6%B0%E0%A7%8B.json" 200
expect_status /photos/copy.png 200
expect_status /json/tags/qqqq.json 404        # Review Focus 3: a missing data file is a real 404
expect_status /no-such-page 404

expect_text "/search?q=%E0%A6%B0%E0%A7%8B%E0%A6%9C%E0%A6%BE&page=2" "মোট ৪০৩" "deep link to page 2 of a Bengali search renders (Review Focus 1)"
expect_text "/search?q=zzzz" "কোনো ফলাফল" "an unknown word shows the not-found note (Review Focus 3)"
expect_text "/topics?topic=%E0%A6%88%E0%A6%AE%E0%A6%BE%E0%A6%A8" "হাদীস নং" "a topic deep link renders hadis"
expect_text /books "নিচে থেকে যেকোনো একটি বই ক্লিক করুন" "the books page renders"
expect_text /no-such-page "পৃষ্ঠাটি পাওয়া যায়নি" "the not-found page renders"
exit $fail
```

- [ ] **Step 4: Run the smoke checks against the production build**

```bash
chmod +x scripts/smoke.sh
scripts/with-server.sh 5056 "npx next start -p 5056" scripts/smoke.sh http://localhost:5056
echo "exit code: $?"
```

Expected: ten `ok` lines and exit code 0. If `/json/tags/qqqq.json` does not return 404, or the unknown-word check fails, fix `src/Search/searchIndex.js` (it must treat a non-OK response as an empty file) in this task.

- [ ] **Step 5: Commit**

```bash
git add scripts/check-self-contained.sh scripts/smoke.sh
git commit -m "test: real-browser checks (self-contained, deep links, missing data)"
```

---

### Task 9: Visual parity with the old build, final verification, merge

**Files:**
- Modify: `docs/redesign-plan.md`

- [ ] **Step 1: Take the screenshots of the Next.js build and compare them with the baseline from Task 1**

```bash
scripts/with-server.sh 5056 "npx next start -p 5056" scripts/screenshots.sh http://localhost:5056 /tmp/shots-after
python3 scripts/compare-screenshots.py /tmp/shots-before /tmp/shots-after
echo "exit code: $?"
```

Expected: every page reports no size difference and a largest channel difference of `0/255` (or only tiny anti-aliasing differences, well under 40). Look at any page that differs with the Read tool on both PNG files. Typical causes are a CSS import order change (check `src/app/layout.jsx` imports `../index.css` before Bootstrap) and a missing `<body>` margin rule.

- [ ] **Step 2: Run the whole verification once more**

```bash
npx vitest run
npm run lint
npm run build
scripts/with-server.sh 5056 "npx next start -p 5056" scripts/check-self-contained.sh http://localhost:5056
scripts/with-server.sh 5056 "npx next start -p 5056" scripts/smoke.sh http://localhost:5056
```

Expected: all tests pass (about 110), lint clean, build succeeds, both check scripts exit 0.

- [ ] **Step 3: Record the result in the redesign plan**

In `docs/redesign-plan.md`, in the phases table, change the `0A` row to start with `**Done:**` and add after section 10 the line: `Phase 0A result: migrated to Next.js 16 and React 19 with pages pixel-identical to the Vite build, all tests passing, and the self-contained check clean.`

- [ ] **Step 4: Commit and merge into `main` locally (no push)**

```bash
git add -A
git commit -m "docs: phase 0A (Next.js migration) done"
git checkout main
git merge --ff-only migrate/nextjs
git log --oneline -3
```

Expected: the merge is a fast-forward, and nothing is pushed.

---

## Self-Review

**Spec coverage** (spec: `docs/redesign-plan.md` sections 10 and 11): migrate to Next.js first (Tasks 1 to 6); behavior identical with tests green (Tasks 2 to 6, 9); client components only (Tasks 4 to 6); self-contained rule and its check (Task 8, including a negative control); deploy left alone and paused (Task 7); local only (branch and merge in Tasks 1 and 9). No gaps found.

**Placeholder scan:** every code step has the actual code or an exact edit script. The two conditional instructions ("if React 19 breaks a test", "if a real page reaches another host") name the likely cause and the place to fix, and each step has a verified pass condition.

**Type and name consistency:** `useUrlParams` returns `[params, setParams]` and is used with that shape in both screens. `setUrl`, `getUrl`, `getHistory` and `resetNavigation` are defined in Task 2 and only those names are used later. `BASE_PATH` is defined in Task 3 and used in the two modules named there. The scripts `with-server.sh`, `screenshots.sh`, `compare-screenshots.py`, `check-self-contained.sh` and `smoke.sh` have the same arguments everywhere they are called.

**Review Focus coverage:** item 1 and 3 in Task 8 (`smoke.sh`); item 2 in Task 6 step 5 (build); item 4 in Task 2; item 5 in Task 5.
