# Non-Core Issues

Everything outside the core search and hadis-display logic (see [core-improvements.md](core-improvements.md)): what is broken, what is outdated, and other rough edges. Items marked **[verified]** were confirmed by running the project or checking the files on disk. The rest come from reading the code.

## 1. Broken

**Books page (`src/Books/Books.js`)**
- **Wrong book behind the button [verified in code]:** the `books` array is `BUK, MUS, TIR, MAJ, DAU, NAS`, but the buttons are labelled in a different order. Button 4 says Abu Dawud but loads `MAJ` (Ibn Majah). Button 5 says Ibn Majah but loads `DAU` (Abu Dawud). The page title is taken from the array, so it contradicts the button you clicked.
- **Active button jumps to Bukhari:** the highlighted (`book-on`) button for every book calls `chageBook(0)`, so clicking the active book sends you to Bukhari.
- **Hadis counts don't match the data [verified]:**

  | Book | Count in code | Files on disk |
  |---|---|---|
  | Bukhari | 7053 | 6719 (max number 7053, so 334 numbers have no file) |
  | Tirmiji | 3500 | 3608 (108 hadis unreachable from the Books page) |
  | Nasae | 5758 | 5753 (5 numbers have no file) |

  Paging to a number with no file makes `fetch(...).json()` throw, and the card stays on the loading spinner forever.
- **Paging bounds:** `changePage` checks `c * 20 > l`, so it allows one empty page past the end. `multiPage` reads a stale `page` right after `setPage`.

**Home page (`src/Home/Home.js`)**
- **Click errors:** the buttons call `props.setDisplay(...)`, but `App.js` renders `<Home />` with no props. Every button click throws `TypeError: props.setDisplay is not a function`.
- **Wrong nesting:** the Topics, Books and "More" cards use different markup than the Search card (`<Link>` inside the card instead of around it), and the layout uses `class=` instead of `className`.
- **Advertises a missing feature:** the Books card says you can listen to the hadis as audio (ওডিও তে শুনুন). There is no audio code anywhere in the project.

**Navbar and routing**
- **Full page reloads:** `Navbar.js` uses `<Nav.Link href=...>` instead of router links, so every navigation reloads the whole app. `NavBar` is also rendered outside `<Router>`.
- **Back button:** `App.js` calls `window.history.pushState` five times on every render, which is a workaround that breaks the back button.
- **Layout logic in JS:** the logo is chosen with `window.screen.width` at render time, so it doesn't respond to resizing or rotation.
- **Invalid markup:** the whole navbar is wrapped in `<b>`, `Highlight.js` renders a `<normal>` element that doesn't exist, and `NextPrev.js` uses a `<table>` with no `<tbody>` (React warns about it).
- **Floating "top" button:** it is rendered in `index.js` outside the app, uses `documentElement.scrollTop` and has no accessible role.

**Tests [verified]**
- `src/App.test.js` is the CRA default, looks for "learn react", and fails: 1 failed of 1.

**Build [verified]**
- The build compiles with 5 ESLint warnings: unused `display` in `App.js`, unused `Link` in `Navbar.js`, unused `BrowserRouter` in `index.js`, and a missing `alt` plus a redundant block in `HadisView.js`.

**README [verified]**
- `README.md` is corrupted: its content is garbled binary. It also contains leftover `<!-- sync-marker-2 -->` text.

## 2. Outdated or backdated

- **Create React App:** `react-scripts` 5.0.1 is unmaintained. CRA was officially deprecated in 2025, and 5.0.1 is its last release. Move to Vite.
- **Dependencies behind [verified with `npm outdated`]:** react 18.2 (latest 19.3), react-dom 18.2, react-router-dom 6.8.1 (6.30 available, 7 is latest), bootstrap 5.2.2 (5.3.8), react-bootstrap 2.6 (2.10), testing-library packages one or two majors behind, web-vitals 2.1 (6.x).
- **Vulnerabilities [verified with `npm audit`]:** 75 reported (5 critical, 35 high). Nearly all come from the old CRA build toolchain, not the code that ships to browsers, but they will keep showing up until you move off CRA.
- **Boilerplate left in `public/`:**
  - `manifest.json` still says "React App" / "Create React App Sample".
  - The meta description says "Web site created using create-react-app".
  - `index.html` has `lang="en"` although the content is Bengali.
  - `robots.txt` is the default empty one.
- **Inconsistent names:** the page title is "BoiKotha - হাদীস সম্ভার", the repo is "alhashor-search-engine", the package is "hadis-engine", and the README calls it "Alhashor Search Engine". Pick one.
- **Old React patterns:** `this` is passed to `pushState` in a function component, `class=` is used in JSX, there is no `key` on lists, and there are unused `Link`/`Router` imports and unused `reportWebVitals` and `src/logo.svg`.
- **Unused assets:** `logo1-3`, `logo5-6`, `searchicon.png` (438 KB), `book.png` (393 KB), `more.png`, `listen.png` and `logo.svg` are never referenced. The two large files alone are about 800 KB.
- **Bootstrap imported repeatedly:** the same CSS file is imported in `index.js`, `App.js`, `Search.js`, `Books.js`, `HadisView.js` and `NextPrev.js`.

## 3. Similar rough edges

- **Fragile relative paths:** `fetch("json/tags/...")` and `src="../photos/..."` are relative to the current URL. They work only because every page today sits at one path level, and they break the moment a page like `/books/bukhari/124` exists. This blocks the microsite plan; see [microsite.md](microsite.md).
- **Copy-pasted search:** `Topics.js` duplicates the whole search routine from `Search.js`, so every bug exists twice.
- **Hard-coded data:** the book list, hadis counts, topic index and search suggestions are hard-coded in components. The topic list contains duplicate spellings (তাকদীর/তাকদির, কিয়ামত/কেয়ামত, সুন্নাত/সুন্নত) that are only de-duplicated by exact string.
- **Debug leftovers:** `console.log(tag)` runs for every card on every render, and `alert()` is used for the copy confirmation.
- **Accessibility:** clickable `div`s (`.op`, `.more`, page controls, topic items) are not keyboard-focusable, and the `img` in `HadisView.js` has no `alt`.
- **No error or empty states:** a failed request leaves a spinner forever, with no message or retry.
- **No SEO or sharing:** every page has the same title and description, and nothing can be linked to a single hadis.
- **Repo weight:** about 35.7k tracked files, of which 32,886 are tiny per-hadis text files (about 71 MiB of real content in total). The file count makes cloning, CI and deploys slow, and it exceeds some hosts' file limits.
- **No CI or lint script:** `npm test` fails, and there is no `lint` script.
