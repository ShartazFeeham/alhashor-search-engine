# Lead's position (written before seeing the advisors' answers)

Question: should we add a subsequence-based mapping (a typed key lists every word that contains its letters in order, weighted and tiered) next to `substring/`?

## Verdict: no, not as proposed. Build the two narrower things it was meant to give us.

1. **Subsequence is aimed at the wrong failure.** The two failures I can name from the data:
   - The user types a LONGER word than the index holds (an inflected form such as `নামাযের` when only `নামায` is indexed). `substring/` maps short -> long. A subsequence map is also short -> long. Neither helps; what helps is trying the query with its ending stripped (fold endings at lookup time).
   - The user mistypes a letter (ি/ী, ু/ূ, শ/ষ/স, ন/ণ, য/জ, য়/য). That is a substitution, and a subsequence map cannot find a substituted letter at all. Folding these equivalent letters (at index time and at lookup) fixes it directly.
   - Only a dropped letter is a true subsequence case, and a delete-neighbourhood list (edit distance 1) covers dropped, extra and swapped letters in less space.
2. **Precision falls apart on short keys.** Measured on a 272-key sample: 14.5 words per key for substring, 46 for subsequence; 2-letter keys 912 matches, 3-letter keys 111, worst `করী` 1,414. A hit list that long is noise unless it is capped, and a capped list drops the right word as often as it keeps it.
3. **It works on code points, not syllables.** Bengali letters carry vowel signs and conjuncts as separate code points. A subsequence over code points can match across vowel signs in ways no reader would call similar. If used at all it must run on aksara (syllable) units.
4. **Size and upkeep.** Roughly 3x the lists of `substring/` (about 26 MB for the same keys, my estimate, not built), and no generator for `tags/` and `substring/` exists in the repo, so any new index first needs a reproducible generator.

## What I would do instead (in this order)

| Step | What | Targets | Cost |
|---|---|---|---|
| 1 | Relevance test set (30 to 50 real queries; TODO item 2) | A way to prove any change helps | small |
| 2 | Fold equivalent letters and common endings at lookup time (and in a folded variant index) | inflections, ি/ী style typos | small |
| 3 | Small prefix-agnostic suggestion list (top words by frequency + edit-distance-1 neighbourhood) | typos in the first letters, autocomplete (TODO items 5, 6) | a few hundred KB |
| 4 | Subsequence only as a last-resort tier for "did you mean", keys of at least 4 aksaras, top 10, never for retrieving results | dropped-letter typos | optional, only if step 3 leaves a measured gap |

## Weights, if step 4 is ever built (untested proposal)

contiguity 0.35, gaps 0.20, first-letter anchor/prefix 0.20, frequency 0.15, length fit 0.10; tiers: substring (all), 1 gap (top 20), 2 gaps (top 10), cut under 0.4.

## What would change my mind

A simulated-typo experiment (corrupt real words with drops, substitutions, swaps, insertions and inflections) showing a subsequence tier finds the intended word in the top 5 clearly more often than folding plus edit distance 1, at acceptable size.

## Independent of this decision

- Shard `tags/` and `substring/` by the first 3 letters (largest `tags` file 863 KB -> 431 KB; largest `substring` file 351 KB -> 126 KB), keeping the 2-letter files, with a switch between them.
