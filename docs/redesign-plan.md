# Redesign Plan

The decisions made so far, and the plan for rebuilding the site from them. The ideas behind the feature list are in [redesign-ideas.md](redesign-ideas.md).

## 1. Decisions

- **Blueprint: D2 "Modern App".** The whole site is rebuilt to look and feel like it: bright and card-based, teal accent, rounded shapes, a floating bottom tab bar on phones, colour-coded books, serif Bengali for reading.
- **D5 "Quiet Minimal" vibes in two places only:** the **hadis full page** and the **search results**. D2 still dominates there (same colours, fonts, tab bar and buttons), but they feel calmer and more minimal. See section 3.
- **Every existing feature stays** (search, topics, books, hadis card, copy, paging, states, not-found page, back-to-top, keyboard access, page titles).
- **The new features to build are the ones you kept** from the ideas list: 24 ideas, with 23 (reminders and channels) as future scope.
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
- **Keep React 18, Vite and Vitest, pending the Next.js decision in section 9.** New code is written test-first, and the existing 104 tests are updated as screens change.
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
| 0 | **Foundations:** design tokens and three themes, fonts, remove Bootstrap, base components (button, chip, field, icon), shell (top bar, phone tab bar, footer, back-to-top, not-found), settings store, route skeleton | 1, 6, 5 (colours) |
| 1 | **Home:** hero with search entry, tiles, bookshelf, daily hadis card | 5, 22 (basic) |
| 2 | **Hadis full page** with the D5 softening | 7, 2, 3, 25 (copy, cite), previous/next, swipe |
| 3 | **Search and results** with the D5 softening; typing helper; filters and snippets | 13, 14, 18 |
| 4 | **Books:** picker, colour header, range grid, jump box, paging | 8 |
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
5. **Next.js (open decision):** stay on React with Vite, or move to Next.js? The plan above assumes Vite. See the next section.

## 10. Open decision: Next.js

Nothing in the ✅ Easy features needs Next.js. It only matters for the ideas that can't be done in the front end alone (see [redesign-ideas.md](redesign-ideas.md)).

| If you want... | With Vite (now) | With Next.js |
|---|---|---|
| SEO pages (28) | Not possible without a separate prerender step | ✅ Render each hadis page on demand and cache it, with a sitemap |
| Link previews (27) | Needs a small Netlify edge function | ⚠️ Per-hadis HTML is easy; preview *images* with Bengali text are risky |
| Narrator index (11), reminders (23) | ❌ | ⚠️ Build-time compute, scheduled functions; still needs your curation or outside services |
| Everything else in the plan | ✅ | ✅ (same UI) |

**Costs of moving:** routing and data loading are rewritten (react-router becomes Next's router). Server-rendered pages use Netlify credits on the free plan, so pages would need caching. The UI components themselves mostly carry over.

**Where it would go in the plan:** if yes, it becomes **phase 0**, before the design work, because the route structure changes. That way nothing is ported twice. If you choose to add it later, it becomes a final phase after phase 9.

**My lean:** stay on Vite for this redesign unless SEO pages or link previews matter to you. They are the main reasons to move. If they do matter, migrate first.
