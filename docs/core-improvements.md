# Core Improvements

Improvements to the core search-and-display path.

## Done

- **Empty search:** it now does nothing, instead of running and leaving the page stuck. The `lengh` typo is gone with the old code.
- **Search state:** results are set once per search, not once per word. The `results` map and the dead `value = value + 1` line are gone.
- **Lookup failures:** a missing or invalid data file means "no hadis for that word", not a crash or an endless spinner. Words named like built-in object properties (`constructor`) no longer break a search.
- **Speed:** data files are fetched in parallel and cached in memory, and a word is looked up directly instead of copying the whole file into a `Map`. On real data, searching "নামায" went from 27 requests and 6.6 MB to 4 requests and 585 KB, with identical results.
- **One shared search module:** `src/Search/searchIndex.js` replaces the search code that was duplicated in the Search and Topics pages.
- **Stale searches:** a slow earlier search or topic can no longer overwrite a newer one.
- **Search and topic states:** no spinner forever or premature "not found" note. A topic with no hadis says so.
- **Hadis display:** the fetch loop is fixed (one request per hadis), the text is used correctly after loading, each card expands independently, and copying reuses the loaded text. A missing hadis shows a message instead of a spinner.
- **Shared path helper:** the book-name and URL logic lives in `src/Helpers/hadisPath.js`, and all data paths are absolute so they work on any URL depth.
- **Keys:** result cards and words now have `key` props.
- **History:** the `pushState` calls that broke the back button are removed.

## Still to do

- **Ranking:** results are ranked only by how many searched words match. Weight exact word matches above substring matches, and boost hadis where the words appear close together.
- **Long queries:** the "fewer than eight words" cutoff drops longer-word matching for long queries. Skip only very common words instead.
- **Input normalization:** Bengali spelling variants (for example different forms of য়, ড়, ঢ়, and zero-width characters) are not normalized on either side. I hit this while writing tests: a topic typed with one form of য় didn't match the topic list's own spelling.
- **URL state:** the search query and page live only in component state, so a refresh or back navigation loses the results. Put them in the URL (`/search?q=...&page=2`).
- **Paging:** the paging logic is repeated in `Search`, `Topics`, `Books` and `NextPrev`. Unify it.
- **Data gaps:** about 330 hadis numbers in Bukhari's range have no data file. Decide whether to hide them or add a data manifest.
