'use client';

import { hadisCount } from '../lib/books';
import { useDigits } from '../lib/useDigits';
import BookBadge from '../ui/BookBadge';

// The coloured band at the top of a book's page: badge, name and how many hadis it holds.
export default function BookHead({ book, children }) {
  const digits = useDigits();
  return (
    <header className="books-head">
      <BookBadge bookId={book.id} />
      <div className="books-head-title">
        <h1>{book.full}</h1>
        <p>মোট {digits(hadisCount(book))} টি হাদীস</p>
      </div>
      {children}
    </header>
  );
}
