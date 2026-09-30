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

## Also done

- **URL state:** `/search?q=<words>&page=<n>` and `/topics?topic=<name>&page=<n>`, so refresh, back and shared links work.
- **Bengali spelling:** the data writes য়, ড়, ঢ়, ো and ৌ in two spellings (and adds invisible joiners). Words are now compared by a normalized spelling and the files of every raw spelling are checked. On real data every spelling gives identical results; for example আবু হুরায়রা went from 1,852 to 5,721 hadis.
- **Ranking:** most searched words matched first, then most matched exactly. Queries of eight or more words still look inside longer words for rare words and skip only very common ones.
- **Missing data files:** the Books page lists only hadis that exist (334 Bukhari and 5 Nasa'i numbers have no file).
- **Paging:** Search and Topics share one set of paging helpers.

## Still to do

- **Proximity ranking:** boosting hadis where the searched words appear close together needs word positions. The data only lists which hadis contain a word, not where, so this would need new data.
- **Book pages in the address:** `/books/bukhari?page=3` style links. Search and Topics already do this.
- **Single-hadis pages:** a link to one hadis, for example `/hadis/buk-124`.
