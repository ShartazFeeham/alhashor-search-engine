'use client';

import Link from 'next/link';
import { formatDate } from '../lib/bnDate';
import { tagOf } from '../lib/hadisRoute';
import { splitHadis } from '../lib/hadisText';
import { useDigits } from '../lib/useDigits';
import { useHadisText } from '../lib/useHadisText';
import { useSettings } from '../settings/SettingsProvider';
import Icon from '../ui/Icon';
import { citationOf } from './citation';
import { useHomePick } from './useHomePick';
import { useToday } from './useToday';

const LIMIT = 170;

// Cut at the last space before the limit so a word is never split.
function excerptOf(text) {
  return text.length > LIMIT ? `${text.slice(0, LIMIT).replace(/\s\S*$/, '')} ...` : text;
}

function Excerpt({ book, number }) {
  const { status, text } = useHadisText(tagOf(book.id, number));
  if (status === 'loading') {
    return (
      <div aria-busy="true" aria-label="লোড হচ্ছে" className="home-daily-skeleton">
        <div className="hadis-skel" style={{ width: '94%' }} />
        <div className="hadis-skel" style={{ width: '70%' }} />
      </div>
    );
  }
  if (status !== 'ok') return <p className="home-daily-note">আজকের হাদীসটি আনা যায়নি। পুরো পাতায় গিয়ে দেখুন।</p>;
  const { chain, body } = splitHadis(text);
  return <p className="home-daily-text" data-testid="home-daily-text">{excerptOf(`${chain} ${body}`.trim())}</p>;
}

// The compact daily-hadis card on the home page: the start of today's hadis, its citation and a
// link to the daily page.
export default function HomeDailyCard() {
  const today = useToday();
  const digits = useDigits();
  const { settings } = useSettings();
  const { status, pick } = useHomePick(today);

  let body;
  if (status === 'error') {
    body = <p className="home-daily-note">আজকের হাদীসটি আনা যায়নি। পুরো পাতায় গিয়ে দেখুন।</p>;
  } else if (!pick) {
    body = (
      <div aria-busy="true" aria-label="লোড হচ্ছে" className="home-daily-skeleton">
        <div className="hadis-skel" style={{ width: '94%' }} />
        <div className="hadis-skel" style={{ width: '70%' }} />
      </div>
    );
  } else {
    body = <Excerpt book={pick.book} number={pick.number} />;
  }

  return (
    <section className="home-daily" aria-labelledby="home-daily-title">
      <div className="home-daily-top">
        <h2 id="home-daily-title">আজকের হাদীস</h2>
        {today && <span className="home-daily-date">{formatDate(today, settings.digits)}</span>}
      </div>
      {body}
      <div className="home-daily-foot">
        <span className="home-daily-cite">{pick ? citationOf(pick.book, pick.number, digits) : ''}</span>
        <Link href="/daily" className="ui-btn sm">
          আরও দেখুন <Icon name="cr" size={16} />
        </Link>
      </div>
    </section>
  );
}
