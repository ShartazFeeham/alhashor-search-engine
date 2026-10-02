'use client';

import Link from 'next/link';
import { bookById } from '../lib/books';
import { hadisHref, tagOf } from '../lib/hadisRoute';
import { splitHadis } from '../lib/hadisText';
import { useDigits } from '../lib/useDigits';
import { useHadisText } from '../lib/useHadisText';
import Button from '../ui/Button';
import { citationOf } from '../daily/citation';

// One day of a plan: a real checkbox named by the day and the citation, the first lines of the
// hadis, the owner's note when there is one, and a link to the full hadis.
export default function PlanDay({ index, day, done, onToggle }) {
  const digits = useDigits();
  const book = bookById(day.book);
  const { status, text, retry } = useHadisText(tagOf(day.book, day.number));
  const id = `plan-day-${index}`;

  let excerpt;
  if (status === 'loading') {
    excerpt = (
      <div className="plan-day-skeleton" aria-busy="true" aria-label="লোড হচ্ছে">
        <div className="hadis-skel" style={{ width: '94%' }} />
        <div className="hadis-skel" style={{ width: '70%' }} />
      </div>
    );
  } else if (status === 'ok') {
    excerpt = <p className="plan-day-text">{splitHadis(text).body}</p>;
  } else if (status === 'missing') {
    excerpt = <p className="plan-day-note">এই হাদীসটি পাওয়া যায়নি।</p>;
  } else {
    excerpt = (
      <div className="plan-day-note">
        <p>হাদীসটি আনা যায়নি।</p>
        <Button size="sm" onClick={retry}>আবার চেষ্টা করুন</Button>
      </div>
    );
  }

  return (
    <li className="plan-day" data-done={done ? 'true' : undefined} style={{ '--bk': `var(${book.colorVar})` }}>
      <label className="plan-day-head" htmlFor={id}>
        <input id={id} type="checkbox" checked={done} onChange={onToggle} />
        <span className="plan-day-no">দিন {digits(index + 1)}</span>{' '}
        <span className="plan-day-cite">{citationOf(book, day.number, digits)}</span>
      </label>
      {excerpt}
      {day.note && <p className="plan-day-extra">{day.note}</p>}
      <div className="plan-day-links">
        <Link href={hadisHref(day.book, day.number)} className="plan-day-more">পুরো হাদীস</Link>
      </div>
    </li>
  );
}
