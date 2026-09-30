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
- Bootstrap is imported once, and the unused Create React App styles are gone. The built CSS was checked: identical apart from those unused rules.

**Toolchain and dependencies**
- Moved from Create React App to Vite 7, with Vitest 3 for tests and ESLint 9 (flat config). Screenshots of all four pages are pixel-identical before and after, and everything passes on Node 20 and Node 25.
- React 18.3, react-router-dom 6.30, Bootstrap 5.3 and react-bootstrap 2.10 are up to date within their major versions.
- `npm audit` findings went from 75 to 9 (all in dev tooling, none in code shipped to browsers).

**Accessibility, titles and small fixes**
- Copy, "see the full hadis", book paging, topics and suggestions work from the keyboard.
- Copying shows a short "copied" note instead of `alert()`.
- Every page sets its own title, and unknown addresses show a not-found page.
- The topic list is de-duplicated by normalized spelling. The search box is a controlled input.

## Still to do

These need a decision from you, or are bigger changes:

- **Visible brand:** the project is named `alhashor-search-engine` (repo, package and README now agree), but the site itself still shows "BoiKotha" in its title, manifest and logo image. Change those too if you want the site to carry the same name.
- **Data delivery:** 35.7k tiny files in the repo make cloning, CI and deploys slow. Bundling the hadis into per-book or per-chunk files would help, but it changes the data layout and the deploy, so it needs your go-ahead. The real content is about 71 MiB.
- **Major version upgrades:** React 19, react-router-dom 7, and newer testing-library majors. They can change behavior, so each needs its own pass.
- **ESLint 9** is marked "no longer supported" by its maintainers (ESLint 10 exists). The plugins used here don't all support 10 yet.
- **Remaining audit findings:** 9, all in dev tooling.
- **Per-page descriptions and sharing:** each page has its own title now, but the meta description is the same everywhere, and a single hadis still can't be linked to.
