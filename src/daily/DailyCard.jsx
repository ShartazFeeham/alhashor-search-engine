'use client';

import Link from 'next/link';
import { formatDate, weekdayName } from '../lib/bnDate';
import { hadisHref, tagOf } from '../lib/hadisRoute';
import { splitHadis } from '../lib/hadisText';
import { useDigits } from '../lib/useDigits';
import { useHadisText } from '../lib/useHadisText';
import { useSettings } from '../settings/SettingsProvider';
import BookBadge from '../ui/BookBadge';
import Button from '../ui/Button';
import Icon from '../ui/Icon';
import { useToast } from '../ui/Toast';
import { citationOf } from './citation';

// The hadis of the day as a larger, calm card: the date, book badge and citation, the whole text
// (these hadis are short), and copy and the full page.
export default function DailyCard({ book, number, date }) {
  const digits = useDigits();
  const toast = useToast();
  const { settings } = useSettings();
  const { status, text, retry } = useHadisText(tagOf(book.id, number));
  const citation = citationOf(book, number, digits);

  let whole = '';
  let body;
  if (status === 'loading') {
    body = (
      <div className="daily-skeleton" aria-busy="true" aria-label="লোড হচ্ছে">
        <div className="hadis-skel" style={{ width: '96%' }} />
        <div className="hadis-skel" style={{ width: '90%' }} />
        <div className="hadis-skel" style={{ width: '58%' }} />
      </div>
    );
  } else if (status === 'ok') {
    const parts = splitHadis(text);
    whole = `${parts.chain} ${parts.body}`.trim();
    body = <p className="daily-text">{whole}</p>;
  } else if (status === 'missing') {
    body = <p className="daily-note">এই হাদীসটি পাওয়া যায়নি।</p>;
  } else {
    body = (
      <div className="daily-note">
        <p>হাদীসটি আনা যায়নি। ইন্টারনেট সংযোগ দেখে আবার চেষ্টা করুন।</p>
        <Button size="sm" onClick={retry}>আবার চেষ্টা করুন</Button>
      </div>
    );
  }

  const copy = () => {
    Promise.resolve(navigator.clipboard?.writeText(`${whole}\n\n— ${citation}`)).then(
      () => toast('কপি করা হয়েছে'),
      () => toast('কপি করা যায়নি')
    );
  };

  return (
    <article className="daily-card" aria-labelledby="daily-card-title" style={{ '--bk': `var(${book.colorVar})` }}>
      <header className="daily-card-head">
        <BookBadge bookId={book.id} />
        <div className="daily-card-title">
          <h2 id="daily-card-title">আজকের হাদীস</h2>
          <p className="daily-date">
            <span>{formatDate(date, settings.digits)}</span> · <span>{weekdayName(date)}</span>
          </p>
        </div>
      </header>
      {body}
      <p className="daily-cite">{citation}</p>
      <div className="daily-actions">
        <Link href={hadisHref(book.id, number)} className="ui-btn primary sm">পুরো হাদীস</Link>
        {status === 'ok' && (
          <Button size="sm" onClick={copy}><Icon name="copy" size={16} />কপি</Button>
        )}
      </div>
    </article>
  );
}
