# Advisor 1 (search relevance / IR): does subsequence matching earn its cost?

Everything below comes from a simulation I ran on the real vocabulary. Scripts and raw outputs are in `decision/a1/` (`sim.js`, `size.js`, `timing.js`, `results-*.json`, `tables-*.md`). I did not touch the project.

## 1. Bottom line

1. **A static subsequence index (the proposal as written, key -> words) does not work for the queries it is meant to rescue.** Every key in `substring/` is itself a vocabulary word (21,597 of 21,597 keys, checked). A typo such as `মুসলম` is not a vocabulary word, so it has no key and the lookup returns nothing. Measured: **0% recall at every rank on all 4,925 typo queries** that are not themselves words. When I let the corruption land on existing words too, the static index reaches 4% of queries at rank 20. The same limitation already applies to the shipped `substring/` index: `E-real` also scores 0%.
2. **Subsequence only helps as a query-time scan over an in-memory vocabulary.** There it recovers dropped letters well (drop 1 letter: 95% at rank 20, 70% at rank 1) and stems. It does nothing for wrong letters, swaps, inserted letters or added endings (0% to 5%).
3. **Almost all of that is already covered more cheaply.** Edit-distance-1 (C1) gets drop1 97% at rank 20, and it also covers swaps (92%) and inserts (97%). Fold + ending stripping (B) is the only approach that fixes inflection (98%). The shipped did-you-mean (DYM) already fixes confusable letters at 99 to 100%.
4. **Subsequence's one unique win is two or more missing letters** (drop2, and typing a consonant skeleton like `মসলম`): +50 to +57 points at rank 20 over everything else. Everything else gets about +2 points from it. Whether that is worth a tier depends on how common multi-letter omissions are in real queries, which I cannot measure from this data.
5. **Recommendation:** don't ship any new static index folder. Ship **one vocabulary file** (word + hadis count: 1,752 KB raw, **351 KB gzip / 349 KB brotli**) loaded lazily when a search is weak, and do E, B, C1 (and optionally A) live. Details in section 6.

## 2. Method

* **Vocabulary:** all `tags/*.json` words, NFC-normalised, ZWJ/ZWNJ removed, merged across raw spellings: 77,393 distinct words (80,587 raw). Hadis count per word = number of distinct hadis tags.
* **Intended words:** 600 Bengali words of 4 to 10 characters. The "w" sample is drawn with probability proportional to hadis count (so queries look like real ones). The "u" sample is uniform over the vocabulary (the rare-word tail, a robustness check). Seeded RNG.
* **Corruptions** (each applied to every sampled word where it applies; up to 30 tries):
  `drop1` one letter removed; `drop2` two letters removed; `skel` all vowel signs removed (words with at least 2 signs); `conf-vowel` ি/ী, ু/ূ, ই/ঈ, উ/ঊ, ো/ু, ো/ও, ও/উ; `conf-cons` শ/ষ/স, স/ছ, ন/ণ, জ/য, য়/য, ত/ট, থ/ঠ, দ/ড, ধ/ঢ, র/ড়; `conf2` two confusions at once; `swap` two adjacent letters; `insert` one extra letter (half duplicate, half random common letter); `inflect` word + one of ের, কে, ে, ও, েরা, গুলো; `stem` the reverse: take an inflected vocabulary word (intended = that word) and query it minus the ending.
  Corruptions that produced invalid Bengali (orphan vowel sign etc.) were rejected.
* **Out-of-vocabulary (OOV) rule:** the main tables use only queries that are not themselves vocabulary words (the "search finds no such word" case). The vocabulary is noisy (it contains many variant spellings), so many corruptions land on an existing word: in the w sample 67% of drop1, 85% of conf-vowel, 49% of conf-cons and 39% of inflect corruptions were already words. I also ran a "keep" variant that includes those (tables in section 8); conclusions are the same.
* **Metric:** rank of the intended word in the approach's candidate list: recall@1, @5, @20, average list length, and "absent" = intended word not in the list at all. "kB tag files @20" = average size of the `tags/<prefix>.json` files that must be fetched to get hadis for the top 20 candidates (a real download cost that the candidate-count column hides).
* **Approaches, as implemented**
  * `E-real`: shipped substring index (query must be a key). `E-scan`: the same semantics evaluated at query time over the whole vocabulary (ranked exact, prefix, then count).
  * `DYM`: port of `src/lib/didYouMean.js` (confusion variants, at most 60, then one-edit words from the query's first-two-character data files; synonyms omitted; `top3` is what ships).
  * `A`: subsequence tiers as specified: all substring matches, then subsequence with <= 1 gap (top 20), then <= 2 gaps (top 10), score = 0.35 contiguity + 0.20 gap penalty + 0.20 anchor/prefix + 0.15 log frequency + 0.10 length fit, drop < 0.4. "Gap" = skipped characters in the tightest alignment (`A-chars`); I also ran gap = number of breaks (`A-breaks`): same results within 1 point. `A-chars(same-files)` restricts the scan to the query's first-two-character files (what a lazy per-prefix design would see). `A-static` = the key -> words index design (key must be a vocabulary word).
  * `D`: only the non-substring subsequence tiers (suggestion-only). In combos it fires only when everything before it returned nothing.
  * `B-fold`: fold ি/ী, ু/ূ, ই/ঈ, উ/ঊ, শ/ষ/স, ন/ণ, জ/য/য়. `B-end`: strip endings গুলো, েরা, ের, কে, ে, ও (up to 2 passes). `B-fold+end`: both. `B-wide`: aggressive fold (all `CONFUSED_PAIRS` classes, including ত/ট, ো/ু/ও/উ) plus wider ending list (adds গুলি, দের, র, রা, টি). The candidate list is the vocabulary group sharing the same key, ranked by edit distance then count.
  * `C1`/`C2`: all vocabulary words within Damerau (adjacent-swap) edit distance 1 / 2, found through a real delete-neighbourhood index, ranked by distance then count. `C2-weighted` ranks by a cost where a confusable substitution costs 0.5.
  * Combos concatenate lists in the stated order (deduplicated), E results first.
* **Not modelled:** the "fewer than 3 hadis" trigger that decides when suggestions are shown, the `MAX_EXTRA_FILES` download cap, and synonyms. Corruption mix is my own; real query logs would change the weighting, not the per-type numbers.

Sample sizes (w): drop1 558, drop2 433, skel 282, conf-vowel 303, conf-cons 544, conf2 501, swap 512, insert 599, inflect 593, stem 600 (4,925 total).

## 3. Results (w sample, OOV queries): recall of the intended word, per corruption type

Single approaches, recall@20 (rank limit in the list the approach produces itself; "absent" below shows how often the word is not there at all):

| approach (R@20) | drop1 | drop2 | skel | conf-vowel | conf-cons | conf2 | swap | insert | inflect | stem | ALL | avg cands |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| E-real (shipped substring) | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0.0 |
| E-scan (substring at query time) | 26% | 20% | 0% | 0% | 2% | 0% | 0% | 0% | 0% | 100% | 17% | 5.1 |
| DYM shipped (top 3) | 49% | 0% | 0% | 100% | 100% | 100% | 50% | 74% | 29% | 69% | 59% | 1.5 |
| **A subsequence (full vocab, live)** | 95% | 76% | 60% | 0% | 5% | 0% | 0% | 0% | 0% | 100% | 34% | 8.3 |
| A subsequence (same first-two files only) | 54% | 36% | 24% | 0% | 5% | 0% | 0% | 0% | 0% | 99% | 23% | 2.7 |
| **A as a static key index** | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0.0 |
| D (subsequence tiers 2+3 only) | 73% | 64% | 62% | 0% | 4% | 0% | 0% | 0% | 0% | 0% | 18% | 3.2 |
| B-fold (letters only) | 0% | 0% | 0% | 68% | 36% | 28% | 0% | 0% | 0% | 0% | 11% | 0.2 |
| B-end (endings only) | 3% | 1% | 0% | 0% | 0% | 0% | 0% | 2% | 98% | 72% | 21% | 0.5 |
| **B-fold+end** | 3% | 1% | 0% | 68% | 36% | 28% | 1% | 2% | 98% | 72% | 32% | 1.0 |
| B-wide (aggressive fold, more endings) | 7% | 1% | 0% | 100% | 100% | 100% | 4% | 6% | 93% | 60% | 48% | 2.8 |
| **C1 edit distance <= 1** | 97% | 0% | 0% | 100% | 71% | 0% | 92% | 97% | 30% | 78% | 59% | 3.7 |
| C2 edit distance <= 2 | 99% | 51% | 38% | 100% | 99% | 62% | 100% | 100% | 55% | 93% | 82% | 73.0 |
| C2 weighted ranking | 100% | 46% | 34% | 100% | 100% | 65% | 100% | 100% | 55% | 92% | 82% | 73.0 |

Same single approaches, recall@1 (how often the right word is the top suggestion):

| approach (R@1) | drop1 | drop2 | skel | conf-vowel | conf-cons | conf2 | swap | insert | inflect | stem | ALL |
|---|---|---|---|---|---|---|---|---|---|---|---|
| E-scan | 21% | 10% | 0% | 0% | 2% | 0% | 0% | 0% | 0% | 92% | 15% |
| DYM shipped (top 3) | 31% | 0% | 0% | 99% | 97% | 98% | 38% | 71% | 27% | 32% | 50% |
| A subsequence (full, live) | 70% | 33% | 25% | 0% | 5% | 0% | 0% | 0% | 0% | 95% | 24% |
| B-fold+end | 2% | 0% | 0% | 68% | 36% | 17% | 0% | 2% | 82% | 69% | 29% |
| B-wide | 4% | 0% | 0% | 94% | 97% | 69% | 3% | 6% | 74% | 55% | 41% |
| C1 | 56% | 0% | 0% | 84% | 62% | 0% | 77% | 94% | 28% | 31% | 45% |
| C2 | 56% | 6% | 4% | 84% | 80% | 26% | 79% | 97% | 39% | 32% | 52% |
| C2 weighted ranking | 54% | 5% | 4% | 100% | 100% | 46% | 81% | 96% | 38% | 28% | 57% |

What stands out:

* **A is a one-trick approach.** It can only find a word if every typed letter is in the word, in order. That makes it excellent when letters were dropped (drop1 95%, drop2 76%, skel 60%) and for stems, and structurally unable to repair a wrong letter, a swap, an insertion or an ending added to the query. Its rank-1 accuracy on drop1 (70%) beats C1 (56%), because the score (anchor, frequency, length fit) is a better ranker than edit distance, but it is the weaker candidate generator everywhere else.
* **Restricting the scan to the query's first two characters (lazy per-prefix loading) halves A's recall on drop1 (95% to 54%)**, because the dropped letter is often one of the first two, which decide the data file. Whole-vocabulary scanning is what makes A work.
* **The shipped DYM is already very good on confusable letters** (conf-vowel, conf-cons, conf2 at 100% at rank 20, 97 to 99% at rank 1) and weak on exactly what it was not designed for: drop (49%), swap (50%), insert (74%), inflection (29%), multi-drop (0%).
* **B (folding + ending stripping) is the only thing that fixes `inflect`** (98%) and it fixes `stem` (72%) at a list length of about 1 word. B-fold alone is subsumed by DYM's confusion variants. B-wide is the most compact way to cover confusions plus inflection (2.8 candidates, conf 100%, inflect 93%) but loses precision at rank 1 on swaps and drops (it is not a spelling-error model).
* **C2 buys recall with noise:** 73 candidates per query on average and 917 KB of tag files to fetch for the top 20, versus 3.7 candidates and 289 KB for C1. C1 plus B plus DYM reaches the same overall recall (85% vs 82%) with a list of 9 instead of 73.
* **Order matters for rank 1.** In combinations, putting E-scan results first costs rank-1 on confusions (99% to 89%): a vocabulary word that merely contains the typed letters outranks the real correction. A real implementation should show corrections first whenever the query matches fewer than ~3 hadis. The tables below use E first, so they understate rank-1 for that reason.

### 3b. Combinations (cumulative ladder), w sample

| stage | drop1 | drop2 | skel | conf-vowel | conf-cons | conf2 | swap | insert | inflect | stem | ALL |
|---|---|---|---|---|---|---|---|---|---|---|---|
| cur=Ereal+DYM3 @1 | 31% | 0% | 0% | 99% | 97% | 98% | 38% | 71% | 27% | 32% | 50% |
| Escan+DYM @1 | 42% | 10% | 0% | 89% | 93% | 96% | 36% | 68% | 24% | 92% | 57% |
| Escan+DYM+B @1 | 42% | 10% | 0% | 89% | 93% | 96% | 36% | 68% | 72% | 92% | 63% |
| Escan+DYM+B+C1 @1 | 50% | 10% | 0% | 89% | 93% | 96% | 66% | 90% | 72% | 92% | 70% |
| Escan+DYM+B+C1+D @1 | 51% | 21% | 11% | 89% | 93% | 96% | 66% | 90% | 72% | 92% | 71% |
| Escan+DYM+B+C1+A @1 | 51% | 21% | 11% | 89% | 93% | 96% | 66% | 90% | 72% | 92% | 71% |
| cur=Ereal+DYM3 @20 | 49% | 0% | 0% | 100% | 100% | 100% | 50% | 74% | 29% | 69% | 59% |
| Escan+DYM @20 | 65% | 20% | 0% | 99% | 100% | 100% | 50% | 74% | 29% | 100% | 66% |
| Escan+DYM+B @20 | 65% | 20% | 0% | 99% | 100% | 100% | 51% | 74% | 99% | 100% | 75% |
| Escan+DYM+B+C1 @20 | 92% | 20% | 0% | 99% | 100% | 100% | 92% | 97% | 99% | 100% | 85% |
| Escan+DYM+B+C1+D @20 | 92% | 32% | 13% | 99% | 100% | 100% | 92% | 97% | 99% | 100% | 87% |
| Escan+DYM+B+C1+A @20 | 94% | 70% | 57% | 99% | 100% | 100% | 92% | 97% | 99% | 100% | 93% |

Reading: `cur` = shipped state (E-real + DYM top 3). Each next row adds one stage: query-time substring, B fold+end, C1, then either D (subsequence only when everything before returned nothing) or A (subsequence tiers always appended last).

* B takes `inflect` from 29% to 99% at rank 20 (+9 points overall).
* C1 takes `drop1` 65% to 92%, `swap` 51% to 92%, `insert` 74% to 97% (+10 points overall).
* **D (last resort only) adds almost nothing (+2 points)**, because with E, DYM, B and C1 above it the list is rarely empty: they return something, just not the right word.
* **A always appended adds +8 points overall, all of it on `drop2` (+50) and `skel` (+57), +2 on drop1, 0 elsewhere.** Absent drops from 14% to 4%. It does not change rank-1 accuracy overall (70% to 71%) because appended candidates sit at the end of the list.
* On the uniform (rare-word) sample the picture is the same: ladder end points 83% (without A) to 92% (with A) at rank 20, 68% to 72% at rank 1.

### 3c. Pooled results, all four samples

(Pooling depends on my corruption mix; use the per-type tables for decisions.)


**Sample w** (all corruption types pooled, n=4925)

| approach | R@1 | R@5 | R@20 | absent | avg cands | kB tag files @20 |
|---|---|---|---|---|---|---|
| E-real | 0% | 0% | 0% | 100% | 0.0 | 0 |
| E-scan | 15% | 17% | 17% | 83% | 5.1 | 96 |
| DYM(shipped,top3) | 50% | 59% | 59% | 41% | 1.5 | 133 |
| A-chars(full) | 24% | 31% | 34% | 64% | 8.3 | 180 |
| A-chars(same-files) | 20% | 23% | 23% | 77% | 2.7 | 53 |
| A-static(index keys) | 0% | 0% | 0% | 100% | 0.0 | 0 |
| D(subseq last resort only) | 13% | 17% | 18% | 82% | 3.2 | 128 |
| B-fold+end | 29% | 32% | 32% | 68% | 1.0 | 63 |
| B-wide | 41% | 48% | 48% | 52% | 2.8 | 106 |
| C1 | 45% | 58% | 59% | 41% | 3.7 | 289 |
| C2 | 52% | 75% | 82% | 11% | 73.0 | 917 |
| C2-weighted | 57% | 76% | 82% | 11% | 73.0 | 848 |
| cur=Ereal+DYM3 | 50% | 59% | 59% | 41% | 1.5 | 133 |
| Escan+DYM | 57% | 65% | 66% | 33% | 7.1 | 200 |
| Escan+DYM+B | 63% | 74% | 75% | 25% | 7.6 | 214 |
| Escan+B+C1 | 59% | 73% | 75% | 25% | 9.1 | 318 |
| Escan+DYM+B+D | 67% | 78% | 79% | 20% | 8.0 | 228 |
| Escan+DYM+B+C1 | 70% | 83% | 85% | 14% | 9.3 | 333 |
| Escan+DYM+B+C1+D | 71% | 85% | 87% | 12% | 9.3 | 336 |
| Escan+DYM+B+C1+A | 71% | 88% | 93% | 4% | 12.2 | 361 |

**Sample u** (all corruption types pooled, n=5253)

| approach | R@1 | R@5 | R@20 | absent | avg cands | kB tag files @20 |
|---|---|---|---|---|---|---|
| E-real | 0% | 0% | 0% | 100% | 0.0 | 0 |
| E-scan | 13% | 15% | 15% | 84% | 2.6 | 54 |
| DYM(shipped,top3) | 47% | 58% | 58% | 42% | 1.2 | 97 |
| A-chars(full) | 26% | 32% | 34% | 65% | 4.4 | 110 |
| A-chars(same-files) | 20% | 24% | 25% | 75% | 1.7 | 38 |
| A-static(index keys) | 0% | 0% | 0% | 100% | 0.0 | 0 |
| D(subseq last resort only) | 14% | 18% | 19% | 80% | 1.8 | 79 |
| B-fold+end | 30% | 32% | 32% | 68% | 0.7 | 46 |
| B-wide | 41% | 47% | 47% | 53% | 1.8 | 77 |
| C1 | 39% | 55% | 58% | 42% | 2.5 | 190 |
| C2 | 47% | 70% | 79% | 11% | 47.9 | 701 |
| C2-weighted | 55% | 73% | 80% | 11% | 47.9 | 658 |
| cur=Ereal+DYM3 | 47% | 58% | 58% | 42% | 1.2 | 97 |
| Escan+DYM | 55% | 65% | 66% | 33% | 4.1 | 131 |
| Escan+DYM+B | 62% | 73% | 74% | 26% | 4.4 | 142 |
| Escan+B+C1 | 59% | 70% | 73% | 27% | 5.3 | 212 |
| Escan+DYM+B+D | 68% | 80% | 81% | 18% | 4.7 | 157 |
| Escan+DYM+B+C1 | 68% | 81% | 83% | 16% | 5.4 | 223 |
| Escan+DYM+B+C1+D | 72% | 85% | 87% | 12% | 5.5 | 231 |
| Escan+DYM+B+C1+A | 72% | 88% | 92% | 6% | 7.0 | 247 |

**Sample w-keep** (all corruption types pooled, n=5086)

| approach | R@1 | R@5 | R@20 | absent | avg cands | kB tag files @20 |
|---|---|---|---|---|---|---|
| E-real | 0% | 2% | 3% | 97% | 3.8 | 40 |
| E-scan | 13% | 17% | 18% | 82% | 7.4 | 115 |
| DYM(shipped,top3) | 51% | 61% | 61% | 39% | 1.6 | 144 |
| A-chars(full) | 22% | 30% | 33% | 64% | 11.1 | 188 |
| A-chars(same-files) | 19% | 24% | 25% | 74% | 4.5 | 69 |
| A-static(index keys) | 1% | 3% | 4% | 94% | 4.9 | 49 |
| D(subseq last resort only) | 13% | 16% | 17% | 82% | 3.7 | 140 |
| B-fold+end | 26% | 34% | 34% | 66% | 1.2 | 81 |
| B-wide | 36% | 48% | 49% | 51% | 3.1 | 120 |
| C1 | 40% | 59% | 61% | 39% | 4.6 | 322 |
| C2 | 47% | 75% | 83% | 10% | 82.8 | 927 |
| C2-weighted | 51% | 76% | 83% | 10% | 82.8 | 854 |
| cur=Ereal+DYM3 | 48% | 60% | 62% | 38% | 5.3 | 164 |
| Escan+DYM | 52% | 65% | 67% | 32% | 9.7 | 208 |
| Escan+DYM+B | 57% | 73% | 75% | 24% | 10.3 | 219 |
| Escan+B+C1 | 54% | 72% | 75% | 24% | 12.1 | 323 |
| Escan+DYM+B+D | 60% | 77% | 79% | 20% | 10.6 | 230 |
| Escan+DYM+B+C1 | 63% | 81% | 85% | 14% | 12.2 | 333 |
| Escan+DYM+B+C1+D | 65% | 83% | 87% | 12% | 12.3 | 337 |
| Escan+DYM+B+C1+A | 65% | 86% | 92% | 4% | 15.5 | 360 |

**Sample u-keep** (all corruption types pooled, n=5333)

| approach | R@1 | R@5 | R@20 | absent | avg cands | kB tag files @20 |
|---|---|---|---|---|---|---|
| E-real | 0% | 1% | 2% | 98% | 2.2 | 17 |
| E-scan | 12% | 15% | 16% | 83% | 4.4 | 62 |
| DYM(shipped,top3) | 47% | 58% | 58% | 42% | 1.3 | 102 |
| A-chars(full) | 24% | 32% | 34% | 65% | 6.3 | 116 |
| A-chars(same-files) | 19% | 24% | 25% | 75% | 2.4 | 44 |
| A-static(index keys) | 0% | 2% | 2% | 97% | 2.8 | 21 |
| D(subseq last resort only) | 13% | 17% | 18% | 82% | 2.0 | 82 |
| B-fold+end | 29% | 34% | 34% | 66% | 0.8 | 56 |
| B-wide | 40% | 48% | 49% | 51% | 2.0 | 83 |
| C1 | 37% | 54% | 58% | 42% | 3.0 | 214 |
| C2 | 45% | 69% | 79% | 11% | 54.1 | 722 |
| C2-weighted | 52% | 73% | 80% | 11% | 54.1 | 674 |
| cur=Ereal+DYM3 | 46% | 58% | 59% | 41% | 3.5 | 112 |
| Escan+DYM | 53% | 64% | 66% | 33% | 6.0 | 138 |
| Escan+DYM+B | 60% | 72% | 74% | 25% | 6.4 | 148 |
| Escan+B+C1 | 56% | 69% | 72% | 27% | 7.4 | 216 |
| Escan+DYM+B+D | 65% | 79% | 81% | 17% | 6.6 | 162 |
| Escan+DYM+B+C1 | 65% | 80% | 82% | 16% | 7.5 | 225 |
| Escan+DYM+B+C1+D | 69% | 84% | 87% | 12% | 7.6 | 233 |
| Escan+DYM+B+C1+A | 69% | 87% | 92% | 6% | 9.2 | 247 |

## 4. File sizes (computed for real by building the files in memory and compressing, not estimated, unless marked)

Raw = JSON bytes. gz = gzip level 9, per file, summed (what a static host sends). All sharded like the existing folders (first two characters of the key).

| artifact | files | raw | gzip | notes |
|---|---|---|---|---|
| existing `tags/` | 1,645 | 21.6 MB | 5.3 MB | |
| existing `substring/` | 1,164 | 8.6 MB | 1.36 MB | 21,597 keys, all vocabulary words |
| **A, untiered, as first described** (every word containing key letters in order, all 21,597 keys) | n/a | ~29.3 MB | ~5 MB (estimate, using the substring ratio of 6.3) | 1,045,276 entries, 48.4 per key. Real, but 3.4x the current substring folder |
| **A, tiered as specified** (<=1 gap top 20, <=2 gaps top 10, score >= 0.4, non-substring only) | 831 | 1.93 MB | **351 KB** | 10,493 of 21,597 keys non-empty, 75,096 entries (3.5 per key). Cheap, but see section 1: it cannot serve a typo |
| **B-fold** (key -> words, groups that are not the word itself) | 717 | 1.91 MB | 350 KB | 35,448 groups stored |
| **B-end** | 821 | 0.82 MB | 176 KB | 12,269 groups stored |
| **B-fold+end** | 795 | 1.98 MB | **374 KB** | 33,382 groups, 8,165 with 2+ words, largest group 19. With word ids instead of words: 1.1 MB raw / 307 KB gz (+ vocabulary list) |
| B-wide | 649 | 2.20 MB | 416 KB | largest group 36 |
| **C1 delete index** (word ids) | 3,433 | 16.8 MB | **2.83 MB** | 534,896 delete keys, 631,185 postings. With literal words instead of ids: 28.6 MB raw / 3.0 MB gz. A query touches 3 shards, about 19 KB gz |
| **C2 delete index** (word ids, words longer than 16 characters skipped: 276) | 4,505 | 64.6 MB | **8.15 MB** | 2,012,523 keys, 2,570,620 postings. A query touches 5.8 shards (max 6), about 88 KB gz |
| **Vocabulary list, word + hadis count** (one file, tab/newline) | 1 | 1.71 MB | **351 KB** (349 KB brotli) | 77,393 lines. Words only: 1.55 MB / 296 KB. Sharded by first two characters: 1,573 files, 1.71 MB / 449 KB |

Both ids-based delete indexes also need the id -> word list (the vocabulary file above), so add 351 KB.

Query-time cost with the vocabulary file in memory (Node on this laptop, per query, 300 typo queries; expect 3 to 5x slower on a phone):

| operation | cost |
|---|---|
| substring scan of 77k words (E-scan) | 0.9 ms |
| subsequence presence scan (A, before scoring) | 1.3 ms |
| edit distance <= 2 by scanning length buckets, no index | 26.8 ms (too slow without an index) |
| C1 delete index built at load, then looked up | build 133 ms (535k keys), lookup 0.01 ms |
| B groups built at load (fold + ending key for every word) | 86 ms |
| the entire simulation pipeline (all approaches at once) | about 4 ms per query |

## 5. Does subsequence earn its cost?

Cost of A is not the file size. Tiered, the static file is 351 KB gz and would be a fine size if it worked. The cost is that it **does not work** as a precomputed key -> words map, because a typo is the one input that is never a key (0% at all ranks over 4,925 typo queries; 4% overall even when I let corrupted queries that happen to be words through). The only way to make A work is to scan the vocabulary at query time, and then:

| question | number |
|---|---|
| What does A add on top of E + DYM + B + C1 (rank 20, overall)? | 85% to 93% (+8 points), absent 14% to 4% |
| ... from which corruption types? | drop2 +50, skel +57, drop1 +2, everything else 0 |
| ... by how much would the overall number move if multi-letter omissions are 5% of failed queries and the rest follow the single-letter mix? | roughly +3 points (0.05 x ~55) |
| What does A replace? | nothing; it is purely additive, and the substring folder is the only thing it could displace |
| Extra candidates per query? | +2.9 words on average (9.3 to 12.2), +28 KB of tag files for the top 20 |
| Rank-1 effect? | none overall (70% to 71%) |

So subsequence matching earns its cost only as a late, additive, query-time tier for queries with two or more missing letters (including consonant-skeleton typing). It does not earn a new index. If real query logs show that people drop several letters (for example abbreviated or half-remembered names), add it; if not, B + C1 gives about 85% at rank 20 and 70% at rank 1 without it.

## 6. Recommendation

Rank of value per unit of cost, from this data:

1. **Replace the static substring folder with query-time substring search** over a vocabulary file. It is the only way a fragment that is not a word (every stem query, every half-typed word) returns anything: shipped E-real is 0% on those, E-scan finds the stem's word at rank 1 in 92% of stem cases and at rank 20 in 100%. File effect: the 1.36 MB gz / 8.6 MB raw `substring/` folder (1,164 files) becomes one 351 KB gz file, loaded once and cached. The existing 500-hadis cap for very common words stays.
2. **Add B-fold+end** (live from the same vocabulary file, 86 ms to build groups, no file of its own): fixes inflection and stem (29% to 99% on inflect). If you prefer static, it is 374 KB gz as a sharded file, but there is no reason to pay for it when the vocabulary is already loaded.
3. **Add C1 (edit distance <= 1)** via a delete index built at load (133 ms) or sharded static (2.83 MB gz, not recommended): drop1, swap and insert go from 51 to 74% to 92 to 97% at rank 20. Do not use C2: alone it reaches 82% at rank 20 (C1 alone 59%), but it returns 73 candidates per query and needs 917 KB of tag files for the top 20, and the static file is 8.15 MB gz; the ladder with C1 already reaches 85%. Rank candidates with a cost where a confusable substitution counts 0.5 (measured on C2: rank-1 on conf-vowel / conf-cons goes from 84% / 80% to 100% / 100%).
4. **Keep the shipped confusion variants (DYM)**; they are already 97 to 100% on confusables. B-wide could eventually replace them (one key lookup instead of up to 60 probes), but it weakens rank-1 on non-confusion typos, so keep both.
5. **Subsequence last**, as a live tier appended after the above, only when the shorter lists still look empty or weak, and only if you care about 2+ missing letters. Implement it as the scan I tested (greedy check, tightest span, gap <= 2, score >= 0.4, top 20 / top 10); never as a precomputed index and never restricted to the query's first two characters. In suggestion-only form (D, "last resort when everything is empty") it adds just +2 points because the other tiers rarely return an empty list; if you want the benefit, append it unconditionally with a distinct label ("words containing these letters in order").
6. Show corrections before substring results when the typed word matches fewer than about 3 hadis; otherwise a word that merely contains the typed letters outranks the real correction (rank-1 on confusions drops 99% to 89% in my E-first ordering).

Net effect on the shipped state (pooled w sample, rank 20 / rank 1, with E first): shipped 59% / 50% -> +E-scan, B, C1: 85% / 70% -> + subsequence tail: 93% / 71%. Added downloads: one 351 KB gz vocabulary file, minus the 1.36 MB gz substring folder. No new generated folder.

## 7. Caveats

* Corruption mix, sample weights and the rule "the corrupted query is not already a word" are mine. Real logs would change the pooled numbers, not the per-type ones. The pooled ALL column overweights confusions and drops; read the per-type columns.
* The vocabulary is noisy (many misspelled variants are in it: for example 67% of single-letter drops of common words land on another existing word). For those queries the site already returns results for the wrong word and the suggestion layer may not fire; that regime is the "keep" tables below, where recall is lower for everything but the ranking of approaches does not change.
* The "fewer than 3 hadis" trigger, `MAX_EXTRA_FILES`, and hand-made synonyms were not modelled. The DYM numbers are therefore an upper bound on the shipped behaviour.
* Candidate-to-hadis resolution was measured only as tag-file download size, not as hadis returned.
* Gap definition for A is ambiguous; I ran both skipped-characters and number-of-breaks and they agree within 1 to 2 points.
* Timing was measured in Node on a laptop; the 133 ms and 86 ms build costs should be treated as 0.4 to 0.7 s on a mid-range phone, one time per session, and only when a search is weak.

## 8. Appendix: full matrices

Files: `tables-w.md`, `tables-u.md`, `tables-w-keep.md`, `tables-u-keep.md` in `decision/a1/` (every approach x every type for R@1, R@5, R@20, absent, plus per-row counts). The w sample matrices follow.


#### w sample, r1 (rows: approach, columns: corruption type; last two columns: average candidates over all queries, kB of tag files for top 20)
| approach | drop1 | drop2 | skel | conf-vowel | conf-cons | conf2 | swap | insert | inflect | stem | ALL | avgCands(ALL) | kB tagfiles@20 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| E-real | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0.0 | 0 |
| E-scan | 21% | 10% | 0% | 0% | 2% | 0% | 0% | 0% | 0% | 92% | 15% | 5.1 | 96 |
| DYM(shipped,top3) | 31% | 0% | 0% | 99% | 97% | 98% | 38% | 71% | 27% | 32% | 50% | 1.5 | 133 |
| DYM(top20) | 31% | 0% | 0% | 99% | 97% | 98% | 38% | 71% | 27% | 32% | 50% | 2.2 | 134 |
| A-chars(full) | 70% | 33% | 25% | 0% | 5% | 0% | 0% | 0% | 0% | 95% | 24% | 8.3 | 180 |
| A-chars(same-files) | 47% | 19% | 13% | 0% | 5% | 0% | 0% | 0% | 0% | 95% | 20% | 2.7 | 53 |
| A-breaks(full) | 71% | 36% | 24% | 0% | 5% | 0% | 0% | 0% | 0% | 95% | 25% | 9.2 | 192 |
| A-static(index keys) | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0.0 | 0 |
| D(subseq last resort only) | 67% | 34% | 35% | 0% | 4% | 0% | 0% | 0% | 0% | 0% | 13% | 3.2 | 128 |
| B-fold | 0% | 0% | 0% | 68% | 36% | 17% | 0% | 0% | 0% | 0% | 10% | 0.2 | 21 |
| B-end | 2% | 1% | 0% | 0% | 0% | 0% | 0% | 2% | 83% | 70% | 19% | 0.5 | 41 |
| B-fold+end | 2% | 0% | 0% | 68% | 36% | 17% | 0% | 2% | 82% | 69% | 29% | 1.0 | 63 |
| B-wide | 4% | 0% | 0% | 94% | 97% | 69% | 3% | 6% | 74% | 55% | 41% | 2.8 | 106 |
| C1 | 56% | 0% | 0% | 84% | 62% | 0% | 77% | 94% | 28% | 31% | 45% | 3.7 | 289 |
| C2 | 56% | 6% | 4% | 84% | 80% | 26% | 79% | 97% | 39% | 32% | 52% | 73.0 | 917 |
| C2-weighted | 54% | 5% | 4% | 100% | 100% | 46% | 81% | 96% | 38% | 28% | 57% | 73.0 | 848 |
| B-fold+end weighted | 2% | 0% | 0% | 68% | 36% | 17% | 0% | 2% | 68% | 68% | 27% | 1.0 | 63 |
| cur=Ereal+DYM3 | 31% | 0% | 0% | 99% | 97% | 98% | 38% | 71% | 27% | 32% | 50% | 1.5 | 133 |
| Escan+DYM | 42% | 10% | 0% | 89% | 93% | 96% | 36% | 68% | 24% | 92% | 57% | 7.1 | 200 |
| Escan+DYM+B | 42% | 10% | 0% | 89% | 93% | 96% | 36% | 68% | 72% | 92% | 63% | 7.6 | 214 |
| Escan+B+C1 | 52% | 10% | 0% | 83% | 63% | 16% | 69% | 91% | 79% | 92% | 59% | 9.1 | 318 |
| Escan+DYM+B+D | 53% | 26% | 14% | 89% | 93% | 96% | 36% | 68% | 72% | 92% | 67% | 8.0 | 228 |
| Escan+DYM+B+C1 | 50% | 10% | 0% | 89% | 93% | 96% | 66% | 90% | 72% | 92% | 70% | 9.3 | 333 |
| Escan+DYM+B+C1+D | 51% | 21% | 11% | 89% | 93% | 96% | 66% | 90% | 72% | 92% | 71% | 9.3 | 336 |
| Escan+DYM+B+C1+A | 51% | 21% | 11% | 89% | 93% | 96% | 66% | 90% | 72% | 92% | 71% | 12.2 | 361 |


#### w sample, r5 (rows: approach, columns: corruption type; last two columns: average candidates over all queries, kB of tag files for top 20)
| approach | drop1 | drop2 | skel | conf-vowel | conf-cons | conf2 | swap | insert | inflect | stem | ALL | avgCands(ALL) | kB tagfiles@20 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| E-real | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0.0 | 0 |
| E-scan | 25% | 18% | 0% | 0% | 2% | 0% | 0% | 0% | 0% | 100% | 17% | 5.1 | 96 |
| DYM(shipped,top3) | 49% | 0% | 0% | 100% | 100% | 100% | 50% | 74% | 29% | 69% | 59% | 1.5 | 133 |
| DYM(top20) | 52% | 0% | 0% | 100% | 100% | 100% | 50% | 74% | 29% | 75% | 60% | 2.2 | 134 |
| A-chars(full) | 87% | 60% | 51% | 0% | 5% | 0% | 0% | 0% | 0% | 100% | 31% | 8.3 | 180 |
| A-chars(same-files) | 53% | 31% | 22% | 0% | 5% | 0% | 0% | 0% | 0% | 99% | 23% | 2.7 | 53 |
| A-breaks(full) | 87% | 63% | 50% | 0% | 5% | 0% | 0% | 0% | 0% | 100% | 31% | 9.2 | 192 |
| A-static(index keys) | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0.0 | 0 |
| D(subseq last resort only) | 72% | 55% | 57% | 0% | 4% | 0% | 0% | 0% | 0% | 0% | 17% | 3.2 | 128 |
| B-fold | 0% | 0% | 0% | 68% | 36% | 28% | 0% | 0% | 0% | 0% | 11% | 0.2 | 21 |
| B-end | 3% | 1% | 0% | 0% | 0% | 0% | 0% | 2% | 98% | 72% | 21% | 0.5 | 41 |
| B-fold+end | 3% | 1% | 0% | 68% | 36% | 28% | 1% | 2% | 98% | 72% | 32% | 1.0 | 63 |
| B-wide | 7% | 1% | 0% | 100% | 100% | 99% | 4% | 6% | 92% | 60% | 48% | 2.8 | 106 |
| C1 | 92% | 0% | 0% | 100% | 71% | 0% | 92% | 97% | 30% | 74% | 58% | 3.7 | 289 |
| C2 | 94% | 24% | 15% | 100% | 97% | 53% | 99% | 100% | 54% | 82% | 75% | 73.0 | 917 |
| C2-weighted | 94% | 21% | 13% | 100% | 100% | 65% | 99% | 100% | 54% | 79% | 76% | 73.0 | 848 |
| B-fold+end weighted | 3% | 1% | 0% | 68% | 36% | 28% | 1% | 2% | 98% | 72% | 32% | 1.0 | 63 |
| cur=Ereal+DYM3 | 49% | 0% | 0% | 100% | 100% | 100% | 50% | 74% | 29% | 69% | 59% | 1.5 | 133 |
| Escan+DYM | 62% | 18% | 0% | 97% | 99% | 100% | 50% | 73% | 29% | 100% | 65% | 7.1 | 200 |
| Escan+DYM+B | 62% | 18% | 0% | 97% | 99% | 100% | 50% | 73% | 99% | 100% | 74% | 7.6 | 214 |
| Escan+B+C1 | 82% | 18% | 0% | 97% | 70% | 27% | 91% | 97% | 99% | 100% | 73% | 9.1 | 318 |
| Escan+DYM+B+D | 74% | 38% | 22% | 97% | 99% | 100% | 50% | 73% | 99% | 100% | 78% | 8.0 | 228 |
| Escan+DYM+B+C1 | 81% | 18% | 0% | 97% | 99% | 100% | 90% | 96% | 99% | 100% | 83% | 9.3 | 333 |
| Escan+DYM+B+C1+D | 81% | 29% | 13% | 97% | 99% | 100% | 90% | 96% | 99% | 100% | 85% | 9.3 | 336 |
| Escan+DYM+B+C1+A | 82% | 50% | 37% | 97% | 99% | 100% | 90% | 96% | 99% | 100% | 88% | 12.2 | 361 |


#### w sample, r20 (rows: approach, columns: corruption type; last two columns: average candidates over all queries, kB of tag files for top 20)
| approach | drop1 | drop2 | skel | conf-vowel | conf-cons | conf2 | swap | insert | inflect | stem | ALL | avgCands(ALL) | kB tagfiles@20 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| E-real | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0.0 | 0 |
| E-scan | 26% | 20% | 0% | 0% | 2% | 0% | 0% | 0% | 0% | 100% | 17% | 5.1 | 96 |
| DYM(shipped,top3) | 49% | 0% | 0% | 100% | 100% | 100% | 50% | 74% | 29% | 69% | 59% | 1.5 | 133 |
| DYM(top20) | 53% | 0% | 0% | 100% | 100% | 100% | 50% | 74% | 29% | 78% | 61% | 2.2 | 134 |
| A-chars(full) | 95% | 76% | 60% | 0% | 5% | 0% | 0% | 0% | 0% | 100% | 34% | 8.3 | 180 |
| A-chars(same-files) | 54% | 36% | 24% | 0% | 5% | 0% | 0% | 0% | 0% | 99% | 23% | 2.7 | 53 |
| A-breaks(full) | 95% | 79% | 59% | 0% | 5% | 0% | 0% | 0% | 0% | 100% | 34% | 9.2 | 192 |
| A-static(index keys) | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 0.0 | 0 |
| D(subseq last resort only) | 73% | 64% | 62% | 0% | 4% | 0% | 0% | 0% | 0% | 0% | 18% | 3.2 | 128 |
| B-fold | 0% | 0% | 0% | 68% | 36% | 28% | 0% | 0% | 0% | 0% | 11% | 0.2 | 21 |
| B-end | 3% | 1% | 0% | 0% | 0% | 0% | 0% | 2% | 98% | 72% | 21% | 0.5 | 41 |
| B-fold+end | 3% | 1% | 0% | 68% | 36% | 28% | 1% | 2% | 98% | 72% | 32% | 1.0 | 63 |
| B-wide | 7% | 1% | 0% | 100% | 100% | 100% | 4% | 6% | 93% | 60% | 48% | 2.8 | 106 |
| C1 | 97% | 0% | 0% | 100% | 71% | 0% | 92% | 97% | 30% | 78% | 59% | 3.7 | 289 |
| C2 | 99% | 51% | 38% | 100% | 99% | 62% | 100% | 100% | 55% | 93% | 82% | 73.0 | 917 |
| C2-weighted | 100% | 46% | 34% | 100% | 100% | 65% | 100% | 100% | 55% | 92% | 82% | 73.0 | 848 |
| B-fold+end weighted | 3% | 1% | 0% | 68% | 36% | 28% | 1% | 2% | 98% | 72% | 32% | 1.0 | 63 |
| cur=Ereal+DYM3 | 49% | 0% | 0% | 100% | 100% | 100% | 50% | 74% | 29% | 69% | 59% | 1.5 | 133 |
| Escan+DYM | 65% | 20% | 0% | 99% | 100% | 100% | 50% | 74% | 29% | 100% | 66% | 7.1 | 200 |
| Escan+DYM+B | 65% | 20% | 0% | 99% | 100% | 100% | 51% | 74% | 99% | 100% | 75% | 7.6 | 214 |
| Escan+B+C1 | 93% | 20% | 0% | 99% | 71% | 28% | 92% | 97% | 99% | 100% | 75% | 9.1 | 318 |
| Escan+DYM+B+D | 77% | 42% | 23% | 99% | 100% | 100% | 51% | 74% | 99% | 100% | 79% | 8.0 | 228 |
| Escan+DYM+B+C1 | 92% | 20% | 0% | 99% | 100% | 100% | 92% | 97% | 99% | 100% | 85% | 9.3 | 333 |
| Escan+DYM+B+C1+D | 92% | 32% | 13% | 99% | 100% | 100% | 92% | 97% | 99% | 100% | 87% | 9.3 | 336 |
| Escan+DYM+B+C1+A | 94% | 70% | 57% | 99% | 100% | 100% | 92% | 97% | 99% | 100% | 93% | 12.2 | 361 |


#### w sample, absent (rows: approach, columns: corruption type; last two columns: average candidates over all queries, kB of tag files for top 20)
| approach | drop1 | drop2 | skel | conf-vowel | conf-cons | conf2 | swap | insert | inflect | stem | ALL | avgCands(ALL) | kB tagfiles@20 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| E-real | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 0.0 | 0 |
| E-scan | 73% | 78% | 100% | 100% | 98% | 100% | 100% | 100% | 100% | 0% | 83% | 5.1 | 96 |
| DYM(shipped,top3) | 51% | 100% | 100% | 0% | 0% | 0% | 50% | 26% | 71% | 31% | 41% | 1.5 | 133 |
| DYM(top20) | 47% | 100% | 100% | 0% | 0% | 0% | 50% | 26% | 71% | 23% | 39% | 2.2 | 134 |
| A-chars(full) | 0% | 11% | 38% | 100% | 95% | 100% | 100% | 100% | 100% | 0% | 64% | 8.3 | 180 |
| A-chars(same-files) | 46% | 63% | 76% | 100% | 95% | 100% | 100% | 100% | 100% | 1% | 77% | 2.7 | 53 |
| A-breaks(full) | 0% | 9% | 38% | 100% | 95% | 100% | 100% | 100% | 100% | 0% | 64% | 9.2 | 192 |
| A-static(index keys) | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 0.0 | 0 |
| D(subseq last resort only) | 27% | 33% | 38% | 100% | 96% | 100% | 100% | 100% | 100% | 100% | 82% | 3.2 | 128 |
| B-fold | 100% | 100% | 100% | 32% | 64% | 72% | 100% | 100% | 100% | 100% | 89% | 0.2 | 21 |
| B-end | 97% | 99% | 100% | 100% | 100% | 100% | 100% | 98% | 2% | 28% | 79% | 0.5 | 41 |
| B-fold+end | 97% | 99% | 100% | 32% | 64% | 72% | 99% | 98% | 2% | 28% | 68% | 1.0 | 63 |
| B-wide | 93% | 99% | 100% | 0% | 0% | 0% | 96% | 94% | 7% | 40% | 52% | 2.8 | 106 |
| C1 | 3% | 100% | 100% | 0% | 29% | 100% | 8% | 3% | 70% | 22% | 41% | 3.7 | 289 |
| C2 | 0% | 6% | 29% | 0% | 0% | 35% | 0% | 0% | 45% | 0% | 11% | 73.0 | 917 |
| C2-weighted | 0% | 6% | 29% | 0% | 0% | 35% | 0% | 0% | 45% | 0% | 11% | 73.0 | 848 |
| B-fold+end weighted | 97% | 99% | 100% | 32% | 64% | 72% | 99% | 98% | 2% | 28% | 68% | 1.0 | 63 |
| cur=Ereal+DYM3 | 51% | 100% | 100% | 0% | 0% | 0% | 50% | 26% | 71% | 31% | 41% | 1.5 | 133 |
| Escan+DYM | 34% | 78% | 100% | 0% | 0% | 0% | 50% | 26% | 71% | 0% | 33% | 7.1 | 200 |
| Escan+DYM+B | 34% | 78% | 100% | 0% | 0% | 0% | 49% | 26% | 1% | 0% | 25% | 7.6 | 214 |
| Escan+B+C1 | 2% | 78% | 100% | 0% | 29% | 72% | 8% | 3% | 1% | 0% | 25% | 9.1 | 318 |
| Escan+DYM+B+D | 22% | 57% | 77% | 0% | 0% | 0% | 49% | 26% | 1% | 0% | 20% | 8.0 | 228 |
| Escan+DYM+B+C1 | 2% | 78% | 100% | 0% | 0% | 0% | 8% | 3% | 1% | 0% | 14% | 9.3 | 333 |
| Escan+DYM+B+C1+D | 2% | 66% | 87% | 0% | 0% | 0% | 8% | 3% | 1% | 0% | 12% | 9.3 | 336 |
| Escan+DYM+B+C1+A | 0% | 11% | 38% | 0% | 0% | 0% | 8% | 3% | 1% | 0% | 4% | 12.2 | 361 |
