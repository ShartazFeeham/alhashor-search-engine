# Non-Core Issues

Everything outside the core search and hadis-display logic (see [core-improvements.md](core-improvements.md)).

## Done

**Books page**
- Every book button opens the book it names. The Abu Dawud and Ibn Majah buttons used to load each other's books.
- Clicking the open book no longer jumps back to Bukhari.
- Hadis counts now match the data. Tirmidhi was 3,500 in the code but has 3,608 files.
- Paging is clamped to the first and last page, and the range label never runs past the last hadis.
- The books, codes and counts live in one list, `src/Books/bookList.js`.

**Home, navigation and routing**
- The Home buttons no longer throw an error on click, and their unused handlers are gone.
- The navbar uses router links, so navigating no longer reloads the whole app. It sits inside the router.
- The logo switches with CSS, not with `window.screen.width` at render time.
- The `pushState` history workaround is removed.
- The back-to-top button has a role, a label and keyboard support.

**Markup and warnings**
- No `<b>` wrapper on the navbar, no invalid `<normal>` element, and `<tbody>` in the paging table.
- `class` became `className`, and lists have `key` props.
- All images use absolute paths (`/photos/...`), so they load on any URL.
- The five ESLint warnings are fixed and `npm run lint` runs with zero warnings allowed.

**Tests, docs and boilerplate**
- The failing default test is replaced. The suite now has 59 tests, and CI runs them.
- `README.md` was corrupted and is rewritten.
- Page language is `bn` and the description is real. The manifest says BoiKotha instead of "Create React App Sample".
- Ten unused images and `src/logo.svg` are removed. The Home page no longer advertises audio playback, which doesn't exist.

## Still to do

**Outdated**
- **Create React App:** `react-scripts` 5.0.1 is unmaintained, and CRA was officially deprecated in 2025. The path forward is Vite.
- **Dependencies:** react 18.2 (latest 19.x), react-router-dom 6.8 (6.30 available, 7 is latest), bootstrap 5.2 (5.3), react-bootstrap 2.6 (2.10), and the testing-library packages are one or two majors behind.
- **Vulnerabilities:** `npm audit` reports 75, mostly in the old CRA build tooling, not in code shipped to browsers. They mostly disappear when moving off CRA.
- **Naming:** the page title is "BoiKotha - হাদীস সম্ভার", the repo is "alhashor-search-engine", the package is "hadis-engine". This is a brand decision.

**Rough edges**
- **Bootstrap CSS** is imported in six files. Webpack ships one copy, so it's only source noise. I left it because removing the duplicates changes the CSS order and could change how the pages look.
- **Accessibility:** other clickable `div`s (copy, "see the full hadis", paging, topic items, book paging) still aren't keyboard-focusable.
- **Topics list:** near-duplicate spellings (তাকদীর/তাকদির, কিয়ামত/কেয়ামত, সুন্নাত/সুন্নত) are only de-duplicated by exact string.
- **Copy confirmation:** it uses `alert()`. A small toast would be nicer.
- **Search box:** the input is uncontrolled and the Suggestions component fills it through `document.getElementById`.
- **SEO and sharing:** every page has the same title and description, and a single hadis can't be linked to.
- **Unknown URLs:** any path other than the four pages renders a blank page. A small "not found" page would help.
- **Data delivery:** 35.7k tiny files in the repo make cloning, CI and deploys slow. Bundling hadis into per-book or per-chunk files would help. The real content is about 71 MiB.
