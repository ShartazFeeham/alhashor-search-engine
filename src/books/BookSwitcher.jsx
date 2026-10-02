'use client';

import Link from 'next/link';
import { BOOKS, hadisCount } from '../lib/books';
import { bookHref } from '../lib/bookBrowse';
import { useDigits } from '../lib/useDigits';
import BookBadge from '../ui/BookBadge';

// One link per book, the open one marked, to move between books without going back.
export default function BookSwitcher({ bookId }) {
  const digits = useDigits();
  return (
    <nav className="books-switch" aria-label="গ্রন্থ বাছুন">
      {BOOKS.map((book) => (
        <Link
          key={book.id}
          href={bookHref(book)}
          aria-current={book.id === bookId ? 'page' : undefined}
          style={{ '--bk': `var(${book.colorVar})` }}
        >
          <BookBadge bookId={book.id} size="sm" />
          <span className="books-switch-text">
            <span>{book.name}</span>
            <small>{digits(hadisCount(book))}</small>
          </span>
        </Link>
      ))}
    </nav>
  );
}
