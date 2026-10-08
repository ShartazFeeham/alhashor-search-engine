'use client';

import { useEffect, useMemo, useState } from 'react';
import { buildMatcher } from '../lib/matchPattern';
import { NEAR_WORDS, PROXIMITY_LIMIT } from '../lib/proximity';
import { useDigits } from '../lib/useDigits';
import Chip from '../ui/Chip';
import DidYouMean from './DidYouMean';
import ResultsListing, { DONE, IDLE, SEARCHING } from './ResultsListing';
import { searchClient } from './searchClient';
import { normalizeQuery } from './searchIndex';
import { useProximity } from './useProximity';

/*
    The listing of a search, shared by /search and /topics (a topic is a search for its name):
    "did you mean", the near-words toggle and, drawn by ResultsListing (shared with /narrators),
    the count line, the book filter with counts, the result cards and the boxed pager. The words are looked up whenever `query` changes (see
    searchIndex.js; searchClient.js runs that in a Web Worker when the browser has one), best
    matches first. The book filter and the page only slice that list; the book counts always cover
    the whole search.

    Props: `query` (the words), `book` ('all' or a book id) and `near` (a boolean) as the address
    holds them, `pageParam` (the address's page, 1-based, as text), `onChange({ book, near, page })`
    which the page turns into a new address (page 0 means the first page, otherwise the 1-based
    number), `onSuggest(corrected)` for a "did you mean" button, and `allowNear` (false hides the
    near-words toggle: /topics does not offer it).

    Two upgrades sit on top of that list:
    - "Did you mean": once the search is done, spellings worth trying are looked up when it found
      little or a word matched nothing, and shown as buttons that run the corrected search.
    - "কাছাকাছি শব্দ" (near, several words only): the best PROXIMITY_LIMIT hadis are re-ranked by
      how close the words are to each other, using their texts (see useProximity.js).
*/
export default function SearchResults({ query, book, near, pageParam, onChange, onSuggest, allowNear = true }) {
  const digits = useDigits();
  const words = useMemo(() => normalizeQuery(query), [query]);
  const matcher = useMemo(() => buildMatcher(words), [words]);

  const [tags, setTags] = useState([]);
  const [status, setStatus] = useState(words.length > 0 ? SEARCHING : IDLE);
  const [suggestions, setSuggestions] = useState([]);

  useEffect(() => {
    setTags([]);
    if (words.length === 0) {
      setStatus(IDLE);
      return undefined;
    }
    // A newer search (or leaving the page) replaces this one: the request is told to stop and its
    // answer, if one still arrives, is ignored.
    const request = searchClient.search(words);
    setStatus(SEARCHING);
    request.promise.then((found) => {
      if (found === null) return;
      setTags(found);
      setStatus(DONE);
    });
    return request.cancel;
  }, [words]);

  // Spellings to offer once the search is done (nothing while it runs or when it found plenty).
  useEffect(() => {
    setSuggestions([]);
    if (status !== DONE) return undefined;
    const request = searchClient.suggest(words, { resultCount: tags.length });
    request.promise.then((found) => {
      if (found !== null) setSuggestions(found);
    });
    return request.cancel;
  }, [status, words, tags]);

  const canNear = status === DONE && words.length >= 2 && tags.length >= 2;
  const proximity = useProximity({ tags, words, enabled: near && status === DONE });
  const ordered = proximity.ordered || tags;

  const nearNote = canNear && allowNear && (
    <div className="search-near">
      <div className="search-near-live" role="status">
        {near && proximity.status === 'working' && (
          <div className="search-indicator">
            <span>খুঁজছি...</span>
            <i />
            <small aria-hidden="true">{digits(proximity.loaded)} / {digits(proximity.total)}</small>
          </div>
        )}
        {near && proximity.status === 'done' && (
          <p className="search-near-note">
            {proximity.nearCount > 0
              ? `সব শব্দ ${digits(NEAR_WORDS)} শব্দের মধ্যে আছে এমন হাদীস: ${digits(proximity.nearCount)} টি। সেগুলো আগে দেখানো হচ্ছে।`
              : `কোনো হাদীসে সব শব্দ ${digits(NEAR_WORDS)} শব্দের মধ্যে পাওয়া যায়নি।`}
            {' '}
            {tags.length > PROXIMITY_LIMIT
              ? `মোট ${digits(tags.length)} টির মধ্যে সেরা ${digits(PROXIMITY_LIMIT)}টি ফলাফল দেখা হয়েছে।`
              : 'সবগুলো ফলাফল দেখা হয়েছে।'}
          </p>
        )}
      </div>
    </div>
  );

  return (
    <ResultsListing
      status={status}
      tags={tags}
      ordered={ordered}
      book={book}
      pageParam={pageParam}
      onChange={onChange}
      matcher={matcher}
      term={query}
      live={<DidYouMean suggestions={suggestions} onPick={onSuggest} />}
      aside={canNear && allowNear && <Chip pressed={near} onClick={() => onChange({ book, near: !near })}>কাছাকাছি শব্দ</Chip>}
      between={nearNote}
    />
  );
}
