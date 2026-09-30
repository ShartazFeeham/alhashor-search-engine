'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { bookById } from '../lib/books';
import { hadisHref, neighbours } from '../lib/hadisRoute';
import { useDigits } from '../lib/useDigits';

const SWIPE_MIN_X = 60;
const SWIPE_MAX_Y = 40;

const isTyping = (target) =>
  target instanceof Element && (target.closest('input, textarea, select') !== null || target.isContentEditable);

// Links to the previous and next hadis of the same book. The arrow keys, and (when
// swipeTarget is "page") a horizontal swipe anywhere on the page, move between them too.
export default function PrevNext({ bookId, number, swipeTarget }) {
  const router = useRouter();
  const digits = useDigits();
  const book = bookById(bookId);
  const { prev, next } = neighbours(book, number);

  useEffect(() => {
    const go = (target) => {
      if (target !== null) router.push(hadisHref(bookId, target));
    };
    const onKey = (event) => {
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || isTyping(event.target)) return;
      if (event.key === 'ArrowRight') go(next);
      else if (event.key === 'ArrowLeft') go(prev);
    };
    window.addEventListener('keydown', onKey);

    let start = null;
    const onTouchStart = (event) => {
      const touch = event.touches[0];
      start = touch ? { x: touch.clientX, y: touch.clientY } : null;
    };
    const onTouchEnd = (event) => {
      const touch = event.changedTouches[0];
      if (!start || !touch) return;
      const dx = touch.clientX - start.x;
      const dy = touch.clientY - start.y;
      start = null;
      if (Math.abs(dx) < SWIPE_MIN_X || Math.abs(dy) > SWIPE_MAX_Y) return;
      go(dx < 0 ? next : prev);
    };
    if (swipeTarget === 'page') {
      document.addEventListener('touchstart', onTouchStart, { passive: true });
      document.addEventListener('touchend', onTouchEnd, { passive: true });
    }
    return () => {
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchend', onTouchEnd);
    };
  }, [bookId, prev, next, router, swipeTarget]);

  return (
    <nav className="hadis-pn" aria-label="আগের ও পরের হাদীস">
      {prev !== null ? (
        <Link href={hadisHref(bookId, prev)} className="prev">
          <small>‹ আগের হাদীস</small>
          <span>{book.name} {digits(prev)}</span>
        </Link>
      ) : <span />}
      {next !== null ? (
        <Link href={hadisHref(bookId, next)} className="next">
          <small>পরের হাদীস ›</small>
          <span>{book.name} {digits(next)}</span>
        </Link>
      ) : <span />}
    </nav>
  );
}
