# Advisor 2 (performance / delivery / maintenance): subsequence index vs the alternatives

Everything below was measured on the real `public/json/tags` and `substring` data with throwaway scripts in `scratchpad/decision/adv2-work/` (nothing in the project was touched). Where a number is an estimate it says so.

## 0. Headline

1. **A static subsequence index does not earn its cost.** For keys of 4+ letters it is small (about 0.4 to 0.9 MB gzipped) but it is also nearly empty of value: 0.7 entries per key, 78% of keys get nothing, and common words (কিতাব, জান্নাত, ঈমান, দুনিয়া, আখিরাত, সাহাবী) get no entry at all. It also cannot help the case it is meant for: a misspelling that is not a vocabulary word is not a key, and keys cannot be precomputed for arbitrary strings.
2. **The best value is Option C in its cheapest form: ship one sorted word list (with hadis counts) and do everything else in memory in the worker.** That one file (about 100 to 240 KB gzipped) gives did-you-mean for all prefixes (TODO 5), autocomplete (TODO 6), fold groups and endings (Option B without a new index), and a last-resort subsequence scan (Option D) at about 2 ms per key. It also removes the up to 7 data-file downloads that today's `suggest` can trigger.
3. **A bigger problem is outside the five options and dwarfs all of them: the substring expansion fetches the tags file of every containing word.** For a frequent short word that is hundreds of files (see section 3). 3-letter sharding cuts bytes but raises the request count (the word "কে" goes from 468 files at 2 letters to 1,317 at 3 letters). Capping the expansion at the top ~50 containing words by hadis count cuts p99 files from 675 to 38 at a 1% loss in hadis found. Request count, not bandwidth, is what costs Netlify credits here.

## 1. Method and assumptions

- Vocabulary: the existing `tags/*.json`, NFC-normalised with joiners dropped (what `normalizeBengali` does). 77,393 normalised words (80,587 raw), 1,904,279 (word, hadis) pairs. 13,710 words (18%) are Arabic-script words with tashkeel.
- I reproduced the existing artefacts first, so the baseline is real: regrouping the raw files by first 3 characters gives exactly 9,655 tags files (largest 431 KB) and 6,123 substring files (largest 126 KB). The substring map is reproducible from the vocabulary (key = vocabulary word of 2+ letters, values = other vocabulary words containing it): 290 of 301 sampled keys match exactly, the 11 mismatches are Arabic words with diacritics.
- Sizes: raw bytes, gzip level 6, brotli quality 5. Netlify compresses text/JSON on the CDN; I assumed it does for `application/json` (unverified, but the old and new figures are compared on the same basis).
- "Letters" means Unicode code points of the normalised word (a vowel sign counts as a letter). Using code points is also how the existing 2- and 3-character shards are cut.
- Subsequence definition used (A1): gaps = number of skipped letters inside the shortest matching window; `<=1` gap top 20, `<=2` gaps top 10, score = (key length / word length) x (1 - 0.15 x gaps), drop score < 0.4, keys 4+ letters, substring matches excluded because `substring/` already has them. A second reading (A2): gaps = number of skipped runs of any length, score = (key/word) x (1 - 0.2 x (runs-1)). The generator was cross-checked against a brute-force scan on 150 random keys: 0 mismatches.
- Query populations: "all keys" = each of the 21.6k substring keys once; "frequency-weighted" = words drawn with probability proportional to their hadis count (3+ letters), 4,000 queries; 3-word queries are three such draws; "top1000" = three words drawn from the 1,000 most common. All cold cache (upper bound: a browser reuses files it already has for 24 h, `Cache-Control: max-age=86400`).
- Phone model (my assumption, not measured on a phone): 4 Mbit/s = 512 KB/s, 150 ms round trip, two sequential rounds (own files, then the containing words' files), parse + index at 11 MB/s raw (this Mac measured 55 MB/s; I took 5x slower). Time = 0.3 s + gzipped KB / 512 + raw KB / 11,264. HTTP/2 per-request overhead is not modelled, so the many-file rows are optimistic.
- Credits: 20 per GB (binary GB) + 2 per 10,000 requests, per 1,000 searches, cold cache.

## 2. Index size, files and build cost per option

Current and decided baseline:

| Set | Files | Raw | gzip | brotli | Largest (raw / gz) | p99 file (raw / gz) |
|---|---|---|---|---|---|---|
| tags, 2 letters (today) | 1,645 | 21.64 MB | 5.41 MB | 4.57 MB | 864 KB / 207 KB | 279 KB / 69 KB |
| tags, 3 letters | 9,655 | 21.64 MB | 5.87 MB | 4.98 MB | 431 KB / 100 KB | 41 KB / 10 KB |
| substring, 2 letters (today) | 1,164 | 8.57 MB | 1.43 MB | 1.40 MB | 351 KB / 60 KB | 139 KB / 23 KB |
| substring, 3 letters | 6,123 | 8.57 MB | 1.74 MB | 1.70 MB | 126 KB / 24 KB | 21 KB / 3 KB |
| both at 3 letters | 15,778 | 30.2 MB | 7.61 MB | | | |
| both at 3 letters plus 2-letter files kept | 18,587 | 60 MB | 14.45 MB | | | |

New artefacts (all additions next to the above):

| Option | Content | Files | Raw | gzip | brotli | Largest raw | Generator (Node prototype) | Peak memory |
|---|---|---|---|---|---|---|---|---|
| **A1** subsequence, letters-gap, 3-letter shards | 16,141 keys with entries, 51,865 entries (0.7 per 4+-letter key; 3.2 per key that has any) | 3,639 | 1.68 MB | 0.44 MB | 0.41 MB | 34 KB (p99 5 KB) | 4.7 s | 370 MB |
| A1 at 2-letter shards | same | 860 | 1.68 MB | 0.30 MB | 0.29 MB | 58 KB | 4.7 s | 370 MB |
| **A2** subsequence, runs-gap, drop 0.4 | 19,020 keys, 72,566 entries | 3,942 | 2.36 MB | 0.56 MB | 0.54 MB | 55 KB | brute force: about 144 s single-threaded in Node (est.), 7 s on 8 cores in C | small |
| A2 without the 0.4 drop (ceiling at the 20/10 caps) | 21,775 keys, 134,577 entries | 4,401 | 4.51 MB | 0.92 MB | 0.89 MB | 78 KB | same | small |
| A2 uncapped upper bound | 226,626 non-substring pairs (146,042 one-gap + 80,584 two-gap) = 3.1 per 4+-letter key | n/a | about 7 MB est. | | | | | |
| **B-full** folded variant index, letters + endings (L1E), tags 3-letter shards | 57,959 folded keys | 10,563 | 20.42 MB | 5.32 MB | 4.63 MB | 427 KB | 0.24 s to group, about 5 s with shard writing | 530 MB |
| B-full substring over folded keys | 17,252 keys | 6,468 | 6.31 MB | 1.26 MB | | 93 KB | | |
| B-full total | | **17,031** | 26.7 MB | **6.58 MB** | | | | |
| B-full letters only (L1) | 71,385 keys; tags 10,563 files + substring 6,654 files | 17,217 | 30.0 MB | 7.12 MB | | | | |
| **C** word list, front-coded, all words | 77,393 words + counts | **1** | 839 KB | **240 KB** | 241 KB | | under 0.1 s | tiny |
| C word list, count >= 2, Bengali-script only | 35,849 words | 1 | 361 KB | 100 KB | 102 KB | | | |
| C word list, count >= 3, Bengali-script only | 27,261 words | 1 | 275 KB | 78 KB | 79 KB | | | |
| C precomputed delete-neighbourhood (do not ship it) | count >= 2 Bengali: 195k keys; all words: 535k keys | 1 | 4.9 MB / 13.9 MB | 0.94 MB / 2.51 MB | | | | |
| **D** runtime subsequence scan | no artefact (uses C) | 0 | 0 | 0 | | none | | |
| **E** nothing | | 0 | | | | | | |

Notes on these numbers:

- A1 and A2 are small because the 4-letter minimum removes the keys that produce thousands of matches. The "avg 46 vs 14.5 matches per key" in the 272-key sample was driven by the 2- and 3-letter keys (avg 912 and 111), which the spec excludes. Over the 4+-letter keys the mean is 3.1 non-substring subsequence matches per key even before any cap.
- B-full is essentially a second copy of the tags and substring indexes (same payload, merged by fold key), so it roughly doubles repo and deploy size for the index. Folding itself barely shrinks it: tags union entries 1,904,279 to 1,855,416.
- Memory for the in-browser structures (measured in Node): delete-neighbourhood in the worker, count >= 2 Bengali: 195k keys, about 15 MB heap, 79 ms to build (about 0.4 s on a phone at 5x, once per session, only when `suggest` runs). All words: 535k keys, 49 MB, 260 ms (about 1.3 s phone). I would not build it at all: a linear scan for "one edit away" over the list takes 1.0 ms p50 / 4.2 ms p99 for all 77k words (0.4 ms for the 36k list) on this Mac, so a phone needs about 5 to 20 ms with no index and no memory beyond the list itself.

## 3. What a search costs the user and Netlify

Typical and tail searches, 3-letter sharding unless stated. The "+A1" rows add the subsequence index: its own shard plus the tags files of up to 30 extra words per key.

| Search (frequency-weighted, 3+ letters) | Files avg / p50 / p99 | gzip KB avg / p50 / p99 | Credits per 1,000 searches avg (bandwidth + requests) | Phone seconds avg / p99 |
|---|---|---|---|---|
| 1 word, 2-letter files (today) | 7 / 3 / 91 | 245 / 114 / 2,359 | 6.1 (4.7 + 1.5) | 0.9 / 5.8 |
| 1 word, 3-letter | 9 / 3 / 137 | 77 / 27 / 712 | 3.2 (1.5 + 1.7) | 0.5 / 2.0 |
| 1 word, 3-letter + A1 | 11 / 5 / 139 | 87 / 37 / 712 | 3.9 (1.7 + 2.2) | 0.5 / 2.0 |
| 3 words, 2-letter (today) | 22 / 13 / 153 | 710 / 520 / 2,975 | 18.0 (13.5 + 4.4) | 2.0 / 7.2 |
| 3 words, 3-letter | 27 / 13 / 240 | 234 / 182 / 1,126 | 9.9 (4.5 + 5.4) | 0.8 / 2.9 |
| 3 words, 3-letter + A1 | 34 / 20 / 245 | 263 / 210 / 1,140 | 11.9 (5.0 + 6.8) | 0.9 / 2.9 |
| 3 words from the 1,000 most common, 3-letter | 55 / 14 / 710 | 273 / 124 / 2,440 | 16.1 (5.2 + 10.9) | 0.9 / 5.9 |
| 3 words from the 1,000 most common, 2-letter (today) | 34 / 13 / 325 | 837 / 452 / 4,488 | 22.8 | 2.2 / 10.7 |

Worst words in the data (a 2-letter particle):

| Search | Files | gzip KB | Credits per 1,000 | Phone seconds |
|---|---|---|---|---|
| "কে", 2-letter files | 468 | 4,813 | 185 | 11.4 |
| "কে", 3-letter files | 1,317 | 3,362 | 328 (264 of it requests) | 8.1 |
| "কে", "রা", "তে" together, 3-letter | 2,136 | 4,201 | 507 | 10.0 |
| same with A1 | 2,139 | 4,201 | 508 | 10.0 |

Reading it:

- **A1 adds about +2 files and +10 KB (1 word) or +7 files and +29 KB (3 words) per search, about +20% credits**, for entries that rarely exist. On the tail it adds nothing, because the tail is already dominated by the substring expansion.
- **3-letter sharding wins on bytes and typical credits, and loses on the tail's request count.** Roughly half of the 3-letter credit bill (1.7 of 3.2) is requests. Running 3-letter files without a cap means a 3-word query on common words can fire 700 requests.
- **Cap the expansion** (tags files of the top N containing words by hadis count; needs the substring values sorted by count, a one-line generator change, or counts from the word list). Measured, 3-letter, frequency-weighted population including 2-letter words:

| Cap per word | 1 word files avg / p99 | 1 word gzip KB avg / p99 | 3 words files avg / p99 | 3 words gzip KB avg / p99 | Hadis found vs uncapped |
|---|---|---|---|---|---|
| none | 33 / 675 | 162 / 2,442 | 89 / 1,127 | 433 / 2,956 | 100% |
| 100 | 9 / 70 | 87 / 485 | 25 / 104 | 246 / 911 | 99-100% |
| 50 | 6 / 38 | 75 / 423 | 18 / 64 | 215 / 734 | 99% |
| 20 | 4 / 18 | 59 / 359 | 12 / 33 | 167 / 529 | 98% |

  At cap 50, credits per 1,000 one-word searches go from 9.7 to 2.6 and p99 from about 181 to 16. This is the single largest delivery lever I found, bigger than anything in the five options. (Caveat: "hadis found" is the size of the union of hadis; the ranking effect of losing rare containing words was not evaluated.)
- **substring/ at 3 letters is a poor deal**: its files are tiny (p99 3 KB gz, 6,123 files). Using 2-letter substring files with 3-letter tags costs +7 KB per 1-word search (85 vs 78 KB avg) and +21 KB per 3-word search, and saves 4,959 files. Dropping substring files entirely in favour of the word list (below) saves 6,123 files and one request per word (7.0 vs 8.0 files avg for 1 word).

Netlify implications:

- Requests are the cost driver at 3-letter sharding. Netlify counts every file fetched (CDN hits included) as a web request: 2 credits per 10,000. A 1-word typical search (9 files) is 0.0018 credits; the tail (700 files) is 0.14 credits per search, a 80x spread.
- Rough capacity: at the typical 3.2 to 3.9 credits per 1,000 searches, 300 credits would cover 77k to 94k cold-cache searches per month with nothing else running (deploys cost 15 each, crawls about 35). That is a lot for this site; the risk is the tail, not the average.
- Files per directory: the largest directory would be tags with 9,655 files (10,563 if folded), far under 54,000. Total deployed index files go from 2,809 to 15,778 (A1 adds 3,639, B-full adds 17,031, C adds 1). Netlify's deploy upload is digest-based, so after the first deploy only changed files upload, but the first deploy after resharding uploads about 13,000 new files. The upload time of that deploy was not measured.

## 4. Per option

### A. Subsequence index (A1 or A2)

- Value: ~19k keys have any entry; 78% of 4+-letter keys get none. Of A1's entries, 3.5% involve Arabic-script words (tashkeel counted as gaps, pure noise), 2.3% differ only by a nukta or hasanta, the rest are a mixed bag. Real hits, from spot checks: শদটি to শব্দটি, তরপর to তারপরই, অতিবাহত to অতিবাহিত, অনেক্ষন to অনেকক্ষন, ইসলাম to ইসালাম/ইস্লাম. Noise: নারী to নাযরী, করের to ফকীরের, মায়া to তুমায়মা. My count of plausible ones in a 14-pair sample was about a third. Treat that as an impression, not a measured precision.
- The keys are vocabulary words, mostly corpus misspellings and short fragments, so the index finds fuller words for already-short or already-misspelled forms that exist in the corpus. A typed misspelling that is not in the vocabulary has no key, so the static index cannot help with the typo case.
- Interaction with 3-letter sharding: it shards cleanly (3,639 files, p99 file 5 KB), but each lookup also needs the tags files of up to 30 extra words, mostly under different 3-letter prefixes (+2 files avg), and a gap at the start of a word means the extra words begin with different letters than the key.
- Interaction with the worker: easy. One more `lookup("subseq", word)` in `tagsForWord`. The worker then holds 2 to 3 folders instead of 2.
- Maintenance: one more generator, one more folder, one more set of thresholds (tiers, the 0.4 drop, the score formula) to tune and test, for a result no one has asked to see. Deterministic and testable (brute-force cross-check passed on 150 keys), but the score formula and the definition of "gap" are undecided design choices that move the size 2x (1.7 vs 4.5 MB raw between A1/A2 and A2-no-drop).

### B. Fold letters and endings

Two very different implementations:

- **B-full (a folded variant index on disk).** +17,031 files, +6.58 MB gzipped, +26.7 MB raw. Fold keys: L1 (ী/ি, ূ/ু, ঈ/ই, ঊ/উ, ষ/স/শ, ণ/ন, Arabic harakat stripped) 77,393 to 71,385; with endings (গুলো, গুলি, দের, েরা, ের, কে, তে, টি, টা, রা, ও, ে, র, য়) 57,959. Groups average 1.08 (L1) or 1.34 (L1E), max 11 and 17. Not worth the weight, because the same grouping can be done in memory (B-lite).
- **B-lite (fold at lookup time using groups built in memory from the word list C).** Cost measured: group size p50 1 / p99 4 for L1 and 3 / 12 for L1E; extra tags files per search vs today p50 0, p90 1, p99 1, max 3 (group members almost always share the 3-letter prefix); extra gzipped KB p50 0, p99 5. No new index files, the fold function and ending list live in code.
- Recall measured, with a caveat. (1) Letter-confusion typos of real words, where the typo is not in the vocabulary (n = 1,500): L1 fold recovers 79%, the wider L2 fold (adds জ/য) 100%. This test is partly circular because the typos were generated from the same swap pairs; it shows the mechanism works, not the real-world rate. Today those queries return nothing until the user clicks a "did you mean" suggestion that costs extra file downloads. (2) Endings: for 1,500 inflected-form queries, a folded lookup finds more hadis than today's exact + substring in 71% of cases, median 2.4x, p90 43x. I did not measure precision, so some of that gain is almost certainly noise (stripping bare র, ে, য় is aggressive). Ship it behind a flag and judge with the relevance test set of TODO item 2.
- Bonus: folding fixes first-letters typos (শ/ষ/স-initial words fold into one shard), the case 3-letter files make worse.
- Worker: the group map is built once from the list, in the worker. No effect on the main thread.
- Maintenance: the fold table and ending list are code and data in the repo, unit-testable; no generator. The one risk is that folded matches need a UI label ("matched প্রায় সমান বানান") or they will confuse users.

### C. Word list with edit-distance-1 (the recommended core)

- Ship one file: sorted words with hadis counts, front-coded. 240 KB gzipped for all 77,393 words, 100 KB for the 35,849 Bengali-script words with count >= 2, 78 KB for count >= 3. Raw 839 KB / 361 KB / 275 KB. Build under 0.1 s.
- Edit-distance-1 candidates for a word by linear scan over the list: 1.0 ms p50 / 4.2 ms p99 (all words), 5x slower on a phone. The delete-neighbourhood is faster (4 us per lookup) but needs 15 to 49 MB heap and 80 to 260 ms to build, and precomputing it as a file is 0.9 to 2.5 MB gzipped. Neither is worth it at this list size.
- Recall of the intended word at one edit away is 100% by construction (insert, delete, substitute, swap, including in the first two letters) as long as the word is in the list. List thresholds matter: with count >= 2 you lose intended words that appear in one hadis only. Ranking is needed (avg 6.3 candidates, p99 65), by count, which the list carries.
- It cuts what `suggest` does today. `vocabularyOf` downloads the typed word's 2-letter tags file (up to 207 KB gzipped) and `checkCandidates` may open 6 more, so up to about 1.4 MB gzipped and 7 files; the typed word's first two letters must also be right. With the list, candidate hit counts (`hits`) come from the count column with zero downloads, and the tags file is fetched only when a suggestion is clicked.
- Autocomplete (TODO 6): binary search plus a 200-entry scan, 1 us p50 / 16 us p99. Substring (it could replace `substring/` for good): a `includes` scan over the full list takes 1.4 ms p50 / 2.0 ms p99 / 4.7 ms max, so the 6,123 substring files and 8.6 MB raw could go. Per search it is neutral (7.0 vs 8.0 files avg, 77 vs 78 KB), it costs the first-time visitor the 240 KB list, about 0.0046 credits (4.6 credits per 1,000 new visitors), and it can be fetched while the page is idle and cached 24 h.
- Interaction with 3-letter sharding: none (the list is prefix-agnostic). It does fix the main weakness of sharding by first letters.
- Interaction with the worker: the list and everything derived from it should live in the worker (240 KB parse, about 20 ms; about 5 to 8 MB memory for 77k strings; estimate, memory not measured).
- Maintenance: one generator, `scripts/build-wordlist.mjs`, 20 lines, reads the vocabulary, sorts, front-codes. Deterministic. Testable with a small vocabulary.

### D. Subsequence as last-resort suggestions only

- No artefact. With the word list in memory, a subsequence scan (<=2 skipped letters, key 4+ letters) costs 0.9 ms p50 / 1.7 ms max over the 27k Bengali words and 2.2 ms p50 / 5.9 ms max over all 77k words on this Mac, so about 5 to 30 ms on a phone. It runs only when the search found nothing and `suggest` found nothing, so the user never waits for it.
- It also works for words that are not in the vocabulary (a typo), which a precomputed A cannot. Quality limit as for A (noise), so show at most 3 suggestions, count-ranked, with the "<2 gaps" rule, Arabic-script words excluded.
- Maintenance: one function and its tests.

### E. Nothing

Costs nothing, keeps the current gaps (a typo in the first letters, endings, no autocomplete) and keeps today's heavy `suggest` path.

## 5. Delivery and maintenance table

| | A subsequence index | B-full | B-lite | C list | D scan | E |
|---|---|---|---|---|---|---|
| New files | +3,639 to +4,401 | +17,031 | 0 | +1 | 0 | 0 |
| Added gzip (repo, deploy) | +0.44 to +0.92 MB | +6.58 MB | 0 | +0.1 to 0.24 MB | 0 | 0 |
| Per-search extra | +2 files, +10 KB (1 word); +7 files, +29 KB (3 words) | same files as today | 0 to 1 extra file, 0 to 5 KB | none after first visit | none | none |
| One-time download | none | none | list (C) | 78 to 240 KB | list (C) | none |
| Credits per 1,000 searches | +0.7 to +2.0 (+20%) | about 0 | about 0 | -1 to -2 at most (suggest path), +1.9 to 4.6 per 1,000 new visitors | 0 | 0 |
| Generator | new, 4.7 s Node (A1), brute force minutes (A2) | new, about 5 s | none | new, under 0.1 s | none | none |
| Deterministic and testable | yes (cross-checked) | yes | yes | yes | yes | n/a |
| Moving parts | folder, tiers, 0.4 drop, score formula, gap definition | folder, fold table, endings, UI label | fold table, endings, UI label | one file | one function | none |
| With 3-letter sharding | fine, more fetches under other prefixes | fine | fixes first-letter typos | prefix-agnostic | prefix-agnostic | the first-letter weakness stays |
| With the worker | one more lookup | one more lookup | in-memory | in-memory, one fetch | in-memory | none |

## 6. Keeping the index in step with the texts

- **No script builds `tags/` today.** Any new generator therefore has to read `tags/*.json` as its source of truth (the regroup and word-list scripts here do), so adding a hadis still needs the unknown earlier tool.
- I checked whether `tags/` can be rebuilt from `public/json/hadis/<book>/<number>/text.txt` with the tokenizer in `searchIndex.js` (strip punctuation, split on whitespace). On 500 Bukhari hadis, 93.8% of tokens are found in `tags/` and 93.6% of `tags/` entries are reproduced; splitting on hyphens and dropping digit-only tokens moves that to 94.8% / 93.2%. The leftovers are things like curly quotes (’ “) attached to words and tags entries I could not trace to a token (আলা, মা, দেখ). So an exact reproduction needs a bit more reverse-engineering. Recommended as one small follow-up: a `scripts/build-search-index.mjs` that tokenizes the texts, normalises at build time (which also removes the `rawPrefixes` two-spelling lookup in `searchIndex.js`), and writes tags (3 letters), substring (or nothing), and the word list in one deterministic run, with a test that compares against a fixture. Then every artefact above is one script, one command, no hand-kept files.
- The word list (C) is the cheapest artefact to keep in step: one file, regenerated whenever the tags are.
- A (subsequence) and B-full (folded variant) each add their own folder and thresholds that need regenerating with every text change and tuning when the data changes.

## 7. Ranking

| Rank | Option | Why (numbers) |
|---|---|---|
| 1 | **C: one word list, scan in memory** | +1 file, 78 to 240 KB gz once; solves TODO 5 and 6; makes did-you-mean cost 0 downloads (today up to 7 files, about 1.4 MB gz); edit-1 scan 1 to 4 ms; same list can replace the 6,123 substring files |
| 2 | **B-lite: fold at lookup via in-memory groups from C** | 0 new files; typo recovery 79% (L1) to 100% (L2) on letter-confusion typos; 0 to 1 extra file per search; endings find more hadis in 71% of inflected queries (precision unmeasured) |
| 3 | **D: subsequence scan as last resort** | 0 files; 2 to 6 ms per key over the whole list; works for typos, which A cannot |
| 4 | **E: nothing** | beats A and B-full on cost |
| 5 | A: static subsequence index | +3,639 files, +0.44 MB gz, +20% credits, 0.7 entries per key, 78% of keys empty |
| 6 | B-full: folded variant index | +17,031 files, +6.58 MB gz, duplicates the index; the same grouping is free in memory |

**Does subsequence earn its cost? No.** If you want the idea, do D (a runtime scan over the word list, no new files).

Also do, regardless of the choice (largest measured lever): cap the substring expansion at the top ~50 containing words by hadis count (p99 files 675 to 38, credits per 1,000 one-word searches 9.7 to 2.6 at a 1% loss in hadis found). Consider substring at 2 letters (saves 4,959 files for +7 KB per search) or the word list instead of the substring files. Re-evaluate the "3-letter shards for both" decision with the request count in mind: without a cap it raises requests for common words even though it cuts bytes.

## 8. Caveats

- Phone times and credit figures come from a model (section 1), not a device or a deployed Netlify site. Bandwidth and request counts are exact for the simulated query sets; real traffic with warm caches would cost less.
- Frequency-weighted queries use hadis counts as a proxy for what people search. There are no analytics by design.
- Shards in the simulation are built from normalised words; the real files are filed by raw spelling (two spellings of য়, ো, ...), so real fetch counts for those words are slightly higher until the generator normalises at build time.
- The quality comments on subsequence entries are a small manual sample plus the Arabic/mark classification; I did not build a relevance test set (TODO item 2).
- Scripts and raw outputs: `scratchpad/decision/adv2-work/` (`baseline.mjs`, `subseq.mjs`, `runs.c`, `sim.mjs`, `fold.mjs`, `wordlist.mjs`, `misc.mjs`, `mix.mjs`, `last.mjs`, `repro.mjs` and their `.out` files).
