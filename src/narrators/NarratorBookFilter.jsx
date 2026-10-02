'use client';

import Link from 'next/link';
import { BOOKS } from '../lib/books';
import { wantPageFocus } from '../lib/pageFocus';
import { narratorHref } from '../lib/narrators';
import { useDigits } from '../lib/useDigits';

// "All" and one chip per book, each with how many of the narrator's hadis it holds. A chip is a link
// (the address holds the choice, so a filtered list can be shared); a book with none is plain, dimmed text.
export default function NarratorBookFilter({ id, perBook, selected }) {
  const digits = useDigits();
  const total = BOOKS.reduce((sum, book) => sum + perBook[book.id], 0);
  const chip = (key, book, label, count, dot) => {
    const body = (
      <>
        {dot && <span className="ui-chip-dot" style={{ background: dot }} aria-hidden="true" />}
        {label} <span className="narr-chip-n">{digits(count)}</span>
      </>
    );
    return (
      <li key={key}>
        {count === 0 ? (
          <span className="narr-chip" aria-disabled="true">{body}</span>
        ) : (
          <Link
            href={narratorHref(id, 0, book)}
            className="narr-chip"
            aria-current={selected === book ? 'true' : undefined}
            scroll={false}
            onClick={wantPageFocus}
          >
            {body}
          </Link>
        )}
      </li>
    );
  };
  return (
    <nav aria-label="বই অনুযায়ী ছাঁকুন">
      <ul className="narr-chips">
        {chip('all', 'all', 'সব', total)}
        {BOOKS.map((book) => chip(book.id, book.id, book.name, perBook[book.id], `var(${book.colorVar})`))}
      </ul>
    </nav>
  );
}
