'use client';

import Link from 'next/link';
import { formatDate } from '../lib/bnDate';
import { hadisHref, tagOf } from '../lib/hadisRoute';
import { splitHadis } from '../lib/hadisText';
import { useDigits } from '../lib/useDigits';
import { useHadisText } from '../lib/useHadisText';
import { useSettings } from '../settings/SettingsProvider';
import Icon from '../ui/Icon';
import { citationOf } from './citation';
import { useHomePick } from './useHomePick';
import { useToday } from './useToday';

const LIMIT = 110; // about two lines of the card

// { text, cut }: cut at the last space before the limit so a word is never split; a short text
// stays whole.
export function excerptOf(text) {
  if (text.length <= LIMIT) return { text, cut: false };
  return { text: `${text.slice(0, LIMIT).replace(/\s+\S*$/, '')}…`, cut: true };
}

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

// The excerpt (at most two lines, the whole card width) and, on its own line below it, the
// "আরও দেখুন" link. The link's ::after stretches over the card, so the whole card is that one link.
function Body({ excerpt, href }) {
  return (
    <div className="home-daily-body" data-testid="home-daily-body">
      <p className="home-daily-text">
        <span data-testid="home-daily-text">{excerpt}</span>
      </p>
      <Link href={href} className="home-daily-more">{MORE}</Link>
    </div>
  );
}

// Today's hadis once the pick is known: the citation, a short excerpt and the link to the full
// page. Nothing at all when the text cannot be had.
function Picked({ today, pick }) {
  const digits = useDigits();
  const { status, text } = useHadisText(tagOf(pick.book.id, pick.number));
  if (status === 'missing' || status === 'error') return null;
  if (status === 'loading') {
    return (
      <Shell today={today} loading>
        <Skeleton />
      </Shell>
    );
  }
  const { chain, body } = splitHadis(text);
  const { text: excerpt } = excerptOf(`${chain} ${body}`.replace(/\s+/g, ' ').trim());
  return (
    <Shell today={today}>
      <p className="home-daily-cite">{citationOf(pick.book, pick.number, digits)}</p>
      <Body excerpt={excerpt} href={hadisHref(pick.book.id, pick.number)} />
    </Shell>
  );
}

// The daily-hadis card in the home hero: a short excerpt of today's hadis with its citation and a
// "আরও দেখুন" link to the full page. While the pick loads it holds its place; if it cannot load
// there is no card at all.
export default function HomeDailyCard() {
  const today = useToday();
  const { status, pick } = useHomePick(today);
  if (status === 'error') return null;
  if (!pick) {
    return (
      <Shell today={today} loading>
        <Skeleton />
      </Shell>
    );
  }
  return <Picked today={today} pick={pick} />;
}
