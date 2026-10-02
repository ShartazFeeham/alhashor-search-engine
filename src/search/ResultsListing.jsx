'use client';

import { useMemo, useRef } from 'react';
import { HADIS_PER_PAGE, lastPageOf, pageFromParam, pageSlice } from '../Helpers/paging';
import { usePageFocus } from '../lib/pageFocus';
import { countByBook, filterByBook } from '../lib/searchResults';
import { useDigits } from '../lib/useDigits';
import BookFilter from './BookFilter';
import Pager from './Pager';
import ResultItem from './ResultItem';

export const IDLE = 0;
export const SEARCHING = 1;
export const DONE = 2;

/*
    The presentational part of a listing of hadis, shared by /search, /topics (a search for the
    topic's name) and /narrators (a ready list of tags): the count line, the book filter with
    counts, the result cards and the boxed pager. The book filter and the page only slice the list;
    the book counts always cover all of `tags`.

    Props: `status` (SEARCHING shows "খুঁজছি...", DONE the list), `tags` (every hadis found, as
    BUK-1 tags), `ordered` (the same tags in the order to show; default `tags`), `book` and
    `pageParam` as the address holds them, `onChange({ book, page })` (page 0 is the first page,
    otherwise the 1-based number), `matcher` (words to highlight) or `plain` (cards with nothing highlighted) and the
    extras of a search: `live` (inside the count's live region), `aside` (at the right of the
    count line) and `between` (between the count line and the book filter).
*/
export default function ResultsListing({ status, tags, ordered = tags, book, pageParam, onChange, matcher = null, plain = false, live = null, aside = null, between = null }) {
  const digits = useDigits();
  const counts = useMemo(() => countByBook(tags), [tags]);
  const visible = useMemo(() => filterByBook(ordered, book), [ordered, book]);
  const page = pageFromParam(pageParam, visible.length);
  // After a pager click the list takes focus, so keyboard and screen-reader users land on the new page.
  const listRef = useRef(null);
  usePageFocus(page, listRef);

  return (
    <>
      {/* The count (in one live region, always on the page, so the changing state is announced to screen readers) and, at its right end, the near-words toggle. */}
      <div className="search-summary">
      <div className="search-live" role="status">
        {status === SEARCHING && (
          <div className="search-indicator">
            <span>খুঁজছি...</span>
            <i />
          </div>
        )}
        {status === DONE && tags.length === 0 && (
          <p className="search-nf">
            কোনো ফলাফল পাওয়া যায়নি। বানান পরিবর্তন করে বা অন্য শব্দ দিয়ে খুঁজুন।
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
        {live}
      </div>
      {aside}
      </div>

      {between}

      {status === DONE && tags.length > 0 && (
        <>
          <BookFilter counts={counts} selected={book} onSelect={(id) => onChange({ book: id })} />
          {visible.length === 0 ? (
            <p className="search-nf">এই বইয়ে কোনো হাদীস পাওয়া যায়নি। অন্য বই বেছে নিন।</p>
          ) : (
            <>
              <ol className="search-list" ref={listRef} tabIndex={-1} aria-label="ফলাফল">
                {pageSlice(visible, page).map((tag) => (
                  <ResultItem key={tag} tag={tag} matcher={matcher} plain={plain} />
                ))}
              </ol>
              <Pager page={page} lastPage={lastPageOf(visible.length)} onPage={(target) => onChange({ book, page: target === 0 ? 0 : target + 1 })} />
            </>
          )}
        </>
      )}
    </>
  );
}
