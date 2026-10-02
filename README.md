# BoiKotha (Alhashor Search Engine)

A Bengali hadis site covering six books: Bukhari, Muslim, Tirmidhi, Abu Dawud, Ibn Majah and Nasa'i (32,886 hadis files). It is a Next.js 16 / React 19 app that reads static JSON files shipped with it. There is no database and no outside service. All hadis text is Bengali.

Live site (when deployed): https://hadis.feeham.com. Work currently stays local: nothing is pushed or deployed.

## Features

- **Search** (`/search?q=&book=&page=`): by word, phrase, hadis number or narrator. Typing in Roman letters (for example `namaz`) offers Bengali spellings (a small curated list, then the Avro phonetic library, loaded only when needed). Book filter chips show a count per book. Each result shows the text around the match with the matched words highlighted.
- **Books** (`/books`, `/books/<book>?page=`): a picker of the six colour-coded books; a book page has a switcher, a "go to number" box (understands Bengali and English digits and several spellings of the book name), a range grid (one button per hundred numbers) and a pager. Pages hold 20 hadis that exist, so numbers with no data file are skipped.
- **Topics** (`/topics?topic=&page=`): 138 filterable topic chips, the topic's hadis as a paged list, and a curated "start here" block for topics with picks (`src/data/curatedTopics.js`).
- **Hadis page** (`/hadis/<book>/<number>`): calm reading column, folded narrator chain, reading time and progress line, copy / cite / link buttons, previous and next (arrow keys and swipe), breadcrumb back to the book.
- **Share** (`/share/<book>/<number>`): citation, share text, native share sheet and a quote-card image drawn on a canvas in the browser (download or share).
- **Daily** (`/daily`, `?tab=plans[&plan=<id>]`, `?tab=khutbah&ids=bukhari-1234,muslim-5`): hadis of the day (chosen from the date, no randomness), reading plans with per-day ticks kept on the device, and a khutbah sheet (the list lives in the address; copy, link and a print layout).
- **Related hadis**: a short list under each hadis page, read from pre-built shards (see Data scripts).
- **Compare**: in progress; the route does not exist yet (`src/compare/` holds its state so far).
- **Themes and reading settings** (`/settings`): light, dark, sepia or follow the device; text size, line gap, text width and Bengali or English digits. Saved on the device only.

## Run it

Needs Node 20.9 or newer (`.nvmrc` says 20). The browser scripts under `scripts/` need Node 22 or newer.

```sh
npm ci            # install
npm run dev       # dev server at http://localhost:3000
npm run build     # production build
npm start         # serve the production build at http://localhost:3000
npm test          # Vitest in watch mode; npm test -- --run runs once
npm run lint      # ESLint, zero warnings allowed (includes jsx-a11y)
```

## Repo layout

```
src/
  app/        routes (Next.js App Router): page.jsx, search, books/[book], hadis/[book]/[number],
              share/[book]/[number], topics, daily, settings, not-found; layout.jsx loads the stylesheets
  shell/      top bar, phone tab bar (with the More menu), footer
  home/       home page            search/   search page, box, filters, results, searchIndex.js
  books/      book pages           topics/   topic index, start-here block, pager
  hadis/      hadis page, shared hadis card, related list
  daily/      daily card, plans, khutbah sheet   share/  quote card and share logic
  compare/    compare state (page not built yet)
  settings/   settings store, provider, page, inline theme script
  ui/         Button, Chip, Icon, BookBadge, Toast
  styles/     tokens.css (colours, three themes) plus one stylesheet per area; plain CSS, no framework
  lib/        pure logic with tests: books list, number parsing, daily pick, plans, share text,
              card layout, topics, Roman-letter helper, digits
  data/       hand-written content: curated topic picks, reading plans
  Helpers/    page title, paging, URL params, Bengali normalising, back-to-top
  assets/fonts/  the three font families (SIL Open Font License), served by next/font/local
  test/       test helpers (real-data fetch stub, Next router mocks, canvas stub)
public/json/
  hadis/<Book>/<0001>/text.txt   one hadis (a JSON string); folders Bukhari, Muslim, Tirmiji, Daud, Majah, Nasae
  tags/<first two letters>.json  word -> tags of hadis containing it (e.g. "BUK-124"); 1,645 files
  substring/<..>.json            word -> longer words containing it; 1,164 files
  short-hadis.json               numbers of hadis of 60 words or fewer, per book code (daily pick)
  related/<CODE>-<n>.json        up to 3 related hadis per hadis, 100 hadis per shard (BUK-0.json ...)
docs/         redesign-plan.md (decisions, phases, deviations), redesign-ideas.md, design/ (D2 and D5 references)
```

Tests sit next to the code they cover (`*.test.js`, `*.test.jsx`). Some use the real files in `public/json`.

## Self-contained rule

Everything ships with the app: no database, no CDN fonts, analytics, third-party scripts or APIs, no hosted storage or accounts. Fonts are files in `src/assets/fonts`. The only storage is the visitor's own device (`localStorage`: `boikotha.settings`, `boikotha.plan-progress`, `boikotha.compare`). Details are in section 11 of `docs/redesign-plan.md`.

Checks (they use headless Google Chrome; the default path is the macOS one, override it with `CHROME=/path/to/chrome`). Build first, then run each against a server. `scripts/with-server.sh <port> "<start command>" <command...>` starts the server, waits for it, runs the command and stops the server:

```sh
npm run build
scripts/with-server.sh 3000 "npm start" scripts/check-self-contained.sh http://localhost:3000
scripts/with-server.sh 3000 "npm start" scripts/smoke.sh http://localhost:3000
scripts/with-server.sh 3000 "npm start" node scripts/browser-checks.mjs http://localhost:3000
scripts/with-server.sh 3000 "npm start" node scripts/theme-shots.mjs http://localhost:3000 /tmp/shots
```

- `check-self-contained.sh <base-url> [extra-route ...]` loads `/`, a search, `/topics` and `/books` (plus any extra routes) in headless Chrome, records every network request in a Chrome net-log and fails if the page asked for any other host (`outside-hosts.py` reads the log).
- `smoke.sh <base-url>` checks status codes (data files served, missing data is a real 404, bad hadis and book addresses are 404), that deep links render real content in the browser, and the exact page title of each route on a fresh load.
- `browser-checks.mjs <base-url>` drives Chrome through `browser.mjs` (a small dependency-free DevTools driver): paging lands at the top, a saved dark theme is applied, a keyboard walk (tab order, focus rings, Enter opens the narrator chain, arrow keys move between hadis, no sideways overflow at narrow widths), and the books jump box, pager and range grid.
- `theme-shots.mjs <base-url> <out-dir>` screenshots home, search, results, a hadis, books, a book, topics, a topic and settings in all three themes at 390 and 1200 px, and fails on sideways overflow or a theme not applied. It does not cover `/daily` or `/share`.
- `screenshots.sh <base-url> <out-dir> [WxH]` takes plain screenshots of the main pages; `compare-screenshots.py <dir-a> <dir-b>` diffs two folders of them (needs Pillow).

## Data scripts

Run once from the repo root when the data changes. Both read `public/json/hadis` and tolerate a text with a raw control character.

- `node scripts/build-short-hadis.mjs` writes `public/json/short-hadis.json` (hadis of 60 words or fewer, used by the daily pick).
- `node scripts/build-related.mjs` writes `public/json/related/<CODE>-<n>.json`: for each hadis up to 3 related ones, by words they share weighted by rarity, with a small bonus for another book; two near-identical texts in different books are marked as the same report. The method is described at the top of the script.

## Deploy notes

`netlify.toml` builds with `npm run build` on Node 20 and sets cache and CORS headers for `/json/*` and `/photos/*`. `.github/workflows/ci.yml` installs, lints, tests and builds on every push and pull request; its Netlify deploy step is switched off (`if: false`) because it was written for a static folder and must be reworked for Next.js (Netlify's Next.js support) before deploys resume. Nothing here is pushed or deployed for now.

## Notes

- Some hadis numbers have no data file (334 in Bukhari's range, 5 in Nasa'i). Pages show "this hadis was not found" for them, and previous / next skip them.
- Searches match a normalized Bengali spelling because the data spells some letters two ways (`src/Helpers/bengali.js`, `src/search/searchIndex.js`).
- `public/photos/` holds images from the old site that no page uses now (the headers and `smoke.sh` still mention it).
