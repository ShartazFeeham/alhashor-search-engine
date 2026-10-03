'use client';

import Link from 'next/link';
import { useId } from 'react';
import { bookById } from '../lib/books';
import { hadisHref, tagOf } from '../lib/hadisRoute';
import { splitHadis } from '../lib/hadisText';
import { useDigits } from '../lib/useDigits';
import { useHadisText } from '../lib/useHadisText';
import BookBadge from '../ui/BookBadge';
import ShareButton from '../share/ShareButton';
import { useCopy } from '../share/useShare';
import Button from '../ui/Button';
import Icon from '../ui/Icon';

const LIMIT = 600;

// Cut at the last space before the limit so a word is never split.
function shorten(text) {
  return text.length > LIMIT ? `${text.slice(0, LIMIT).replace(/\s\S*$/, '')} ...` : null;
}

// One hadis as a card, shared by the book and topic lists: the book badge and title
// (a link to the hadis page), the text, and copy. A long text is cut with a link to the full page.
// `level` is the heading level of the title: 2 under a page title, 3 under a section heading.
export default function HadisCard({ bookId, number, level = 2 }) {
  const Heading = `h${level}`;
  const book = bookById(bookId);
  const digits = useDigits();
  const copyText = useCopy();
  const titleId = useId();
  const { status, text, retry } = useHadisText(tagOf(bookId, number));
  const href = hadisHref(bookId, number);
  const title = `${book.full} - হাদীস নং ${digits(number)}`;

  const copy = () => copyText(text);

  let body;
  let cut = null;
  if (status === 'loading') {
    body = (
      <div className="hcard-skeleton" aria-busy="true" aria-label="লোড হচ্ছে">
        <div className="hadis-skel" style={{ width: '96%' }} />
        <div className="hadis-skel" style={{ width: '88%' }} />
        <div className="hadis-skel" style={{ width: '54%' }} />
      </div>
    );
  } else if (status === 'missing') {
    body = <p className="hcard-note">এই হাদীসটি পাওয়া যায়নি।</p>;
  } else if (status === 'error') {
    body = (
      <div className="hcard-note">
        <p>হাদীসটি আনা যায়নি। ইন্টারনেট সংযোগ দেখে আবার চেষ্টা করুন।</p>
        <Button size="sm" onClick={retry}>আবার চেষ্টা করুন</Button>
      </div>
    );
  } else {
    const { chain, body: saying } = splitHadis(text);
    const whole = `${chain} ${saying}`.trim();
    cut = shorten(whole);
    body = <p className="hcard-text">{cut ?? whole}</p>;
  }

  return (
    <article className="hcard" style={{ '--bk': `var(${book.colorVar})` }}>
      <header className="hcard-head">
        <BookBadge bookId={bookId} />
        <Heading><Link href={href} id={titleId}>{title}</Link></Heading>
      </header>
      <div className="hcard-body">
        {body}
        {cut && <Link href={href} className="hcard-more" aria-describedby={titleId}>সম্পূর্ণ হাদীস দেখুন...</Link>}
      </div>
      {status === 'ok' && (
        <footer className="hcard-foot">
          <button type="button" className="act-btn act-copy" aria-describedby={titleId} onClick={copy}>
            <Icon name="copy" size={16} />
            <span>কপি</span>
          </button>
          <ShareButton book={book} number={number} text={text} variant="icon" describedBy={titleId} />
        </footer>
      )}
    </article>
  );
}
