# Core Improvements

Improvements to the core search-and-display path only.

## Search correctness

- **Empty-input check:** `userText.lengh` in `src/Search/Search.js` is a typo, so the empty-input guard never fires. An empty search still runs and leaves `searching` and `found` stuck. It should check `.length`, trim the input, and return cleanly.
- **Per-word result updates:** results are computed and pushed to state inside the per-word loop, so the UI updates once per word. Merge all words first, then set state once.
- **`results` map:** it is a plain `Map` recreated on every render, and the sort override is redefined each loop. Build it locally in `scan` and sort once at the end.
- **Dead code:** `value = value + 1` does nothing.
- **Lookup failures:** a missing shard file (`fetch` returns a 404 page, and `.json()` throws) or a missing parent entry (`parTagArray` is `undefined`) crashes the whole search. Handle these per word.
- **Tag/search matching:** a query whose first two characters have no shard file breaks the same way. That includes one-character words and mixed scripts.

## Ranking and matching

- **Ranking:** it only counts matched words, so long and short hadis rank the same. Weight exact word matches above substring matches, and boost hadis where the words appear close together.
- **Query words:** the "fewer than 8 words" cutoff drops substring matching for longer queries. Instead, skip only very common words.
- **Input normalization:** it doesn't handle Bengali variants such as different forms of ও/য়/ড়, or zero-width characters. Both sides should be normalized.

## Search speed

- **Sequential fetching:** shards for each word and its parent words are fetched one at a time with `await`. Fetch them in parallel with `Promise.all`.
- **Shard caching:** a shard is re-fetched and re-parsed on every search. Cache parsed shards in memory.
- **Lookup cost:** `new Map(Object.entries(data))` copies a whole shard to read one key. Use `data[word]`.

## Hadis display

- **Fetch loop in `src/Helpers/HadisView.js`:** `getHadisText()` runs during render, so the fetch repeats on every render. Move it to a `useEffect` keyed on `props.tag`.
- **Stale text:** `setToShow` reads `hadisText` right after `setHadisText(data)`, so it uses the old value. Use `data`.
- **Shared `limit`:** it is a module-level variable, so expanding one hadis changes truncation for every card. Make it per-card state.
- **Repeated path building:** the book-name lookup and URL building are duplicated in `getHadisText` and `copyHadis`. Extract one helper.
- **Pagination:** `NextPrev` slices from `allResults`, so check that paging never leaves stale cards from the previous page.
- **Keys:** the result cards and `Highlight` words are rendered without `key` props.

## Navigation that breaks searching

- **History spam in `src/App.js`:** `pushState` runs five times on every render, which breaks the back button.
- **URL state:** search state lives in component state only, so a refresh or back navigation loses the results. Put the query and page in the URL.

## Suggested first steps

1. Fix the fetch loop in `HadisView`.
2. Fix the `lengh` typo.
3. Fetch shards in parallel and cache them.
