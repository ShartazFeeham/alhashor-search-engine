'use client';

import { useEffect, useMemo, useState } from 'react';
import PageTitle from '../Helpers/PageTitle';
import { useUrlParams } from '../Helpers/useUrlParams';
import { BOOKS } from '../lib/books';
import SearchBox from './SearchBox';
import SearchResults from './SearchResults';
import { switchParams } from './searchConfig';
import { normalizeQuery } from './searchIndex';

/*
    The address is the source of truth: /search?q=<words>&book=<id>&near=1&page=<n>
    The box and the address live here; the listing (lookup, count, filter, cards, pager, "did you
    mean", near words) is SearchResults, shared with /topics.
*/
export default function SearchPage() {
  const [params, setParams] = useUrlParams();
  const query = params.get('q') || '';
  const words = useMemo(() => normalizeQuery(query), [query]);
  const bookParam = params.get('book');
  const book = BOOKS.some((b) => b.id === bookParam) ? bookParam : 'all';
  const near = params.get('near') === '1';
  // ?idx=2|3, ?sub=2|3 and ?cap= are developer switches (searchConfig.js): they stay in the address
  // when the search changes
  const switches = switchParams(params.toString());
  const withSwitch = (next) => ({ ...next, ...switches });

  const [text, setText] = useState(query);

  // Keep the search box in step with the address.
  useEffect(() => {
    setText(query);
  }, [query]);

  const address = (values) => {
    const next = { q: query };
    if (values.book && values.book !== 'all') next.book = values.book;
    if (values.near ?? near) next.near = '1';
    if (values.page) next.page = String(values.page);
    setParams(withSwitch(next));
  };

  function submit(event) {
    event.preventDefault();
    const q = normalizeQuery(text).join(' ');
    if (q === '') return;
    setParams(withSwitch(near ? { q, near: '1' } : { q }));
  }

  function pickSuggestion(corrected) {
    setParams(withSwitch(near ? { q: corrected, near: '1' } : { q: corrected }));
  }

  return (
    <main id="main" tabIndex={-1} className="screen search">
      <PageTitle parts={[words.join(' '), 'হাদীস সার্চ']} />
      <h1 className="sr-only">হাদীস সার্চ</h1>
      <SearchBox text={text} onText={setText} query={query} onSubmit={submit} />

      <SearchResults
        query={query}
        book={book}
        near={near}
        pageParam={params.get('page')}
        onChange={address}
        onSuggest={pickSuggestion}
      />
    </main>
  );
}
