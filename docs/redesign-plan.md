# Redesign Plan

The decisions made so far, and the plan for rebuilding the site from them. The ideas behind the feature list are in [redesign-ideas.md](redesign-ideas.md).

## 1. Decisions

- **Blueprint: D2 "Modern App".** The whole site is rebuilt to look and feel like it: bright and card-based, teal accent, rounded shapes, a floating bottom tab bar on phones, colour-coded books, serif Bengali for reading.
- **D5 "Quiet Minimal" vibes in two places only:** the **hadis full page** and the **search results**. D2 still dominates there (same colours, fonts, tab bar and buttons), but they feel calmer and more minimal. See section 3.
- **Every existing feature stays** (search, topics, books, hadis card, copy, paging, states, not-found page, back-to-top, keyboard access, page titles).
- **The new features to build are the ones you kept** from the ideas list: 24 ideas, with 23 (reminders and channels) as future scope.
- **Next.js first, redesign second.** The site is migrated to Next.js before any design work (phase 0A).
- **Self-contained.** Everything lives in the application: no database and no outside services (no CDN fonts, analytics, third-party APIs or hosted storage). The data files stay in the repo and ship with the app. See section 11.
- **The designs are a blueprint, not a rulebook.** Where a design is weak, unfinished or not up to the mark, I improve it, and every deviation is logged in section 12.
- **Work stays local.** No pushing and no deploying, until you say otherwise.
- **Reference files** (saved copies, so they don't depend on the private links):
  - [docs/design/d2-modern-app.html](design/d2-modern-app.html), the blueprint. Open it in a browser and switch on "Labels" to see component codes.
  - [docs/design/d5-quiet-minimal.html](design/d5-quiet-minimal.html), the source for the minimal feel.
  - Live prototypes: https://claude.ai/artifact/PqKH7BUqni2T3VX4omeDCU (D2) and https://claude.ai/artifact/M4gfbMT7Uz8x3MP1L8Y3CW (D5).

## 2. D2 design system (copy these)

- **Colour tokens**, all three themes (light, dark, sepia): light page `#d9e8e3`, background `#f2f8f6`, surface `#ffffff`, ink `#0f2d28`, accent `#0b8a78`, accent soft `#d6f0ea`, highlight `#ffe9a0`. Dark and sepia values are in the D2 file's `:root` blocks.
- **Book colours** (one per book, used on badges, headers, filters and bars): বুখারী `#0f8a66`, মুসলিম `#3a63c8`, তিরমিযী `#c08108`, আবু দাউদ `#8a4bb8`, ইবনে মাজাহ `#d3582a`, নাসাঈ `#c3387f`.
- **Fonts:** Hind Siliguri for the interface, Noto Serif Bengali for reading text, Plus Jakarta Sans for Latin and numbers.
- **Shapes and spacing:** rounded 16 to 24 px cards, pill buttons and chips, a soft two-layer shadow, about 16 px page padding.
- **Reading variables** (user-adjustable): font size (default 18 px), line height (default 1.9), text width (default 34 em).
- **Navigation:** top bar with brand and links on wide screens. On phones a floating rounded bottom tab bar (Home, Search, a raised centre button, Books, Topics, More) and a back-to-top button.
- **Motion:** small and quick, and switched off when the visitor prefers reduced motion.

## 3. Where D5 softens D2

**Hadis full page.** Keep D2's colours, fonts, pills and buttons, but:
- Drop the coloured header band and heavy shadow. Use the book badge plus a thin book-colour hairline instead.
- Breadcrumb as quiet text, not pills.
- A thin (2 to 3 px) sticky reading-progress line with "reading time · words" beside it, instead of a boxed bar.
- One calm reading column: serif text at about 20 px with a line height near 2.0 and a measure of about 38 rem.
- The narrator chain stays folded ("বর্ণনায়:" with expand), kept small and quiet.
- Actions (copy, copy citation, share, add to compare) as small quiet pill buttons. The permanent link as small grey text with a copy button.
- Previous and next as two plain text links under a hairline, not boxed cards.
- Related hadis as a hairline-separated list (book badge, title, two lines of text), not a boxed card with match percentages.

**Search results.** Keep D2's search box, chips and tab bar, but:
- Results as an unboxed list separated by hairlines, not stacked shadowed cards.
- The count line as light typography: "মোট ৪০৩ টি হাদিস পাওয়া গেছে", then "১ - ২০ পর্যন্ত দেখানো হচ্ছে".
- Book filter chips with a coloured dot and count (D2 chips).
- Matched words highlighted in the snippet (D2 highlight colour). Quiet "সম্পূর্ণ হাদীস দেখুন..." link, and quiet copy and share links.
- Generous spacing between results, and a plain pager (« আগের, পাতা ১ / ২০, পরের »).

## 4. Scope

**Build (all marked ✅ Easy in the ideas doc):**
1 reading comfort and themes, 2 narrator chain folded, 3 reading time and progress, 5 book colours and bookshelf home, 6 app-style mobile navigation, 7 hadis full page, 8 jump to number and range grid, 10 compare, 12 curated topic pages, 13 filter by book with counts, 14 highlighted snippets, 18 Roman-letter typing, 22 daily hadis, 24 reading plans and khutbah sheet, 25 copy citation and share text, 26 quote-card image.

**Later, in a second round (⚠️ Hard in front end only):** 9 related hadis (best with a one-time script), 15 forgiving search, 17 word-proximity, 19 search in a Web Worker.

**Not in the front-end build (❌):** 11 narrator index, 27 link previews, 28 SEO pages, 23 reminders and channels (future scope). They need a server or a build step. A small "coming later" page for 23 is optional.

**Rejected:** 4, 16, 20, 21, 29, 30, 31, 32.

## 5. Architecture decisions

I'm making these unless you object.

- **Drop Bootstrap and react-bootstrap.** D2 is its own design system, so Bootstrap would fight it. This also shrinks the CSS (236 KB today).
- **Next.js 16 (App Router) with React 19.** Vitest stays for tests (Vite is used only as its test tooling). New code is written test-first, and the existing 104 tests are updated as screens change.
- **Plain CSS with design tokens** as CSS variables, one file for tokens and one per area. No CSS framework.
- **Routes:** `/` home, `/search?q=&page=&book=`, `/hadis/:book/:number`, `/books` and `/books/:book?page=`, `/topics?topic=&page=`, `/compare?ids=`, `/daily`, `/settings`, and `*` for not-found. Everything stays shareable from the address bar.
- **Saved on the device only** (no accounts): theme, reading settings and digit style. Reading-plan progress too, if you agree (see section 9).
- **Fonts:** load from Google Fonts at first, then self-host a subset later for speed and privacy.
- **One shared hadis card and one shared result list**, so Search, Topics, Books and Compare look consistent.
- **Adjacent-hadis navigation** skips the numbers that have no data file.

## 6. Phases

Each phase ends with passing tests, lint and build, and a screenshot check against the D2 file at phone width (390 px) and desktop width (about 1120 px). Each phase is committed locally, on a `redesign/d2` branch.

| Phase | What | Features |
|---|---|---|
| 0A | **Done:** **Next.js migration** with no change in behavior: App Router, React 19, routes and links, test harness for the Next router, build and lint, self-contained check. All existing features and tests keep working | - |
| 0B | **Done (in Phase 2 of the build):** **Foundations:** design tokens and three themes, fonts, remove Bootstrap, base components (button, chip, field, icon), shell (top bar, phone tab bar, footer, back-to-top, not-found), settings store, route skeleton | 1, 6, 5 (colours) |
| 1 | **Done (in Phase 2 of the build, without the daily hadis card):** **Home:** hero with search entry, tiles, bookshelf, daily hadis card | 5, 22 (basic) |
| 2 | **Done:** **Hadis full page** with the D5 softening | 7, 2, 3, 25 (copy, cite), previous/next, swipe |
| 3 | **Done:** **Search and results** with the D5 softening; typing helper; filters and snippets | 13, 14, 18 |
| 4 | **Done:** **Books:** picker, colour header, range grid, jump box, paging | 8 |
| 5 | **Topics:** chip index, results, curated "start here" pages | 12 |
| 6 | **Share:** citation, share text, native share, quote-card image | 25, 26 |
| 7 | **Daily, plans, khutbah sheet** | 22, 24 |
| 8 | **Compare:** pick two to four, highlight differences | 10 |
| 9 | **Polish and QA:** keyboard and screen-reader pass, reduced motion, performance, all three themes on phone and desktop, README | all |
| Later | Hard items: related hadis, forgiving search, proximity, Web Worker | 9, 15, 17, 19 |

**Data tasks alongside:**
- Fix the one broken file (Nasa'i 435: a raw control character makes strict JSON parsing fail).
- Parse the narrator chain in the browser and test it on real samples from every book. Ibn Majah texts have no leading number.
- Build the list of short hadis (60 words or fewer; about 18k) with a one-time script, for the daily hadis.
- Take the owner's curated lists: start-here lists per topic, seasonal picks, reading plans.

## 7. Working rules

- **Local only:** no push, no deploy.
- **Test first** for logic (chain parser, jump-to-number parser, daily pick, diff, settings), and component tests for each screen.
- **Screenshots** of the real app in headless Chrome compared to the D2 reference at both widths, in all three themes.
- **Nothing existing breaks:** the old behavior tests stay green until a screen is deliberately replaced.
- **Sample content** in tests and demos uses the real hadis texts from the data, never invented ones.

## 8. Risks

- **The designs were never fully reviewed visually** by their designers (D2 had one phone-width screenshot of Home). Expect small visual fixes while porting.
- **Bengali fonts are heavy.** Google Fonts first, subset and self-host later.
- **Quote-card images** with Bengali text must be tested on Safari, where font rendering in image export can differ.
- **Some hadis numbers have no data file**, so previous and next must skip them and the jump box must explain gaps.
- **Free Netlify credits:** more image and font downloads mean more bandwidth when this is eventually deployed.

## 9. Questions for you

1. **Bootstrap:** OK to drop it entirely?
2. **Reading-plan progress:** OK to store it on the device? It's separate from the rejected bookmarks and history.
3. **Curated content:** who writes the start-here lists per topic, the seasonal picks and the plans? I can draft a first version from keyword searches for you to edit.
4. **Phase order and review:** OK to build phase by phase, showing you screenshots after each, starting with phase 0 and 1?

## 10. Decision: Next.js first

Decided: migrate to Next.js before the redesign, so routing and data loading are built once.

- **Phase 0A keeps behavior identical.** It is a framework move only. Pages that work today keep working, and all tests stay green.
- **Server rendering comes later,** when the hadis full page is built. That is what unlocks SEO pages (28), link previews (27) and the other ideas that needed a server or a build step.
- **Server code must stay self-contained.** A server-rendered hadis page reads its text from inside the application: either files bundled with it or the same site's static files. Never a database or an outside service.
- **One platform detail to decide later:** on Netlify, cached (incremental) rendering stores its cache in Netlify's own storage. That is part of the host, not something we add, but it is the one place "nothing external" gets grey. The options are pages rendered without caching (uses more free credits), pages generated ahead of time, or accepting the host's cache.
- **Deploy later:** the current GitHub Actions deploy step builds a plain static folder and will need reworking for a Next.js site. It is not touched until deploys resume.

## 11. Self-contained rule and how it is checked

- **No database, no outside services.** No CDN fonts (fonts are files in the repo, loaded with `next/font/local`), no analytics, no third-party scripts or APIs, no hosted storage or accounts.
- **Only the visitor's own device stores anything** (theme, reading settings, digit style, plan progress).
- **Check before each phase is done:** a script scans the built output for addresses on other domains, and a headless-Chrome run records every network request while the main pages load. Any host other than the site itself is a failure.

## 12. Design deviations

The designs are a blueprint. This is the running list of where the build departs from them and why. Known so far:

- **Prototype-only parts are dropped:** label pills, the control bar, the screen switcher, the "নমুনা" sample notes and the sample-hadis chips.
- **Previous/next:** the prototypes cycle through a handful of samples. The real pages go to the adjacent hadis number in the same book and skip numbers that have no file.
- **Related hadis:** D2's match percentages are dropped, because there is no real score. Each item shows the reason instead (shared words, same report in another book).
- **Counts and numbers:** placeholder figures are replaced by real ones from the data.
- **Anything not up to the mark** found while building (spacing, contrast, weak states, unverified dark and sepia themes) is fixed in the build and added here.

Phase 0A result: migrated to Next.js 16 and React 19. All five pages are pixel-identical to the Vite build, 124 tests pass, lint is clean, and the self-contained check (no request to any other host) and the 10 smoke checks pass.

One thing the migration taught: the old single-bundle app let pages lean on each other's CSS (for example `Loading.css` centred the text in Home's cards, and `Topics.css` zeroed Bootstrap's row margins everywhere). Next.js loads CSS per page, which exposed this. All component stylesheets are therefore imported from `src/app/layout.jsx` in the old bundle's order, and a test pins that order. The redesign replaces these stylesheets, so this coupling goes away then.

Phase 2 result (build Phase 2: design system, shell, Home, hadis page, search): tokens and three themes, self-hosted fonts, reading settings (with a small settings page), digit style, shell (top navigation, phone tab bar with a More menu, footer, back-to-top, toast), Home (hero, tiles, bookshelf), the hadis page at `/hadis/<book>/<number>` and the search page. About 300 tests pass, lint is clean, and the self-contained, smoke and real-browser checks pass (`scripts/theme-shots.mjs` screenshots every theme at 390 and 1200 px and checks for sideways overflow; `scripts/browser-checks.mjs` includes a keyboard walk).

Departures from the designs made in this phase:

- **Previous/next** stay inside one book and skip numbers with no file. They are plain hairline links (D5), not cards. Arrow keys and horizontal swipe move between hadis.
- **No related-hadis list and no daily-hadis card yet** (Phase 4 and Phase 3 of the build). Home also leaves out the "new features" quick-link row until those pages exist.
- **Real numbers everywhere:** the bookshelf spine heights follow the real hadis counts (Bukhari 6,719 because 334 numbers have no file), and the footer total is computed from the data (32,886).
- **Badges:** Abu Dawud is "দা" and Ibn Majah "মা" as in D2, so the six badges are distinct.
- **Settings:** a small `/settings` page (theme, text size, line gap, text width, digit style, reset) was built now so the settings link is never a 404. The theme is the `data-theme` attribute on the page, set before first paint by an inline script, so there is no flash.
- **Search:** typing in Roman letters shows Bengali spellings (a curated list first, then the open-licence Avro phonetic library, loaded only when needed). Each result shows the text around the match, with spelling variants of a letter highlighted too. The book filter row shows a count per book for the whole search; a book with no hits is disabled.
- **Tab bar:** the raised Search button sits in the centre as in D2. The "More" button opens a small menu holding the settings link.
- **Phone layout uses media queries at 640 px** instead of D2's container queries (D2 needed those only to fake a phone in a frame).
- **Copy toast** shows after the clipboard write succeeds, so a blocked clipboard says so instead of claiming success.
- **Legacy look that remains until Topics is rebuilt (Phase 5):** Topics still uses the old Bootstrap styling (including a red scrollbar from `Topics.css`), and its stylesheets are still imported in the old order from the layout. Books has been rebuilt (below).
- **Case-insensitive file systems:** `src/Home` and `src/Search` were renamed to lower case (`src/home`, `src/search`) with `git mv`; a stale import with the old case passed on macOS but would fail on Linux, so it was fixed.

Phase 4 result (Books): `/books` is a picker of the six books, and `/books/<book>?page=<n>` is a book's page: colour header, a switcher between books, a "go to number" box, a range grid (one button per hundred numbers) and a pager. The old Books page and its stylesheet are gone. About 376 tests pass, lint is clean, the build pre-renders all six book pages, and the real-browser checks pass (the jump scrolls to the hadis and marks it, the pager lands at the top, no sideways overflow at 320 px).

Departures from the designs made in this phase:

- **Pages are 20 hadis that exist, not 20 numbers.** Bukhari has gaps (for example 1923 to 2119), and paging by number would leave empty pages. The label under the range grid shows the real numbers on the page ("হাদীস নং ৬১ - ৮১"), and the old "−10 / +10" controls stay, as "−১০ / +১০" next to previous and next. The page label sits above the buttons so the pager fits a 320 px phone.
- **A range with no hadis at all is shown dimmed and cannot be opened** (Bukhari 2,001 to 2,100), with a hover note, instead of leading to an empty page.
- **Jump to number** understands Bengali and English digits, the book's spellings (full, short, older and Roman-letter), a bare number for the open book, and "নং", "#" and commas. It explains what it cannot open: unreadable text, a number past the end, a number with no file (with links to the hadis either side). It goes to that page of the book and marks the hadis (`?hadis=45`), rather than to the hadis page, so the neighbouring hadis stay in view; the hadis page's breadcrumb uses the same address, so "back to the book" returns to where you were.
- **The pointed-at hadis is marked and scrolled to by the page, not by a `#` link.** The router does not update `:target`, and cards loading above the hadis moved it off screen, so the page holds it in view while the texts load and stops as soon as the reader scrolls, touches, clicks or types.
- **Book pages are built ahead of time** (six static pages), with the header and switcher already in the pre-built page; only the page number is read in the browser.
- **One shared hadis card** (`src/hadis/HadisCard.jsx`) with copy, loading, "not found" and retry states, ready for Topics and Compare. A text over 600 characters is cut with a link to the full page. Share and "add to compare" buttons arrive with Phases 6 and 8.
- **Chip** (`src/ui/Chip.jsx`) is a plain button unless it is given a `pressed` value, so the example chips are not announced as toggles.
- **Range cells are 44 px tall** (D2's are about 30 px) and the grid is not height-limited on desktop.
- **Data:** Nasa'i 435 and the short-hadis list are still open data tasks.

