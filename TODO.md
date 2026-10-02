# TODO

Search improvements. The numbering follows the original list; it had no item 3 when it was pasted here.

## First

1. **Fall back when "all words" gives nothing.** If the words together match nothing, show the hadis that match most of them, with the missing words marked. Today an unmatched word looks like no result.

2. **A relevance test set.** Write 30 to 50 real queries with the hadis you'd expect in the top 10. Run it after every search change so a tweak can't quietly make results worse. There's no analytics by design, so this is the only feedback loop.

## Medium value

4. **Bengali word endings.** Inflected forms of a word are probably still separate index entries, because there's no stemming. A small list of common endings (-ে, -ের, -কে, -ও) at index time would let one word find them all.

5. **The first-two-letters problem.** A typo in the first two letters finds the wrong file. Build a small separate word list for suggestions across all prefixes (a few hundred KB) so "did you mean" can fix those typos too.

6. **Autocomplete as you type.** Suggest the most common words starting with what was typed, from that same word list. It also teaches people the spellings that exist in the data.

7. **Better snippets.** Pick the window with the most different query words, not the first match.

## Lower priority

8. **Prefetch.** Start loading the next page's texts while the reader is on the current one, and keep recent lookups in memory.

## Talk about and work on later: the generated data files

These files in `public/json` are produced by one-time scripts, so their rules are worth discussing before we change or rely on them more. `tags/` and `substring/` are not on this list: no script in the repo builds them.

- **`related/`.** `scripts/build-related.mjs`. Pairs hadis by shared rare words (no stemming), 3 per hadis, marked "same report" or "shared words". The thresholds, the chain stripping and the label rule are all up for review. Known issue: Muslim 7245 is wrongly labelled "same report" with Tirmidhi 3044.
- **`narrators/`.** `scripts/build-narrators.mjs`, `src/lib/narratorName.js` and `src/data/narratorVariants.js`. The primary narrator is the last name before "থেকে বর্ণিত". Abu Hurayrah shows 3,606 because 16.9% of texts have no recognisable chain. "আবদুল্লাহ" alone is ambiguous, and the variants table needs your additions.
- **`short-hadis.json`.** `scripts/build-short-hadis.mjs`. The hadis of 60 words or fewer (18,409). Is 60 the right cutoff for the daily hadis?
- **`daily-picks.json`.** `scripts/build-daily-picks.mjs`. The picks come from the same function as the daily page, and `prebuild` renews them. We haven't discussed the pick rule: books take turns, with a fixed step inside each list.

## Open after the 3-letter tags shards

- **The default is 3 letters before its prerequisites.** The decision wanted the substring cap (top 50 containing words) and the word list shipped first: until then common words can fetch more files, and a typo in a word's third letter gets fewer "did you mean" suggestions (`src/search/searchIndex.golden.test.js` pins three examples). `?idx=2` goes back to the 2-letter files at any time.
- **`substring/` is still 2 letters.** Add `substringPrefix` and `?sub=` in `src/search/searchConfig.js` (the layout table has the place), a generator next to `scripts/build-index-3.mjs`, and a golden test like the one for `tags/`.
- **17 words with an invisible joiner in their first three letters** (`ইব‌ন`, `ব‍্যক্তিরা`, ...) cannot be reached through their own file (15 with 2 letters). Their other spellings are unaffected.
- **Delete `tags/`** (and its `?idx=2` path) one release after the 3-letter default has been green.
