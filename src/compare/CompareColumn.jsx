'use client';

import Link from 'next/link';
import { Fragment } from 'react';
import { toSegments } from '../lib/compareDiff';
import { hadisHref } from '../lib/hadisRoute';
import { useDigits } from '../lib/useDigits';
import BookBadge from '../ui/BookBadge';
import Button from '../ui/Button';
import Icon from '../ui/Icon';

// One hadis in the comparison: the book badge and citation (a link to the hadis page), a remove
// button, the text with the words no other column has marked, and how many words matched.
// `column` is the diff for this hadis (words, total, matched), or null while there is nothing to compare.
export default function CompareColumn({ book, number, result, column, plainText, onRemove, onRetry }) {
  const digits = useDigits();
  const title = `${book.full} - হাদীস নং ${digits(number)}`;
  const headingId = `cmp-${book.id}-${number}`;

  let body;
  if (result.status === 'loading') {
    body = (
      <div className="cmp-skeleton" aria-busy="true" aria-label="লোড হচ্ছে">
        <div className="hadis-skel" style={{ width: '96%' }} />
        <div className="hadis-skel" style={{ width: '88%' }} />
        <div className="hadis-skel" style={{ width: '54%' }} />
      </div>
    );
  } else if (result.status === 'missing') {
    body = <p className="cmp-note">এই হাদীসটি পাওয়া যায়নি।</p>;
  } else if (result.status === 'error') {
    body = (
      <div className="cmp-note">
        <p>হাদীসটি আনা যায়নি। ইন্টারনেট সংযোগ দেখে আবার চেষ্টা করুন।</p>
        <Button size="sm" onClick={onRetry}>আবার চেষ্টা করুন</Button>
      </div>
    );
  } else {
    body = (
      <p className="cmp-text">
        {column
          ? toSegments(column.tokens).map((segment, index) =>
              segment.marked ? (
                <mark key={index} className="cmp-diff">{segment.text}</mark>
              ) : (
                <Fragment key={index}>{segment.text}</Fragment>
              )
            )
          : plainText}
      </p>
    );
  }

  return (
    <section className="cmp-col" style={{ '--bk': `var(${book.colorVar})` }} aria-labelledby={headingId}>
      <header className="cmp-col-head">
        <BookBadge bookId={book.id} />
        <h2 id={headingId}>
          <Link href={hadisHref(book.id, number)}>{title}</Link>
        </h2>
        <button type="button" className="cmp-remove" aria-label={`${title} তুলনা থেকে সরান`} title="তুলনা থেকে সরান" onClick={onRemove}>
          <Icon name="x" size={18} />
        </button>
      </header>
      <div className="cmp-col-body">{body}</div>
      {column && (
        <p className="cmp-count">
          {digits(column.total)} টি শব্দের মধ্যে {digits(column.matched)} টি অন্যদের সাথে মিলেছে
        </p>
      )}
    </section>
  );
}
