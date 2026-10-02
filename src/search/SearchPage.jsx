'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import PageTitle from '../Helpers/PageTitle';
import { HADIS_PER_PAGE, lastPageOf, pageFromParam, pageSlice } from '../Helpers/paging';
import { useUrlParams } from '../Helpers/useUrlParams';
import { BOOKS } from '../lib/books';
import { buildMatcher } from '../lib/matchPattern';
import { usePageFocus } from '../lib/pageFocus';
import { NEAR_WORDS, PROXIMITY_LIMIT } from '../lib/proximity';
import { countByBook, filterByBook } from '../lib/searchResults';
import { useDigits } from '../lib/useDigits';
import Chip from '../ui/Chip';
import BookFilter from './BookFilter';
import DidYouMean from './DidYouMean';
import Pager from './Pager';
import ResultItem from './ResultItem';
import SearchBox from './SearchBox';
import { searchClient } from './searchClient';
import { normalizeQuery } from './searchIndex';
import { useProximity } from './useProximity';

const IDLE = 0;
const SEARCHING = 1;
const DONE = 2;

/*
    The address is the source of truth: /search?q=<words>&book=<id>&near=1&page=<n>
    Whenever the words in the address change (a new search, back/forward, an opened link) the
    hadis for them are looked up (see searchIndex.js; searchClient.js runs that in a Web Worker when
    the browser has one), best matches first. The book filter and the page only slice that list; the
    book counts always cover the whole search.

    Two upgrades sit on top of that list:
    - "Did you mean": once the search is done, spellings worth trying are looked up when it found
      little or a word matched nothing, and shown as buttons that run the corrected search.
    - "কাছাকাছি শব্দ" (near=1, several words only): the best PROXIMITY_LIMIT hadis are re-ranked by
      how close the words are to each other, using their texts (see useProximity.js).
*/
export default function SearchPage() {
  const [params, setParams] = useUrlParams();
  const digits = useDigits();
  const query = params.get('q') || '';
  const words = useMemo(() => normalizeQuery(query), [query]);
  const matcher = useMemo(() => buildMatcher(words), [words]);
  const bookParam = params.get('book');
  const book = BOOKS.some((b) => b.id === bookParam) ? bookParam : 'all';
  const near = params.get('near') === '1';

  const [text, setText] = useState(query);
  const [tags, setTags] = useState([]);
  const [status, setStatus] = useState(words.length > 0 ? SEARCHING : IDLE);
  const [suggestions, setSuggestions] = useState([]);

  // Keep the search box in step with the address.
  useEffect(() => {
    setText(query);
  }, [query]);

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

  const counts = useMemo(() => countByBook(tags), [tags]);
  const visible = useMemo(() => filterByBook(ordered, book), [ordered, book]);
  const page = pageFromParam(params.get('page'), visible.length);
  // After a pager click the list takes focus, so keyboard and screen-reader users land on the new page.
  const listRef = useRef(null);
  usePageFocus(page, listRef);

  const address = (values) => {
    const next = { q: query };
    if (values.book && values.book !== 'all') next.book = values.book;
    if (values.near ?? near) next.near = '1';
    if (values.page) next.page = String(values.page);
    setParams(next);
  };

  function submit(event) {
    event.preventDefault();
    const q = normalizeQuery(text).join(' ');
    if (q === '') return;
    setParams(near ? { q, near: '1' } : { q });
  }

  function pickSuggestion(corrected) {
    setParams(near ? { q: corrected, near: '1' } : { q: corrected });
  }

  return (
    <main id="main" tabIndex={-1} className="screen search">
      <PageTitle parts={[words.join(' '), 'হাদীস সার্চ']} />
      <h1 className="sr-only">হাদীস সার্চ</h1>
      <SearchBox text={text} onText={setText} query={query} onSubmit={submit} />

      {/* One live region, always on the page, so the changing state is announced to screen readers. */}
      <div className="search-live" role="status">
        {status === SEARCHING && (
          <div className="search-indicator">
            <span>খুঁজছি...</span>
            <i />
          </div>
        )}
        {status === DONE && tags.length === 0 && (
          <p className="search-nf">
            কেবল মাত্র বাংলা লেখায় সার্চ করুন। কোনো ফলাফল না পাওয়া গেলে বানান পরিবর্তন করে লিখুন।
          </p>
        )}
        {status === DONE && tags.length > 0 && (
          <p className="search-total">
            মোট {digits(visible.length)} টি হাদিস পাওয়া গেছে
            {visible.length > 0 && (
              <>
                <br />
                <b>
                  {digits(page * HADIS_PER_PAGE + 1)} - {digits(Math.min((page + 1) * HADIS_PER_PAGE, visible.length))} পর্যন্ত দেখানো হচ্ছে
                </b>
                <span className="sr-only">পাতা {digits(page + 1)}</span>
              </>
            )}
          </p>
        )}
        <DidYouMean suggestions={suggestions} onPick={pickSuggestion} />
      </div>

      {canNear && (
        <div className="search-near">
          <Chip pressed={near} onClick={() => address({ book, near: !near })}>কাছাকাছি শব্দ</Chip>
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
      )}

      {status === DONE && tags.length > 0 && (
        <>
          <BookFilter counts={counts} selected={book} onSelect={(id) => address({ book: id })} />
          {visible.length === 0 ? (
            <p className="search-nf">এই বইয়ে কোনো হাদীস পাওয়া যায়নি। অন্য বই বেছে নিন।</p>
          ) : (
            <>
              <ol className="search-list" ref={listRef} tabIndex={-1} aria-label="ফলাফল">
                {pageSlice(visible, page).map((tag) => (
                  <ResultItem key={tag} tag={tag} matcher={matcher} />
                ))}
              </ol>
              <Pager page={page} lastPage={lastPageOf(visible.length)} onPage={(target) => address({ book, page: target === 0 ? 0 : target + 1 })} />
            </>
          )}
        </>
      )}
    </main>
  );
}
