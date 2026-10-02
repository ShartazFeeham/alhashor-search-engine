'use client';

import Link from 'next/link';
import { formatDate, weekdayName } from '../lib/bnDate';
import { hadisHref, tagOf } from '../lib/hadisRoute';
import { splitHadis } from '../lib/hadisText';
import { useDigits } from '../lib/useDigits';
import { useHadisText } from '../lib/useHadisText';
import { useSettings } from '../settings/SettingsProvider';
import BookBadge from '../ui/BookBadge';
import { citationOf } from './citation';

function Excerpt({ bookId, number }) {
  const { status, text } = useHadisText(tagOf(bookId, number));
  if (status === 'loading') return <div className="hadis-skel" style={{ width: '80%' }} aria-busy="true" aria-label="লোড হচ্ছে" />;
  if (status !== 'ok') return <p className="daily-recent-text daily-muted">হাদীসটি আনা যায়নি।</p>;
  const { chain, body } = splitHadis(text);
  return <p className="daily-recent-text">{`${chain} ${body}`.trim()}</p>;
}

// The pick of each of the last seven days, newest first, each a link to its page.
export default function RecentList({ entries }) {
  const digits = useDigits();
  const { settings } = useSettings();
  return (
    <section className="daily-recent" aria-labelledby="daily-recent-title">
      <h2 className="h2" id="daily-recent-title">গত ৭ দিন</h2>
      <ol className="daily-recent-list">
        {entries.map(({ date, pick }) => (
          <li key={date.getTime()} className="daily-recent-item" style={{ '--bk': `var(${pick.book.colorVar})` }}>
            <p className="daily-recent-date">
              <time dateTime={`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`}>
                {formatDate(date, settings.digits)}
              </time>
              <span>{weekdayName(date)}</span>
            </p>
            <div className="daily-recent-head">
              <BookBadge bookId={pick.book.id} size="sm" />
              <Link href={hadisHref(pick.book.id, pick.number)}>{citationOf(pick.book, pick.number, digits)}</Link>
            </div>
            <Excerpt bookId={pick.book.id} number={pick.number} />
          </li>
        ))}
      </ol>
    </section>
  );
}
