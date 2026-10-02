'use client';

import Link from 'next/link';
import { bookById } from '../lib/books';
import { hadisHref, tagOf } from '../lib/hadisRoute';
import { splitHadis } from '../lib/hadisText';
import { useDigits } from '../lib/useDigits';
import { useHadisText } from '../lib/useHadisText';
import { useRelated } from '../lib/useRelated';
import BookBadge from '../ui/BookBadge';

const HEADING_ID = 'related-heading';

function reasonText({ reason, words }) {
  if (reason === 'sameReport') return 'অন্য গ্রন্থেও একই বর্ণনা';
  return words.length > 0 ? `মিল রয়েছে: ${words.join(', ')}` : null;
}

function RelatedItem({ item }) {
  const book = bookById(item.book);
  const digits = useDigits();
  const { status, text } = useHadisText(tagOf(item.book, item.number));
  const reason = reasonText(item);
  const saying = status === 'ok' ? splitHadis(text).body || text : '';

  return (
    <li className="related-item" style={{ '--bk': `var(${book.colorVar})` }}>
      <BookBadge bookId={item.book} size="sm" />
      <div className="related-main">
        <Link href={hadisHref(item.book, item.number)} className="related-link">
          {book.name} {digits(item.number)}
        </Link>
        {status === 'loading' && <div className="hadis-skel related-skel" aria-hidden="true" />}
        {saying !== '' && <p className="related-text">{saying}</p>}
        {reason && <p className="related-reason">{reason}</p>}
      </div>
    </li>
  );
}

// Up to three related hadis, as a hairline-separated list. Nothing is drawn (no heading, no gap)
// while loading, when there are none, or when the lists cannot be loaded.
export default function RelatedList({ bookId, number }) {
  const { status, items } = useRelated(bookId, number);
  if (status !== 'ok' || items.length === 0) return null;

  return (
    <section className="related" aria-labelledby={HEADING_ID}>
      <h2 id={HEADING_ID}>এই বিষয়ে আরও হাদীস</h2>
      <ul>
        {items.map((item) => (
          <RelatedItem key={`${item.book}-${item.number}`} item={item} />
        ))}
      </ul>
    </section>
  );
}
