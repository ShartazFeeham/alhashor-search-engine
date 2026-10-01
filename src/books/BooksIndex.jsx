'use client';

import Link from 'next/link';
import PageTitle from '../Helpers/PageTitle';
import { BOOKS, hadisCount } from '../lib/books';
import { bookHref } from '../lib/bookBrowse';
import { useDigits } from '../lib/useDigits';
import BookBadge from '../ui/BookBadge';
import Icon from '../ui/Icon';

// The six books to choose from, each with its colour and real hadis count.
export default function BooksIndex() {
  const digits = useDigits();
  return (
    <main className="screen books">
      <PageTitle parts={['হাদীসের বই']} />
      <header className="books-intro">
        <h1 className="h1">হাদীসের বই</h1>
        <p>একটি গ্রন্থ বেছে নিন, শুরু থেকে শেষ পর্যন্ত পড়ুন।</p>
      </header>
      <ul className="books-grid">
        {BOOKS.map((book) => (
          <li key={book.id}>
            <Link href={bookHref(book)} className="books-card" style={{ '--bk': `var(${book.colorVar})` }}>
              <BookBadge bookId={book.id} />
              <span className="books-card-text">
                <b>{book.full}</b>
                <span>{digits(hadisCount(book))} টি হাদীস</span>
              </span>
              <Icon name="cr" size={20} />
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
