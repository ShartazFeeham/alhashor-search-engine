'use client';

import Link from 'next/link';
import { bookById } from '../lib/books';
import { hadisHref, tagOf } from '../lib/hadisRoute';
import { splitHadis } from '../lib/hadisText';
import { useDigits } from '../lib/useDigits';
import { useHadisText } from '../lib/useHadisText';
import Button from '../ui/Button';
import Icon from '../ui/Icon';
import { citationOf } from '../daily/citation';

// One day of a plan: a real checkbox named by the number and the citation, the first three lines
// of the hadis (justified) with the "পুরো হাদীস" link inline at the right end of the last line, and
// the owner's note when there is one. Two empty floats inside the text (aria-hidden) keep the right
// end of line 3 free for the link, which sits over that slot in the same grid cell (the same
// technique as the home daily card's "আরও দেখুন").
export default function PlanDay({ index, day, done, onToggle }) {
  const digits = useDigits();
  const book = bookById(day.book);
  const { status, text, retry } = useHadisText(tagOf(day.book, day.number));
  const id = `plan-day-${index}`;
  const href = hadisHref(day.book, day.number);
  const fullLink = (
    <Link href={href} className="plan-day-more">
      পুরো হাদীস <Icon name="cr" size={16} />
    </Link>
  );

  let excerpt;
  if (status === 'loading') {
    excerpt = (
      <div className="plan-day-skeleton" aria-busy="true" aria-label="লোড হচ্ছে">
        <div className="hadis-skel" style={{ width: '94%' }} />
        <div className="hadis-skel" style={{ width: '70%' }} />
      </div>
    );
  } else if (status === 'ok') {
    excerpt = (
      <div className="plan-day-body">
        <p className="plan-day-text">
          <span className="plan-day-flow">
            <span className="plan-day-lead" aria-hidden="true" />
            <span className="plan-day-slot" aria-hidden="true" />
            {splitHadis(text).body}
          </span>
        </p>
        {fullLink}
      </div>
    );
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
        <span className="plan-day-no" data-testid="plan-day-no">{digits(index + 1)}</span>{' '}
        <span className="plan-day-cite">{citationOf(book, day.number, digits)}</span>
      </label>
      {excerpt}
      {day.note && <p className="plan-day-extra">{day.note}</p>}
      {status !== 'ok' && (
        <div className="plan-day-links">
          <Link href={href} className="plan-day-more-solo">পুরো হাদীস</Link>
        </div>
      )}
    </li>
  );
}
