# Decision: subsequence-based mapping, and 3-letter index sharding

Date: 2026-10-02. Status: decided. The evidence is in [search-index-decision/](search-index-decision/): three advisors (`advisor-1` relevance simulation, `advisor-2` size and cost, `advisor-3` Bengali linguistics and UX), two judges (`judge-1` re-ran the numbers, `judge-2` product and maintenance, with 20 test cases), and the lead's position written beforehand (`my-response`).

## The decision

- **Do not build a subsequence mapping** in any form: not a static index, not a folded variant index, not a precomputed delete-neighbourhood file, not edit distance 2. All three advisors and both judges agree, and so does the lead.
- **Do build, in stages:** a relevance test set, silent spelling-family expansion, one in-memory word list with folding and endings, and at most 3 "did you mean" chips (plan below).
- **Do now:** shard `tags/` and `substring/` by the first 3 letters, keep the 2-letter files, and keep a switch between them (the owner's instruction). Cap the `substring` expansion so the 3-letter files do not raise the request count.
- **Revisit subsequence only if** the relevance test set still shows a gap on dropped-letter typos after stage 4, and then only as a last-resort suggestion tier, never for retrieving results.

## Why not subsequence (verified on the real data)

| Claim | Result | Source |
|---|---|---|
| A typo is never a key in `substring/` (all 22,418 keys are vocabulary words), so a precomputed map cannot answer a typo | 0 of 500 simulated dropped-letter typos were keys | judge-1, advisor-1 |
| A subsequence scan finds only omissions | about 95% of one dropped letter at rank 20; 0 to 5% of wrong letters, swaps, extra letters and added endings | advisor-1 |
| Edit distance 1 does the same job and more | 97% drop-1, 92% swap, 97% insert, with 3.8 candidates instead of 8 | advisor-1, advisor-3 |
| Subsequence is noisy | half of anchored matches break a syllable (সুদ→সুন্দর, কবর→কবীরা) | advisor-3 |
| The static index barely produces anything | 0.7 entries per key; 78% of keys get none (কিতাব, জান্নাত, ঈমান) | advisor-2 |
| The lead's first sample (46 vs 14.5 matches per key) was misleading | it was driven by 2- and 3-letter keys; for keys of 4 or more letters it is 3.1 extra matches | advisor-2 |

## Who was right

- **The lead was wrong** that a delete-neighbourhood list would be small. As a static file it is about 2.8 MB gzipped (judge-1). It must be computed live from one word list instead.
- **Advisor 1's numbers hold**, but the corruption mix was invented, so the per-type columns are more reliable than the pooled one.
- **Advisor 3's** "26 of 38 Roman misses fixed by the skeleton" was tuned on its own cases, so treat it as optimistic.
- **Judge 2 found the largest real problem:** spelling families are hidden today. সওয়াব returns 293 hadis and hides 165 under সাওয়াব; তওবা, দুআ and রমজান hide 134, 237 and 218. The synonym groups only appear as a suggestion when fewer than 3 hadis are found.
- **Judge 1 found the largest risk of sharding:** the `substring` expansion fetches one `tags` file per containing word, so 3-letter shards raise requests (for "কে", 468 files become 1,334 uncapped). Capping at the top 50 containing words by hadis count cuts average files from 28.4 to 6.9 and p99 from 675 to 39, and keeps 99.0% of hadis. Requests are most of the Netlify credit cost.

## Plan (each stage behind its own flag)

| Stage | What | Fixes | Done when |
|---|---|---|---|
| 0 | Relevance test set (20 cases in `judge-2.md`, 13 fail today) and the missing-word fallback (TODO 1) | gives every later change a gate | the 20 cases run in the suite, baseline recorded |
| 1 | Silently expand the spelling groups from `src/data/searchSynonyms.js`, no new files | hidden spelling families | cases 1 to 5 pass; the typed spelling ranks first |
| 2 | One word list (about 100 KB gzipped, with hadis counts); run "did you mean" from memory; fold safe letter pairs (ী/ি, ূ/ু, ণ/ন, য়/য, ঙ/ং, ৎ/ত) and strip verified endings at lookup time | inflected forms, first-two-letters typos, up to 7 downloads per suggestion removed | the cases pass and no new data folder is added |
| 3 | At most 3 chips from edit distance 1, then a consonant skeleton last, with a stricter threshold (whole-vocabulary edit-1 makes a suggestion eligible for 49% of rare correct words, against 39.5% today) | typos, Roman typing misses | no regression on the guard cases |
| 4 | Make 3-letter shards the default, with the expansion cap | worst `tags` file 863 to 431 KB, worst `substring` file 351 to 126 KB | a golden test: 2- and 3-letter modes return identical sets with the cap off |

Stages 0 to 3 are not built yet. Stage 4 is built now (below), ahead of the word list: this is a known risk, because 3-letter shards put 48 to 68% of typos outside the typed word's file (33 to 49% at 2 letters) until the word list ships.

## Switches

- All in one file, `src/search/searchConfig.js`: `tagsPrefix` (2 or 3), `substringPrefix` (2 or 3), `capContaining` (on or off), and later `variants`, `fold`, `endings`, `listSuggest`.
- Judge 2 advised against a URL switch; the owner asked to switch "at any moment", so the two prefix lengths can be overridden at runtime with `?idx=2|3` and `?sub=2|3` on `/search` (a developer switch: nothing in Settings). Defaults come from the config constants.
- Each switch keeps both behaviours working. The 2-letter files stay until the 3-letter mode has been green for a release.

## Not building

- A static subsequence index, a folded variant index, a precomputed delete file, edit distance 2, and any silent folding of শ/ষ/স, জ/য, ছ→স, aspirates or ড়→র (they would merge different words).

## Risks

- 3-letter shards mean 9,655 and 6,123 files (up from 1,645 and 1,164), so the repo grows by about 30 MB and each search can fetch more, smaller files.
- The 2-letter files stay behind the switch until a golden test shows both modes agree.
- The cap loses about 1% of hadis for very common containing words; it is a flag.
- No generator for `tags/` and `substring/` existed, and tokenising the texts reproduces only about 94% of `tags/`. The new files are therefore regrouped from the existing ones, not rebuilt from the texts.

## Implementation status

Date: 2026-10-02. **Stage 4 (3-letter shards and the cap) is built for both folders**, `tags/` and `substring/`, and nothing else is.

- **Built:** `public/json/tags3/` (9,655 files) and `public/json/substring3/` (6,123 files, 8.6 MB, each list sorted by hadis count, made by `scripts/build-substring-3.mjs`); the two 2-letter folders are untouched and stay as the rollback. The expansion cap works on the sorted `substring3` lists.
- **Switches** (all in `src/search/searchConfig.js`, overridable on the `/search` address, passed to the Web Worker in each message): `tagsPrefix = 3` (`?idx=2|3`), `substringPrefix = 3` (`?sub=2|3`), `containingCap = 50` (`?cap=0` off, `?cap=1` to `?cap=500`). The cap was first ignored with `?sub=2` (those lists were not sorted); see the last bullet of this section, where that changed. The config names in the Switches section above (`capContaining`, on or off) became `containingCap`, a number.
- **Checked:** golden tests give identical hadis in identical order for 2- and 3-letter modes with the cap off (56+ real queries for `?sub`, and the four `?idx` by `?sub` combinations); on 20 common words the cap cuts the tags files opened from 4,913 (3 letters, uncapped) to 361, below the 2,068 of the 2-letter files, and keeps 98.2% of the hadis. Numbers in `docs/redesign-plan.md`. One side effect: the containing words are now read in sorted order in both modes, which changes only the order of equally ranked hadis.
- **Not built yet:** stages 0 to 3 (the relevance test set and the missing-word fallback, the spelling-family expansion, the in-memory word list with folding and endings, the "did you mean" chips from edit distance 1 and the skeleton) and the word list itself.
- **Known gap:** until the word list ships, a typo in the third letter reaches fewer words in 3-letter mode, because "did you mean" looks for a close word only in the typed word's own file and a 3-letter file holds fewer words (হজজ no longer suggests হজ্জ, ঈমন no longer ঈমান, নাযায no longer নামায; pinned in `searchIndex.golden.test.js`). The `substring3` files do not change this: it comes from `tags3/`; `?idx=2` removes the gap.
- **Update, the cap in 2-letter mode:** the 2-letter `public/json/substring/` lists were reordered in place by hadis count (the most first, a tie by code point order, the same as `substring3`) by `scripts/sort-substring-2.mjs`; the contents are identical (the word set of every key checked against `git show HEAD:...`, 8,990,271 bytes as before), so the cap now works in both modes and is no longer ignored with `?sub=2`. The four modes to compare are `?idx=2&sub=2&cap=0`, `?idx=2&sub=2&cap=50`, `?idx=3&sub=3&cap=0` and `?idx=3&sub=3&cap=50`. On the 20 common words, `?idx=2&sub=2&cap=50` opens 269 tags files (uncapped 2-letter: 2,068, p99 490 to 32) and keeps 98.2% of the hadis. With the cap off nothing changed. Numbers in `docs/redesign-plan.md`.
