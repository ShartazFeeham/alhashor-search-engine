# Judge 2 (pragmatic tech lead): what a small team should build

Scope: subsequence mapping (A) versus B, B-full, C, D, E. Sharding of `tags/` and `substring/` by 3 letters is taken as decided; I only say where it interacts.
I read the lead's note, the three advisors, TODO.md, `src/search/searchIndex.js`, `searchWorkerCore.js`, `didYouMean.js`, `DidYouMean.jsx`, `searchSynonyms.js`, and the redesign plan sections 6, 10 and the search-upgrades result. I touched nothing in the project. My own scripts and outputs are in `decision/j2/` (`lib.mjs`, `t2` to `t8`, `run-today.mjs`, `today.out`).

## 0. What I verified myself (the facts the decision rests on)

1. **I ran today's real `searchIndex.js`** (bundled with esbuild into the scratchpad, reading the real `public/json` files) on 20 queries. Output: `j2/today.out`. Every "fails today" claim in section 4 is measured, not assumed.
2. **The visitors' biggest loss is not typos. It is hidden spelling families.** Today the hand-made `SYNONYM_GROUPS` (already containing সওয়াব/সাওয়াব, তওবা/তাওবা, দুআ/দোয়া, রমজান/রমযান, কুরবানি/কুরবানী) are used only as "did you mean" chips, and only when the search found fewer than 3 hadis. Measured on the real data:
   - `সওয়াব` returns 293 hadis, 165 more are filed under `সাওয়াব` (e.g. MUS-6590). No chip appears.
   - `তওবা` 134 results, 134 more hadis under `তাওবা`. `দুআ` 260 results, 237 more under `দোয়া`. `রমজান` 6 results, 218 more under `রমযান`.
   - `রাসুলুল্লাহ ফিতরা`: TIR-674 (has রাসূলুল্লাহ and ফিতরা) is at rank 7,559 of 7,687.
   So the cheapest and largest win needs no new index at all.
3. **Inflection, typed longer than stored:** `ইতিকাফের` returns 13 hadis, the family (`ইতিকাফ`) has 58+; the advisor 3 numbers (median family 5.4x larger) are consistent with what I saw (`মিসওয়াকের` 11 vs 81, `যাকাতের` 70 vs 381).
4. **First-two-letters typos are real and today's chips are wrong or absent:** `সলাত` gives chips সলা, সলতা, সলাম (all noise, 1 to 2 hadis) and not সালাত (4,175). `গসল` and `তকওয়া` give nothing. A 5-minute prototype of "fold, drop vowels, group by consonants, rank by hadis count" (`j2/t8.mjs`) puts গোসল first for `গসল`, সালাত first for `সলাত`, তাকওয়া second for `তকওয়া`. It also shows the danger: `কুরবানি` as a skeleton ranks করবেন (958) above কুরবানী (290), so the skeleton must be the last tier, behind fold and edit-1, and only ever as chips.
5. **The static subsequence index cannot serve a typo** (advisor 1 and 3, and the lead agree; I re-checked: every `substring/` key is itself a vocabulary word). I accept this without redoing it.

## 1. Options: value, risk, maintenance, cost of being wrong

| Option | Real visitor failures it fixes | Delivery risk | Ongoing maintenance | If wrong: can we switch it off? |
|---|---|---|---|---|
| **A** static subsequence index (+3.6k to 4.4k files, 0.4 to 0.9 MB gz) | Only an omitted letter in a word that is already a key. 0% of typos that are not words (adv. 1: 0% at all ranks on 4,925 queries; 4% when corrupted queries that happen to be words are allowed). Fixes none of: inflection, book spelling variants, Avro misses, wrong letters. Adds noise: সুদ to সুন্দর (152 hadis), কবর to কবীরা, সবর to সবার | Medium: new generator (none exists for `tags/` or `substring/` today), undecided "gap" definition and score formula move size 2x (adv. 2) | High: thresholds (tiers, 0.4 cut, weights) to tune with no analytics to tune against | Easy to ignore at runtime, but the files stay in every deploy (and every deploy that uploads them costs credits). **Reject.** |
| **B** fold + endings at lookup time | Spelling variants between books (রাসূলুল্লাহ/রাসুলুল্লাহ, ী/ি, ূ/ু, ণ/ন), inflected forms typed longer than indexed (ইতিকাফের), the "Typing either spelling returns half the family" problem. Not: wrong sibilant, wrong aspirate, Avro | Medium. The mechanics are small, the risk is over-folding and result ranking/highlighting (matchPattern must learn the fold or results look arbitrary) | Low: a fold table and an ending list in code, unit-tested; no generator if built from the word list in memory | Yes: one flag, no data to delete. **Build, in stages.** |
| **B-full** folded variant index on disk (+17k files, 6.6 MB gz, 26.7 MB raw, 530 MB generator memory) | Same as B | High: second copy of the index, new generator | High | Files stay in deploys. The same grouping is free in memory (adv. 2 B-lite). **Reject.** |
| **C** one word list (about 100 KB gz for words with at least 2 hadis, Bengali script; 240 KB gz for all), scanned in memory: edit-distance 1 by linear scan (1 to 4 ms in Node, 5x on a phone), consonant skeleton computed at load, fold groups computed at load | Dropped, extra, swapped letters; first-two-letters typos (advisor 3: 15% to 57% of errors sit in the first two letters, unreachable by any prefix-bound method); Avro misses (26 of 38 versus 1 for subsequence, optimistic because tuned on the same 38); autocomplete later; removes today's heavy suggest path (up to 7 files, about 1.4 MB gz) because hit counts come from the list | Low to medium: one new fetch (100 to 240 KB gz, once, cached 24 h, only fetched when needed or at idle), 5 to 8 MB of worker memory (adv. 2 estimate), phone parse about 100 ms (estimate) | Low: one generator of about 20 lines, deterministic. It also needs an honest answer to "who rebuilds `tags/`" (see section 6) | Yes: flag off means today's suggest path. **Build.** |
| **C-delete-index** (precomputed or built-at-load delete neighbourhoods, C2) | Same as C, faster | Higher: 2.8 to 8 MB gz precomputed, or 15 to 49 MB heap at load | Higher | n/a. A linear scan is fast enough at 77k words (1.0 ms p50, 4.2 ms p99 in Node). **Reject** |
| **D** runtime subsequence scan as last resort | Two or more omitted letters (adv. 1: drop2 +50 points, skeleton typing +57, but only +2 points overall as last-resort and +8 as an always-appended tier; synthetic mix). Advisor 3 found no case it adds beyond skeleton + edit-1 | Low code, but noise (aksara breaks in 50.6% of code-point matches) and one more tier to explain | Low-medium | Yes, but I would not ship it. **Cut now, revisit only if the test set collects real failures that skeleton + edit-1 miss.** |
| **E** nothing | Nothing; keeps the hidden families, the first-two-letters failure and the heavy suggest path | None | None | n/a. Not acceptable: the cheapest fix (section 0, item 2) costs hours |

## 2. What the visitor sees in each case

Principle (advisor 3's, which I adopt): a spelling or ending variant that is the same word is expanded silently but visibly labelled and escapable; a typo or Roman guess is a chip, never silent; subsequence is never shown at all. At most 3 chips ever.

| Situation | What appears | What must NOT happen |
|---|---|---|
| Typed word has results and a spelling group or fold/ending family adds more (সওয়াব, দুআ, রমজান, কুরবানি, তারাবিহ, ইতিকাফের) | Same result list with the typed spelling's hadis first, the family after (rank by: typed word itself, then variants/stems, then longer words that merely contain it). One muted line under the count: "নামাজ, নামায বানানসহ দেখানো হচ্ছে · শুধু এই বানানে" (link adds `&exact=1`). Variants highlighted in snippets and cards. Line only when a variant adds at least 10% or holds at least 30 hadis | No silent change of the count with no label; no variant hadis ranked above the typed spelling's own; no match without highlight |
| Typed word has 0 or very few hits (first-two-letters typo, Avro) | "আপনি কি বোঝাতে চেয়েছেন:" chips, at most 3, each with its hadis count (the count is the trust cue), from: synonyms, confusion swaps, edit-1 over the list, skeleton last, ranked by hadis count. Shown in the existing `DidYouMean` component, no new UI | No skeleton chip ahead of an edit-1 or fold hit (my prototype shows কুরবানি becomes করবেন otherwise); no more than 3 chips |
| Typed word has plenty of results, no variant | Nothing new | Nothing |
| Multi-word query where one word matches nothing | TODO 1: list the hadis that match the other words, the missing word marked; run the typo suggestion for the missing word first, so a typo is not shown as "absent word" | Treating a typo as an absent word |
| Over-folding guards | Never folded or expanded silently: words of 3 or fewer code points (so কোন/কোণ, দিন/দীন, আসা/আশা, সুদ/সুন্দর, কবর/কবীরা stay apart), শ/ষ/স, জ/য, aspirates, ছ/স, ড়/র, ট/ত, ো/ু, dropping া, verb endings, খানা, any subsequence match | Any of the five guard queries in section 4 (15 to 19) returning the confusable word's hadis silently |

## 3. Who is right

**Lead.** Right on the conclusion (no subsequence index) and on "subsequence is aimed at the wrong failure". Right that folding is the correct tool for substitutions. Wrong or outdated on three details: (1) the 26 MB size estimate; measured tiered A is 0.4 to 0.9 MB gz, so size is not why to reject it, the 0% on typos is. (2) "A small prefix-agnostic suggestion list with a delete-neighbourhood": advisor 2 shows a plain list and a linear scan is enough; do not precompute the neighbourhood. (3) Step 2 as "folded variant index": that is B-full, 17k files, not needed. Keep the lead's step 4 (subsequence last) as "cut".

**Advisor 1.** Right that a static subsequence index scores 0%, that edit-1 plus fold/endings plus the shipped confusion table carry most of the value, and that corrections must be shown before substring-style results when the search is weak. Overreach: (1) "replace `substring/` by a query-time scan of the vocabulary file" changes the core retrieval path for every search; E-scan also changes semantics (any fragment, not only keys) and the gain was not measured on hadis returned. Park it as a later experiment after the sharding and cap work. (2) The simulation's corruption mix is synthetic and its own author says pooled numbers overweight confusions and drops; use the per-type numbers, as I did. (3) Appending subsequence (+8 points) is driven by drop2/skeleton typing, whose real frequency nobody knows.

**Advisor 2.** Right on almost everything operational: one word list, linear scan, no delete index, B-lite not B-full, and above all that request count rather than bandwidth drives Netlify credits, so 3-letter shards raise the tail (কে: 468 to 1,317 files) and a cap on the substring expansion (top 50 containing words by hadis count: p99 files 675 to 38, 1% fewer hadis found) is the biggest delivery lever. Two corrections: (1) its D recommendation is not needed (see table); (2) the cap's effect on ranking was not evaluated by the advisor, so it needs the relevance set before it is on by default. Also its "word list can replace 6,123 substring files" is an option for later, not now.

**Advisor 3.** Right on silent versus suggest tiers, the 4-code-point rules (fold only words of at least 4 code points, strip endings only when the stem is at least 4 and is a vocabulary word), the three-chip ceiling and the labelled expansion. Corrections: (1) its separate global fold map (374 KB raw) and separate skeleton map (75 KB gz) are two extra files; both can be derived from the one word list at load, so ship one file. (2) Its Roman-typing numbers rest on its own 60 annotations and a skeleton tuned on the same 38 failures; treat 26 of 38 as optimistic. (3) Its ending list contains bare র, ে, ও, ই. With the stem rule that is defensible, but I would ship the short list first (ের, কে, দের, তে, টি, গুলো, ে, ও) and add the rest only if a relevance case needs it.

**Net:** all three advisors and the lead agree on rejecting A. The real disagreement is scope. I resolve it by taking the most conservative version of each recommendation and ordering by visitor value per day of work.

## 4. The first 20 relevance cases (tags verified in the real texts)

How verified: for every expected tag I read `public/json/hadis/<book>/<number>/text.txt` and confirmed it contains the intended word (NFC-normalised); I confirmed against `tags/` that the tag is listed under that word; and I ran the real `searchIndex.js` (`j2/run-today.mjs`, output `j2/today.out`) to get today's behaviour. Tag format is as in the index (BUK, MUS, DAU, TIR, NAS, MAJ).

Case kinds: **R** expected tag must be somewhere in the result list (typed spelling's own hadis still first); **S** an expected chip must appear among the first 3 chips, and the expected tag must be in the results after taking it; **G** guard, the tag must NOT be in the result list; **M** multi-word.

| # | Typed query | Expected hadis (verified text) | Today (measured) | Fixed by stage |
|---|---|---|---|---|
| 1 | সওয়াব | MUS-6590 ("দশগুন সাওয়াব অথবা আমি আরও বাড়িয়ে দেব") R | 293 results, tag absent, no chip | 1 |
| 2 | তওবা | MAJ-1393 ("আল্লাহ যখন তার তাওবা কবূল করেন") R | 134 results, absent | 1 |
| 3 | দুআ | NAS-2461 ("তিনি দোয়া করলেন, হে আল্লাহ!") R | 260 results, absent | 1 |
| 4 | রমজান | MAJ-1683 ("রমযান মাসে চুমা দিতেন") R | 6 results, absent, no chip | 1 |
| 5 | কুরবানি | DAU-2796 ("কুরবানী করতে নিষেধ করছেন") R | 11 results, absent, no chip | 1 |
| 6 | তারাবিহ | DAU-1371 ("তারাবীহ নামায আদায় করে") R | 0 results; chip তারাবীহ(5) after a click only | 2 (silent, not a chip) |
| 7 | রাসুলুল্লাহ ফিতরা | TIR-674 ("(যাকাত-ফিতরা) আদায় করে দিতে", has রাসূলুল্লাহ in tags) R, rank at most 28 (28 = hadis matching both words after folding) | 7,687 results, rank 7,559 | 2 |
| 8 | ইতিকাফের | MUS-2653 ("রমযান মাসের শেষ দশক ইতিকাফ করতেন") R | 13 results, absent | 2 |
| 9 | মিসওয়াকের | NAS-5040 ("মিসওয়াক করা, মোচ কাটা, নখ কাটা") R | 11 results, absent | 2 |
| 10 | যাকাতের | MAJ-1813 ("ঘোড়া ও গোলামের যাকাত থেকে") R | 70 results, absent | 2 |
| 11 | গসল | chip গোসল (617 hadis); MAJ-588 ("একবার গোসল করতেন") S | 0 results, no chip | 3 |
| 12 | সলাত | chip সালাত (4,175), first or second; MAJ-950 ("নারী, কুকুর ও গাধা সালাত নষ্ট করে") S | 0 results, 3 noise chips (সলা, সলতা, সলাম) | 3 |
| 13 | মুস্লিম | chip মুসলিম (956); DAU-4453 ("মুসলিম ইবন ইবরাহীম") S, regression: works today | chip মুসলিম(956) already | keep passing |
| 14 | তকওয়া | chip তাকওয়া within first 3; BUK-1687 ("যে তাকওয়া অবলম্বন করে") S | 0 results, no chip | 3 |
| 15 | কোন | G: BUK-406 (has কোণ only: "চাঁদরের কোণ ধরে") must not appear | absent, passes | guard forever |
| 16 | দিন | G: NAS-4063 (দীন only: "তার দীন পরিবর্তন করে") | absent, passes | guard forever |
| 17 | আসা | G: MAJ-1738 (আশা only: "মাফের আশা রাখি") | absent, passes | guard forever |
| 18 | সুদ | G: NAS-1018 (সুন্দর only: "সুন্দর সূরে কুরআন পাঠ") | absent, passes | guard forever |
| 19 | কবর | G: MAJ-4310 (কবীরা only: "কবীরা গুনাহগারদের জন্যই") | absent, passes | guard forever |
| 20 | যাকাত ফিতরা ক্রিপ্টো | M: TIR-674 and DAU-1622 in the first 2 results, and ক্রিপ্টো marked as missing (TODO 1) | TIR-674 rank 2; no marking of the missing word | 0 (UI part of TODO 1) |

Verification detail for the tags: for every case the expected tag's text was read and contains the intended word (see `j2/t3.mjs`, `t4.mjs`, `t6.mjs`, `t7.mjs`; all 20 cases, including the 5 guards, whose texts contain only the confusable word). TIR-674's text contains "ফিতরা" and the tags list it under রাসূলুল্লাহ and not under any রাসুলুল্লাহ form; DAU-1622 and TIR-674 are the only two hadis with both যাকাত and ফিতরা. "Today" always comes from running the real code, not from my own simulation (they differ slightly: e.g. case 6 returns 0 results in the real code).

Limits of the set: all 20 are my own constructions from corpus data, not from visitors. They are a regression net, not a measure of how common these failures are. Add the owner's and friends' failed searches as they turn up (the only real feedback, because there is no analytics by design).

### Measurable acceptance per stage

- Stage 0: the 20 cases run against the real files in under 30 s as one test file; baseline recorded: 13 of the 20 cases fail today (1 to 12 and 14), 7 pass (guards 15 to 19, regression case 13, case 20's ranking part).
- After Stage 1: cases 1 to 5 pass; no guard fails.
- After Stage 2: cases 1 to 10 pass (10 of 10); guards 15 to 19 pass (5 of 5); case 7 rank at most 28; the "typed spelling first" ordering test passes (for 2, 3, 8: the typed spelling's own hadis fill the first positions).
- After Stage 3: 20 of 20; cases 11, 12, 14 chip within first 3 and at most 3 chips ever; no case makes a first search download more than 250 KB gz extra, or more than 1 extra data file (today's suggest path can open up to 7 files, about 1.4 MB gz).
- Cost budget guard (also from Stage 0): for 10 fixed common-word queries, files fetched and bytes recorded; from Stage 4 onward p99 files at most 100.

## 5. Staged plan

Order is by visitor value per day of work, with each stage shippable alone and off by a flag.

**Stage 0 (1 to 1.5 days): the net.** 
- `src/search/relevance.cases.js` (the 20 cases) and `relevance.test.js`, which builds `createSearchIndex(load)` with a loader that reads `public/json` from disk (the index already takes `load` as a parameter, so no refactor), runs every case, prints a pass/fail table and the cost budget (files, KB). Fits the existing vitest setup (other tests already read real texts).
- TODO 1 (fallback with missing words marked) belongs here: it is independent of the index and makes every later "no results" case honest.
- Definition of done: test file green against today's code with the recorded baseline above; the table is printed on every run.

**Stage 1 (0.5 to 1 day): silent spelling groups, zero new files.**
- Split `SYNONYM_GROUPS` into `spellings` (same word written differently: সওয়াব/সাওয়াব/ছওয়াব, তওবা/তাওবা, দুআ/দোয়া/দুয়া, রমজান/রমযান/রমাদান, কুরবানি/কুরবানী/কোরবানী, রাসূল/রসূল/রাসুল, শহীদ/শহিদ, কুরআন/কোরআন, ঈমান/ইমান, ...) and `synonyms` (different words with one meaning: নামায/সালাত, রোযা/সিয়াম, জান্নাত/বেহেশত, জাহান্নাম/দোযখ), which stay chip-only. This split is an owner decision (about an hour of review of 22 groups; it is domain knowledge, not code).
- `spellings` expand silently in `searchTags`; ranking gets three levels (typed word 2, variant 1, longer containing word 0, summed per word); `matchPattern.js` highlights variants; the muted "বানানসহ" line with `&exact=1` is added.
- Done when: cases 1 to 5 pass, guards still pass, the 20-case table has no regression, flag `variants` off restores the baseline exactly.

**Stage 2 (3 to 4 days): word list, fold and endings at lookup.**
- `scripts/build-wordlist.mjs` (20 lines, deterministic, reads `tags/`, sorts, front-codes; Bengali script only, hadis count at least 2 to start: about 100 KB gz, 36k words; use all words, 240 KB gz, only if a failing case needs a one-hadis word) writing `public/json/words.txt`; a test that the file matches `tags/` (counts), so it cannot rot silently.
- The worker fetches the list after the first search is shown (idle, cached 24 h); before it arrives behavior equals today's. Fold groups and stem lookup are built from the list at load (about 90 ms in Node, estimate 0.4 s on a phone, once per session).
- Rules at launch (words of at least 4 code points only): ী→ি, ূ→ু, ঈ→ই, ঊ→উ, ণ→ন; endings ের, কে, দের, তে, টি, গুলো, ে, ও only when the remaining stem is at least 4 code points and is itself in the list. Hasanta, ঁ, ঙ/ং, ৎ and the trailing-ঃ rules wait (advisor 3 rules 3 to 8: smaller groups, add one at a time only against a failing case).
- Done when: cases 1 to 10 pass, guards pass, ordering test passes, every result that arrived through fold or ending is highlighted and the note line shows, flags `fold` and `endings` off restore Stage 1 behavior exactly.

**Stage 3 (2 to 3 days): suggestions from the list (TODO 5 and the core of TODO 6's data).**
- Replace `vocabularyOf`/`checkCandidates` downloads with the list: hit counts come from the list's count column, so no data file opens until a chip is clicked (removes up to 7 files, about 1.4 MB gz, from today's suggest).
- Tiers in order: synonyms, confusion swaps (existing table), edit-1 by linear scan of the list ranked by hadis count, consonant skeleton last and only if the typed word has at least 3 consonants. At most 3 chips. A chip must clear the existing "at least 2x hits plus 1" rule.
- Done when: cases 11, 12, 14 pass, 13 still passes, no skeleton chip precedes a fold or edit-1 chip, first-weak-search download at most 250 KB gz and 1 extra file; flag `listSuggest` off restores today's suggest.

**Stage 4 (1 to 2 days, can run in parallel with 2 and 3): sharding default and the request cap.**
- Keep the 3-letter files built and deployed, but leave the default width at what is live today until the cap exists (see section 6), then flip the default.
- Cap the substring expansion at the top 50 containing words by hadis count (counts come from the list). Ship it only if the relevance table and the budget table do not regress (no case loses its expected tag); otherwise cap at 100.
- Done when: p99 files per search at most 100 for the 10 common-word budget queries (advisor 2 measured 1,127 uncapped for three common words); credits per 1,000 one-word searches measured by the model, not by Netlify, are no worse than today's 6.1.

**Cut:** subsequence in any form (A, D); B-full; precomputed or built-at-load delete neighbourhoods and edit-distance 2 (C2); separate fold-map and skeleton files; fold rules 3 to 8 until a case needs them; endings র/ি/ী/া/ন/ল/ত/হ and every verb ending; replacing `substring/` with a runtime scan (revisit after Stage 4); autocomplete (TODO 6) after Stage 3 if wanted, it is a few hours on top of the list; better snippets (TODO 7) and prefetch (TODO 8) are unrelated to this decision and stay in the backlog.

Total honest estimate: 9 to 13 working days for a person who knows the code; Stages 0 and 1 (about 2 days) already fix 5 of the failures I could verify, and nothing in them needs a deploy decision beyond a normal one.

## 6. Where sharding interacts, and what is still unmanaged

- **3-letter sharding without a cap makes the tail worse** (advisor 2: "কে" 468 to 1,317 files, three common words up to about 700 requests, and requests are what cost credits: 2 per 10,000 including CDN hits, 15 per deploy, and an exhausted plan pauses every site on the account per the redesign plan). Bytes fall, requests rise. So the 3-letter files may ship in the repo now, but the default flips only with the cap in Stage 4.
- **Keeping the 2-letter files next to the 3-letter ones is real weight:** about 18,587 files and 60 MB raw / 14.5 MB gz in the deploy (advisor 2), versus 2,809 files today, and the first deploy after the reshard uploads about 13,000 new files. I accept it as a rollback, but I would put a sunset on it: delete the 2-letter files one release after the 3-letter default has been live and the 20 cases and the budget table are green; git history is the longer-term rollback.
- **No script generates `tags/` or `substring/`** (TODO.md says so; advisor 2 reproduced 93.6% of `tags/` entries from the texts with a tokenizer, not 100%). Every new artefact I propose reads `tags/` as its source of truth, so adding a hadis still needs the unknown earlier tool. Recommended as a separate small task, not part of this decision: `scripts/build-search-index.mjs` producing tags, substring and the word list in one run, with a fixture test. Until then the word list test in Stage 2 catches drift.
- **There is no analytics by design**, so a bad ranking change cannot be detected in production. This is the main reason for conservative defaults, a flag per stage, the `&exact=1` escape hatch visible to visitors, and the relevance set as a release gate.

## 7. How many switches, and where

Keep **six knobs in total, in one file** `src/search/searchConfig.js` (a frozen object, read by `searchIndex.js`; `createSearchIndex(load, config = defaults)` takes it as a second argument so tests and the relevance run can try every combination; the worker imports the same module so nothing needs to be sent to it).

| Knob | Kind | Values | Why it exists |
|---|---|---|---|
| `tagsPrefixLength` | data layout constant | 2 or 3 | Must match the files deployed; per build, not per visitor |
| `substringPrefixLength` | data layout constant | 2 or 3 | Advisor 2 found 2-letter substring with 3-letter tags costs +7 KB per search and saves 4,959 files, so keep the two independent |
| `variants` | feature flag | on/off | Stage 1 rollback |
| `fold` | feature flag | on/off | Stage 2 rollback |
| `endings` | feature flag | on/off | Stage 2 rollback; riskier than fold, so separate |
| `listSuggest` | feature flag | on/off | Stage 3 rollback to today's suggest |

- Defaults live in the file; the two layout constants can be overridden at build time with env variables (`NEXT_PUBLIC_...`, the same pattern as `BASE_PATH`). Flags are plain constants: flipping one is a one-line change plus a deploy (15 credits), which is fine because the plan says deploys are deliberate anyway.
- **Not** a URL parameter for algorithm choice. The address is the shareable source of truth (`q`, `book`, `near`, `page`); algorithm switches in it would leak into shared links and bookmarks and fork the results two people see. The one URL parameter I add is a product feature, not a toggle: `&exact=1` ("শুধু এই বানানে"), which gives visitors a way out of any expansion and doubles as a manual QA check.
- **Not** in the visitor Settings page. Settings are reading preferences (theme, size, digits); a "smart search" switch there would be unanswerable by the visitor (they cannot tell if it is better) and cannot be evaluated without analytics.
- No flag for the cap, the chip limit, the stem length or the thresholds: they are named constants in the same file, covered by tests, not switches. Remove each flag one release after its stage has been default-on with the relevance table green; the file should shrink back to the two layout constants.

## 8. Risks I would watch

1. Highlighting and counts: results that arrive through fold/endings must be highlighted and labelled or they will look like bugs (`matchPattern.js` is a Stage 1 and 2 deliverable, not a polish item).
2. Phone cost of the list (parse 100 to 240 KB, 5 to 8 MB memory) is estimated, not measured; measure once on a real mid-range phone before Stage 3 is default-on.
3. The skeleton is tuned on 38 words; I would take it out again at the first chip that looks absurd in the owner's own testing.
4. "At least 2 hadis" list threshold drops one-hadis words (44% of Bengali words occur in one hadis); the cases will show if that matters.
5. Real-world frequency of every failure is unknown. The order of stages is by value I could demonstrate on real data (hidden spelling families and inflected forms are measurable on the corpus; typo rates are not).

## VERDICT

Do not build a subsequence mapping in any form: a precomputed one cannot answer a typo (every key is already a vocabulary word), a runtime one adds almost nothing beyond fold, edit distance 1 and a consonant skeleton, and both add noise (সুদ to সুন্দর). Instead, build in this order, each stage behind its own flag and judged by a 20-case relevance test that runs against the real data: (0) the test set plus the missing-word fallback; (1) silently expand the spelling groups that already exist in `searchSynonyms.js` (সওয়াব, তওবা, দুআ, রমজান, কুরবানি hide 165 to 237 hadis each today, with no new file); (2) one word list of about 100 KB gz, from which fold (ী/ি, ূ/ু, ণ/ন, words of 4+ letters) and common noun endings are applied at lookup, with the typed spelling ranked first, labelled and escapable with `&exact=1`; (3) replace the heavy suggest path with chips (at most 3) from edit distance 1 and a last-place consonant skeleton over the same list, which also fixes first-two-letters typos; (4) flip to 3-letter shards only together with a cap of about 50 containing words per substring expansion. Cut B-full, delete indexes, edit distance 2, subsequence, runtime substring replacement, and the extra fold rules. Keep six knobs in one `searchConfig.js` (two layout constants, four feature flags), no URL parameter for algorithm choice and nothing in Settings, and sunset the 2-letter files after one green release.
