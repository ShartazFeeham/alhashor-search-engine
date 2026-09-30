'use client';

import { useEffect, useMemo, useState } from 'react';
import PageTitle from '../Helpers/PageTitle';
import { HADIS_PER_PAGE, lastPageOf, pageFromParam, pageSlice } from '../Helpers/paging';
import { useUrlParams } from '../Helpers/useUrlParams';
import { BOOKS } from '../lib/books';
import { buildMatcher } from '../lib/matchPattern';
import { countByBook, filterByBook } from '../lib/searchResults';
import { useDigits } from '../lib/useDigits';
import BookFilter from './BookFilter';
import Pager from './Pager';
import ResultItem from './ResultItem';
import SearchBox from './SearchBox';
import { normalizeQuery, searchTags } from './searchIndex';

const IDLE = 0;
const SEARCHING = 1;
const DONE = 2;

/*
    The address is the source of truth: /search?q=<words>&book=<id>&page=<n>
    Whenever the words in the address change (a new search, back/forward, an opened link) the
    hadis for them are looked up (see searchIndex.js), best matches first. The book filter and the
    page only slice that list; the book counts always cover the whole search.
*/
export default function SearchPage() {
  const [params, setParams] = useUrlParams();
  const digits = useDigits();
  const query = params.get('q') || '';
  const words = useMemo(() => normalizeQuery(query), [query]);
  const matcher = useMemo(() => buildMatcher(words), [words]);
  const bookParam = params.get('book');
  const book = BOOKS.some((b) => b.id === bookParam) ? bookParam : 'all';

  const [text, setText] = useState(query);
  const [tags, setTags] = useState([]);
  const [status, setStatus] = useState(words.length > 0 ? SEARCHING : IDLE);

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
    let cancelled = false; // a newer search (or leaving the page) replaces this one
    setStatus(SEARCHING);
    searchTags(words).then((found) => {
      if (cancelled) return;
      setTags(found);
      setStatus(DONE);
    });
    return () => {
      cancelled = true;
    };
  }, [words]);

  const counts = useMemo(() => countByBook(tags), [tags]);
  const visible = useMemo(() => filterByBook(tags, book), [tags, book]);
  const page = pageFromParam(params.get('page'), visible.length);

  const address = (values) => {
    const next = { q: query };
    if (values.book && values.book !== 'all') next.book = values.book;
    if (values.page) next.page = String(values.page);
    setParams(next);
  };

  function submit(event) {
    event.preventDefault();
    const q = normalizeQuery(text).join(' ');
    if (q === '') return;
    setParams({ q });
  }

  return (
    <main className="screen search">
      <PageTitle parts={[words.join(' '), 'হাদীস সার্চ']} />
      <SearchBox text={text} onText={setText} query={query} onSubmit={submit} />

      {status === SEARCHING && (
        <div className="search-indicator" role="status">
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
        <>
          <p className="search-total">
            মোট {digits(visible.length)} টি হাদিস পাওয়া গেছে
            {visible.length > 0 && (
              <>
                <br />
                <b>
                  {digits(page * HADIS_PER_PAGE + 1)} - {digits(Math.min((page + 1) * HADIS_PER_PAGE, visible.length))} পর্যন্ত দেখানো হচ্ছে
                </b>
              </>
            )}
          </p>
          <BookFilter counts={counts} selected={book} onSelect={(id) => address({ book: id })} />
          {visible.length === 0 ? (
            <p className="search-nf">এই বইয়ে কোনো হাদীস পাওয়া যায়নি। অন্য বই বেছে নিন।</p>
          ) : (
            <>
              <ol className="search-list">
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
