'use client';

import { bookById } from '../lib/books';
import { tagOf } from '../lib/hadisRoute';
import { splitHadis } from '../lib/hadisText';
import { useDigits } from '../lib/useDigits';
import { useHadisText } from '../lib/useHadisText';
import BookBadge from '../ui/BookBadge';
import Button from '../ui/Button';
import Icon from '../ui/Icon';
import { citationOf } from './citation';

// One hadis on the khutbah sheet: number, text and citation (all of which print), and the move
// and remove controls (screen only).
export default function KhutbahItem({ position, last, item, onMove, onRemove }) {
  const digits = useDigits();
  const book = bookById(item.bookId);
  const { status, text, retry } = useHadisText(tagOf(item.bookId, item.number));
  const citation = citationOf(book, item.number, digits);

  let body;
  if (status === 'loading') {
    body = (
      <div className="khut-skeleton" aria-busy="true" aria-label="লোড হচ্ছে">
        <div className="hadis-skel" style={{ width: '96%' }} />
        <div className="hadis-skel" style={{ width: '60%' }} />
      </div>
    );
  } else if (status === 'ok') {
    const { chain, body: saying } = splitHadis(text);
    body = <p className="khut-text">{`${chain} ${saying}`.trim()}</p>;
  } else if (status === 'missing') {
    body = <p className="khut-note">এই হাদীসটি পাওয়া যায়নি।</p>;
  } else {
    body = (
      <div className="khut-note no-print">
        <p>হাদীসটি আনা যায়নি।</p>
        <Button size="sm" onClick={retry}>আবার চেষ্টা করুন</Button>
      </div>
    );
  }

  return (
    <li className="khut-item" style={{ '--bk': `var(${book.colorVar})` }}>
      <span className="khut-no">{digits(position + 1)}।</span>
      <div className="khut-main">
        {body}
        <p className="khut-cite">
          <span className="no-print"><BookBadge bookId={item.bookId} size="sm" /></span>
          <span>{citation}</span>
        </p>
      </div>
      <div className="khut-controls no-print" role="group" aria-label={`${citation}: নিয়ন্ত্রণ`}>
        <button type="button" className="khut-icon" aria-label={`উপরে সরান: ${citation}`} disabled={position === 0} onClick={() => onMove(-1)}>
          <Icon name="up" size={18} />
        </button>
        <button type="button" className="khut-icon" aria-label={`নিচে সরান: ${citation}`} disabled={last} onClick={() => onMove(1)}>
          <span className="khut-down"><Icon name="up" size={18} /></span>
        </button>
        <button type="button" className="khut-icon" aria-label={`বাদ দিন: ${citation}`} onClick={onRemove}>
          <Icon name="x" size={18} />
        </button>
      </div>
    </li>
  );
}
