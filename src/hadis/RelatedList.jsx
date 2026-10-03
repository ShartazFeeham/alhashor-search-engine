'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { hadisHref, parseTag } from '../lib/hadisRoute';
import { splitHadis } from '../lib/hadisText';
import { buildWordMatcher, highlightParts } from '../lib/matchPattern';
import { sharedWordCount } from '../lib/similarWords';
import { useDigits } from '../lib/useDigits';
import { loadHadisText, useHadisText } from '../lib/useHadisText';
import { useSimilar } from '../lib/useSimilar';
import BookBadge from '../ui/BookBadge';

const HEADING_ID = 'related-heading';
const FIRST = 5;
const STEP = 5;

function RelatedItem({ tag, words }) {
  const { book, number } = parseTag(tag);
  const digits = useDigits();
  const router = useRouter();
  const { status, text } = useHadisText(tag);
  const href = hadisHref(book.id, number);
  const saying = status === 'ok' ? splitHadis(text).body || text : '';
  const parts = useMemo(() => highlightParts(saying, buildWordMatcher(words)), [saying, words]);
  const shared = status === 'ok' ? sharedWordCount(text, words) : 0;

  // A mouse convenience, as on the search cards: a plain click on the text or empty space opens the
  // hadis; links and buttons keep their own behaviour and a text selection does not navigate.
  const open = (event) => {
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    if (event.target.closest('a, button, input, select, textarea')) return;
    if (window.getSelection?.()?.toString()) return;
    router.push(href);
  };

  return (
    // The card click is a mouse convenience only; the title link is the keyboard and screen-reader way in.
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions
    <li className="related-item" style={{ '--bk': `var(${book.colorVar})` }} onClick={open}>
      <BookBadge bookId={book.id} size="sm" />
      <div className="related-main">
        <div className="related-head">
          <Link href={href} className="related-link">
            {book.name} {digits(number)}
          </Link>
          {shared > 0 && <span className="related-reason">{digits(shared)} টি শব্দ মিলেছে</span>}
        </div>
        {status === 'loading' && <div className="hadis-skel related-skel" aria-hidden="true" />}
        {saying !== '' && (
          <p className="related-text">
            {parts.map((part, index) => (part.match ? <strong key={index} className="related-match">{part.text}</strong> : part.text))}
          </p>
        )}
      </div>
    </li>
  );
}

// Similar hadis: a live search with the words of the whole text. The best 20 are kept and 5 are shown;
// when the end of the list comes into view a small spinner row shows and the next 5 are added, until the
// results end. (Without IntersectionObserver every kept result is shown.) Nothing is drawn (no card, no gap)
// when there are none.
export default function RelatedList({ bookId, number, text }) {
  const { status, tags, words } = useSimilar(bookId, number, text);
  const [shown, setShown] = useState({ tag: null, count: FIRST });
  const key = `${bookId}-${number}`;
  const lazy = typeof IntersectionObserver !== 'undefined';
  const count = lazy ? (shown.tag === key ? shown.count : FIRST) : tags.length;
  const more = lazy && status === 'ok' && tags.length > count;
  const end = useRef(null);

  // The other 15 are fetched in the background once the first 5 show, so the next batch is instant.
  useEffect(() => {
    if (status === 'ok') tags.slice(FIRST).forEach((tag) => loadHadisText(tag));
  }, [status, tags]);

  useEffect(() => {
    const row = end.current;
    if (!more || !row || typeof IntersectionObserver === 'undefined') return undefined;
    const watcher = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) setShown({ tag: key, count: count + STEP });
      },
      { rootMargin: '120px' }
    );
    watcher.observe(row);
    return () => watcher.disconnect();
  }, [more, count, key]);

  if (status === 'ok' && tags.length === 0) return null;
  const visible = tags.slice(0, count);

  return (
    <section className="related hadis-card" aria-labelledby={HEADING_ID}>
      <h2 id={HEADING_ID}>সদৃশ হাদীস</h2>
      {status === 'loading' && <p className="related-note" role="status">খুঁজছি...</p>}
      {status === 'error' && <p className="related-note">সদৃশ হাদীস আনা যায়নি।</p>}
      {status === 'ok' && (
        <>
          <ul>
            {visible.map((tag) => (
              <RelatedItem key={tag} tag={tag} words={words} />
            ))}
          </ul>
          {more && (
            <div className="related-loader" role="status" data-testid="related-loader" ref={end}>
              <span className="related-spinner" aria-hidden="true" />
              <span>আরও হাদীস আনছি...</span>
            </div>
          )}
        </>
      )}
    </section>
  );
}
