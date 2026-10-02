'use client';

import PageTitle from '../Helpers/PageTitle';
import { bookById } from '../lib/books';
import BookHead from './BookHead';
import BookSwitcher from './BookSwitcher';

// What the pre-built page shows before the address (the page number) can be read in the browser:
// the same title, switcher and header, so the page is never blank.
export default function BookPageFallback({ bookId }) {
  const book = bookById(bookId);
  return (
    <main id="main" tabIndex={-1} className="screen books books-book" style={{ '--bk': `var(${book.colorVar})` }}>
      <PageTitle parts={[book.full, 'হাদীসের বই']} />
      <BookSwitcher bookId={bookId} />
      <BookHead book={book} />
    </main>
  );
}
