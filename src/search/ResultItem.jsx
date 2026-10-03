'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useId } from 'react';
import { stripChain } from '../lib/hadisCore';
import { hadisHref, parseTag } from '../lib/hadisRoute';
import { splitHadis } from '../lib/hadisText';
import { textWithCitation } from '../lib/share';
import { citationOf } from '../daily/citation';
import { hasMatch, highlightParts, makeSnippet } from '../lib/matchPattern';
import { useDigits } from '../lib/useDigits';
import { useHadisText } from '../lib/useHadisText';
import ShareButton from '../share/ShareButton';
import { useCopy } from '../share/useShare';
import BookBadge from '../ui/BookBadge';

// One search result: the book and number (a link), the text around the match with the matched
// words highlighted, and quiet actions.
//
// The book page reuses it for its list: `anchor` gives the item its id (h<number>), `marked` flags
// the hadis a jump points at, and `plain` shows the beginning of the text (number removed) with
// nothing highlighted. The daily page's earlier-days list adds `dateLabel` (a small line above the
// card's heading) and `core` (the saying only, without the number and the chain of narrators).
export default function ResultItem({ tag, matcher = null, anchor, marked = false, plain = false, dateLabel = null, core = false }) {
  const digits = useDigits();
  const copyText = useCopy();
  const router = useRouter();
  const titleId = useId();
  const { status, text } = useHadisText(tag);
  const parsed = parseTag(tag);
  if (!parsed) return null;
  const { book, number } = parsed;
  const href = hadisHref(book.id, number);

  const copy = () => copyText(textWithCitation(text, citationOf(book, number, digits)));

  // A mouse convenience: a plain click on the text or empty space opens the full hadis. Buttons and
  // links keep their own behaviour, and selecting text by dragging does not navigate.
  const openFromCard = (event) => {
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    if (event.target.closest('a, button, input, select, textarea')) return;
    if (window.getSelection?.()?.toString()) return;
    router.push(href);
  };

  let content = <div className="hadis-skel" style={{ width: '90%' }} />;
  let cut = false;
  if (status === 'missing' || status === 'error') {
    content = <p className="search-missing">এই হাদীসটি পাওয়া যায়নি।</p>;
  } else if (status === 'ok') {
    // The snippet is about the saying; when the words matched only the chain or the number
    // (a search for a narrator), it is taken from the whole text so the match is shown.
    const { chain, body } = splitHadis(text);
    const source = core ? stripChain(text).core.replace(/\s+/g, ' ').trim() : plain ? [chain, body].filter(Boolean).join(' ') : hasMatch(body, matcher) ? body : text;
    const snippet = makeSnippet(source, matcher);
    cut = snippet.cutStart || snippet.cutEnd;
    content = (
      <p className="search-text">
        {snippet.cutStart && '… '}
        {highlightParts(snippet.text, matcher).map((part, index) =>
          part.match ? <mark key={index}>{part.text}</mark> : part.text
        )}
        {snippet.cutEnd && ' …'}
      </p>
    );
  }

  return (
    // The card click is a mouse convenience only; the title link is the keyboard and screen-reader way in.
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions
    <li
      id={anchor}
      className={anchor ? 'search-item books-item' : 'search-item'}
      data-target={marked ? 'true' : undefined}
      onClick={openFromCard}
    >
      {dateLabel && <p className="search-item-date">{dateLabel}</p>}
      <div className="search-item-main">
        <div className="search-item-head">
          <BookBadge bookId={book.id} size="sm" />
          <Link href={href} id={titleId}>{book.full} - হাদীস নং {digits(number)}</Link>
        </div>
        {content}
      </div>
      <div className="search-item-actions">
        {cut && <Link href={href} aria-describedby={titleId}>সম্পূর্ণ হাদীস দেখুন...</Link>}
        {status === 'ok' && <button type="button" aria-describedby={titleId} onClick={copy}>কপি</button>}
        {status === 'ok' && <ShareButton book={book} number={number} text={text} variant="link" describedBy={titleId} />}
      </div>
    </li>
  );
}
