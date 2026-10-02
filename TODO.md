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
