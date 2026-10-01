'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { bookHref, rangeGrid } from '../lib/bookBrowse';
import { useDigits } from '../lib/useDigits';
import { toTop } from './toTop';

// Every hundred numbers of the book as a button; the one the open page is in is marked, and a
// range with no hadis at all (a gap in the data) is shown but cannot be opened.
export default function RangeGrid({ book, firstNumber }) {
  const digits = useDigits();
  const ranges = rangeGrid(book);
  const grid = useRef(null);

  // The grid scrolls on its own; keep the current range in the middle of it, without moving the page.
  useEffect(() => {
    const box = grid.current;
    const current = box?.querySelector('[aria-current="true"]');
    if (current) box.scrollTop = current.offsetTop - (box.clientHeight - current.offsetHeight) / 2;
  }, [book, firstNumber]);

  return (
    <nav className="books-ranges" aria-label="পরিসর" ref={grid}>
      {ranges.map(({ from, to, page }) => {
        const label = `${digits(from)}-${digits(to)}`;
        if (page === null) return <span key={from} aria-disabled="true" title="এই পরিসরে কোনো হাদীস নেই">{label}</span>;
        const current = firstNumber >= from && firstNumber <= to;
        return (
          <Link key={from} href={bookHref(book, page)} aria-current={current ? 'true' : undefined} scroll={false} onClick={toTop}>
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
