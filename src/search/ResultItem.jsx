'use client';

import Link from 'next/link';
import { hadisHref, parseTag } from '../lib/hadisRoute';
import { splitHadis } from '../lib/hadisText';
import { hasMatch, highlightParts, makeSnippet } from '../lib/matchPattern';
import { useDigits } from '../lib/useDigits';
import { useHadisText } from '../lib/useHadisText';
import BookBadge from '../ui/BookBadge';
import { useToast } from '../ui/Toast';

// One search result: the book and number (a link), the text around the match with the matched
// words highlighted, and quiet actions.
export default function ResultItem({ tag, matcher }) {
  const digits = useDigits();
  const toast = useToast();
  const { status, text } = useHadisText(tag);
  const parsed = parseTag(tag);
  if (!parsed) return null;
  const { book, number } = parsed;
  const href = hadisHref(book.id, number);

  const copy = () => {
    Promise.resolve(navigator.clipboard?.writeText(text)).then(
      () => toast('কপি করা হয়েছে'),
      () => toast('কপি করা যায়নি')
    );
  };

  let content = <div className="hadis-skel" style={{ width: '90%' }} />;
  let cut = false;
  if (status === 'missing' || status === 'error') {
    content = <p className="search-missing">এই হাদীসটি পাওয়া যায়নি।</p>;
  } else if (status === 'ok') {
    // The snippet is about the saying; when the words matched only the chain or the number
    // (a search for a narrator), it is taken from the whole text so the match is shown.
    const { body } = splitHadis(text);
    const snippet = makeSnippet(hasMatch(body, matcher) ? body : text, matcher);
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
    <li className="search-item">
      <div className="search-item-head">
        <BookBadge bookId={book.id} size="sm" />
        <Link href={href}>{book.full} - হাদীস নং {digits(number)}</Link>
      </div>
      {content}
      <div className="search-item-actions">
        {cut && <Link href={href}>সম্পূর্ণ হাদীস দেখুন...</Link>}
        {status === 'ok' && <button type="button" onClick={copy}>কপি</button>}
        <Link href={href} className="quiet">হাদীস পাতা</Link>
      </div>
    </li>
  );
}
