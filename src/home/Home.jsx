'use client';

import Link from 'next/link';
import PageTitle from '../Helpers/PageTitle';
import HomeDailyCard from '../daily/HomeDailyCard';
import HomeAchievements from './HomeAchievements';
import HomeNarrators from './HomeNarrators';
import HomeTopPicks from './HomeTopPicks';
import { BOOKS, hadisCount } from '../lib/books';
import { bookHref } from '../lib/bookBrowse';
import { TOP_PICKS_TAGLINE } from '../lib/topPicks';
import { useDigits } from '../lib/useDigits';
import Icon from '../ui/Icon';
import QuickIcon from './QuickIcon';

const MOST = Math.max(...BOOKS.map(hadisCount));

// Spine heights follow the real hadis counts, between 140 and 180 px.
const spineHeight = (book) => Math.round(140 + (hadisCount(book) / MOST) * 40);

// The new-features cards: a title and one plain line saying what the page is.
const QUICK = [
  { id: 'top-picks', href: '/top-picks', icon: 'heart', title: 'জনপ্রিয় হাদীস', note: TOP_PICKS_TAGLINE },
  { id: 'narrators', href: '/narrators', icon: 'speaker', title: 'বর্ণনাকারীভিত্তিক', note: 'বর্ণনাকারী ধরে তাঁর হাদীস দেখুন' },
  { id: 'topics', href: '/topics', icon: 'tag', title: 'বিষয়ভিত্তিক', note: 'বিষয় ধরে হাদীস খুঁজুন' },
  { id: 'daily', href: '/daily', icon: 'clock', title: 'ডেইলি হাদীস', note: 'প্রতিদিন একটি নির্বাচিত হাদীস' },
];

export default function Home() {
  const digits = useDigits();
  return (
    <main id="main" tabIndex={-1} className="screen home">
      <PageTitle />
      <section className="home-hero" aria-labelledby="home-title">
        <div className="home-hero-box">
          <p className="home-eyebrow">আসসালামু আলাইকুম</p>
          <h1 className="h1" id="home-title">হাদীস সম্ভার</h1>
          <Link href="/search" className="home-search">
            <Icon name="search" size={24} />
            <span>হাদীস খুঁজুন: শব্দ, বিষয় বা হাদীস নম্বর</span>
            <span className="home-search-go" aria-hidden="true"><Icon name="search" size={22} /></span>
          </Link>
        </div>
        <HomeDailyCard />
      </section>

      <HomeTopPicks />

      <nav className="home-quick" aria-label="নতুন সুবিধা">
        <div className="home-quick-links">
          {QUICK.map(({ id, href, icon, title, note }) => (
            <Link key={id} href={href} aria-labelledby={`home-${id}-t`} aria-describedby={`home-${id}-n`}>
              <QuickIcon kind={icon} size={26} />
              <span className="home-quick-text">
                <b id={`home-${id}-t`}>{title}</b>
                <span className="home-quick-note" id={`home-${id}-n`}>{note}</span>
              </span>
            </Link>
          ))}
        </div>
      </nav>

      <section className="home-shelf-wrap" aria-labelledby="home-shelf-title">
        <div className="home-shelf-head">
          <h2 className="h2" id="home-shelf-title">হাদীসের বই</h2>
          <span className="tiny">কিতাব বেছে নিন</span>
        </div>
        <div className="home-shelf">
          {BOOKS.map((book) => (
            <Link
              key={book.id}
              href={bookHref(book)}
              className="home-spine"
              style={{ '--bk': `var(${book.colorVar})`, height: spineHeight(book) }}
              aria-label={`${book.full}, ${digits(hadisCount(book))} হাদীস`}
            >
              <span className="home-spine-name">
                <span className="home-spine-kind">{book.cite.split(' ')[0]}</span>
                <span>{book.name}</span>
              </span>
              <span className="home-spine-count">{digits(hadisCount(book))}</span>
            </Link>
          ))}
        </div>
        <div className="home-plank" />
      </section>

      <HomeAchievements />

      <HomeNarrators />
    </main>
  );
}
