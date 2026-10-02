'use client';

import Link from 'next/link';
import HadisArticle from '../hadis/HadisArticle';
import { formatDate, weekdayName } from '../lib/bnDate';
import { hadisHref, tagOf } from '../lib/hadisRoute';
import { useHadisText } from '../lib/useHadisText';
import { useSettings } from '../settings/SettingsProvider';
import Button from '../ui/Button';

const ARTICLE_ID = 'daily-article';

// The hadis of the day, shown by the same article as the hadis page (header, reading text, actions);
// the narrator chain is left out (`coreOnly`), the full hadis page has it. Only the date line on top and the "full page" link are the day's own.
export default function DailyCard({ book, number, date }) {
  const { settings } = useSettings();
  const { status, text, retry } = useHadisText(tagOf(book.id, number));

  if (status === 'loading') {
    return (
      <div className="hadis-skeleton hadis-card" aria-busy="true" aria-label="লোড হচ্ছে">
        <div className="hadis-skel" style={{ width: '40%' }} />
        <div className="hadis-skel" style={{ width: '96%' }} />
        <div className="hadis-skel" style={{ width: '90%' }} />
        <div className="hadis-skel" style={{ width: '55%' }} />
      </div>
    );
  }
  if (status === 'missing') return <p className="daily-note hadis-card">এই হাদীসটি পাওয়া যায়নি।</p>;
  if (status !== 'ok') {
    return (
      <div className="daily-note hadis-card">
        <p>হাদীসটি আনা যায়নি। ইন্টারনেট সংযোগ দেখে আবার চেষ্টা করুন।</p>
        <Button size="sm" onClick={retry}>আবার চেষ্টা করুন</Button>
      </div>
    );
  }

  const dateLine = (
    <p className="daily-date">
      আজকের হাদীস · <span>{formatDate(date, settings.digits)}</span> · <span>{weekdayName(date)}</span>
    </p>
  );
  return (
    <HadisArticle
      id={ARTICLE_ID}
      label="আজকের হাদীস"
      headingLevel={2}
      book={book}
      number={number}
      text={text}
      coreOnly
      crumbs={dateLine}
      lead={<Link href={hadisHref(book.id, number)} className="ui-btn primary sm">পুরো হাদীস</Link>}
    />
  );
}
