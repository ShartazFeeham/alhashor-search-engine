'use client';

import { useSearchParams } from 'next/navigation';
import { useRef } from 'react';
import PageTitle from '../Helpers/PageTitle';
import { pageFromParam } from '../Helpers/paging';
import HadisCard from '../hadis/HadisCard';
import { bookById, hadisCount } from '../lib/books';
import { hadisAnchor, pageNumbers } from '../lib/bookBrowse';
import { useDigits } from '../lib/useDigits';
import BookHead from './BookHead';
import BookPager from './BookPager';
import BookSwitcher from './BookSwitcher';
import JumpBox from './JumpBox';
import RangeGrid from './RangeGrid';
import { useScrollToHadis } from './useScrollToHadis';

/*
    One book, 20 hadis at a time: /books/<book>?page=<n>. The address is the whole state; the
    hadis of a page are worked out from the book's list of missing numbers (see bookBrowse.js).
    An address with &hadis=<number> (from the jump box or the hadis page's breadcrumb) marks that
    hadis and scrolls to it.
*/
export default function BookPage({ bookId }) {
  const book = bookById(bookId);
  const digits = useDigits();
  const total = hadisCount(book);
  const params = useSearchParams();
  const page = pageFromParam(params.get('page'), total);
  const numbers = pageNumbers(book, page);
  const pointed = Number(params.get('hadis'));
  const target = numbers.includes(pointed) ? pointed : null;
  const listRef = useRef(null);
  useScrollToHadis(target, listRef);

  return (
    <main className="screen books" style={{ '--bk': `var(${book.colorVar})` }}>
      <PageTitle parts={[book.full, 'হাদীসের বই']} />
      <BookSwitcher bookId={bookId} />
      <BookHead book={book} />
      <JumpBox key={bookId} book={book} />
      <RangeGrid book={book} firstNumber={numbers[0]} />
      <p className="books-range" aria-live="polite">হাদীস নং {digits(numbers[0])} - {digits(numbers[numbers.length - 1])}</p>
      <BookPager book={book} page={page} where="উপরে" />
      <ol className="books-list" ref={listRef}>
        {numbers.map((number) => (
          <li key={number} id={hadisAnchor(number)} className="books-item" data-target={number === target ? 'true' : undefined}>
            <HadisCard bookId={bookId} number={number} />
          </li>
        ))}
      </ol>
      <BookPager book={book} page={page} where="নিচে" />
    </main>
  );
}
