'use client';

import Link from 'next/link';
import { formatDate } from '../lib/bnDate';
import { hadisHref } from '../lib/hadisRoute';
import { useDigits } from '../lib/useDigits';
import { useSettings } from '../settings/SettingsProvider';
import Icon from '../ui/Icon';
import { citationOf } from './citation';
import { useHomePick } from './useHomePick';
import { useToday } from './useToday';

const MORE = (
  <>
    আরও দেখুন <Icon name="cr" size={16} />
  </>
);

function Skeleton() {
  return (
    <div aria-busy="true" aria-label="লোড হচ্ছে" className="home-daily-skeleton">
      <div className="hadis-skel" style={{ width: '94%' }} />
      <div className="hadis-skel" style={{ width: '70%' }} />
    </div>
  );
}

function Shell({ today, loading = false, children }) {
  const { settings } = useSettings();
  return (
    <section className={loading ? 'home-daily home-daily-loading' : 'home-daily'} aria-labelledby="home-daily-title">
      <div className="home-daily-top">
        <h2 id="home-daily-title">আজকের হাদীস</h2>
        {today && <span className="home-daily-date">{formatDate(today, settings.digits)}</span>}
      </div>
      {children}
    </section>
  );
}

// The card: the citation, the owner's own one-line core of the hadis (the "line" of its top-picks
// item) shown in full, however many lines it takes, with the "আরও দেখুন" link inline right after it.
// The link's ::after stretches over the card, so the whole card is that one link.
function Picked({ today, pick }) {
  const digits = useDigits();
  return (
    <Shell today={today}>
      <p className="home-daily-cite">{citationOf(pick.book, pick.number, digits)}</p>
      <p className="home-daily-text">
        <span data-testid="home-daily-text">{pick.line}</span>{' '}
        <Link href={hadisHref(pick.book.id, pick.number)} className="home-daily-more">{MORE}</Link>
      </p>
    </Shell>
  );
}

// The daily-hadis card in the home hero: today's hadis as its core line with its citation and a
// "আরও দেখুন" link to the full page. While the date loads it holds its place; a pick with no
// line, or no pick at all, gives no card.
export default function HomeDailyCard() {
  const today = useToday();
  const { status, pick } = useHomePick(today);
  if (status === 'error' || (pick && !pick.line)) return null;
  if (!pick) {
    return (
      <Shell today={today} loading>
        <Skeleton />
      </Shell>
    );
  }
  return <Picked today={today} pick={pick} />;
}
