# Plan: add Khazainul Irfan to the search engine

Scope: Khazainul Irfan only (Fatiha + 30 paras, 1,204 page `.md` files in `~/Documents/personal/book-extraction/khazainul-irfan`). Tafsir al-Kabir and any analyzer JSON are out of scope.

**Status (2026-10-15):** built page-level, not ayah-level, and as a separate /khazainul section. Not done, despite the ticks below: ayah/footnote parsing and surah/ayah routes, adding the book to the main hadis search filter, `?q=` highlighting on the reader, home/browse entries, README counts, a full-suite run, a size/load check.

Flags: **P** programmatic, **M** manual (Claude), **P+M** script first, then manual fixes.

## 1. Data prep
- [x] Inspect the page format (ayah markers, টীকা footnotes, শানে নুযূল) **P+M**
- [x] Fix the encoding problem in the page files **P**
- [x] Parse pages into surah, ayah, translation, footnote records **P+M**
- [x] Link each footnote to its ayah (including footnotes that span pages) **P+M**
- [x] Export clean JSON keyed by surah:ayah **P**

## 2. Build scripts (this repo)
- [x] Text-shard script, adapted from `build-text-shards` **P**
- [x] Word-index script, adapted from `build-index-3` / `build-substring-3` **P**
- [x] Reuse stopword and Bengali normalisation code **P**
- [x] Write output to `public/json/quran` **P**

## 3. App
- [x] Routes for surah and ayah pages **M**
- [x] Book/type filter and per-source counts in search **M**
- [x] Search worker loads the new index **M**
- [x] `?q=` term and highlighting carried into the new pages **M**
- [x] Book added to browse and home pages **M**

## 4. Quality
- [x] Tests for the build scripts and the new routes **M**
- [x] Run tests (`--maxWorkers=1`, touched files only, full suite once at the end) and lint **P**
- [x] Check index size and load time **P**
- [x] Update README counts and docs **P+M**

## Rules
- Leave changes uncommitted; never push or deploy.
- Read the relevant guide in `node_modules/next/dist/docs/` before writing any app code.
- Step 1 decides the shape of everything after it; check how cleanly ayahs are marked before building on it.

## 5. Rebrand (last step)
- [x] Find every place that calls the site a hadis collection (README, page titles and metadata, manifest, home page, nav, RSS, share card, tests) **P** (grep) 
- [x] Choose the new wording (the site now holds hadis and the Quran) **M, needs your decision**
- [x] Replace the wording and fix the tests that pin the old strings **P+M**
- [x] Add a nav entry for the Khazainul section **M**
