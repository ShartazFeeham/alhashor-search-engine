'use client';

import Link from 'next/link';
import PageTitle from '../Helpers/PageTitle';
import HomeDailyCard from '../daily/HomeDailyCard';
import { BOOKS, hadisCount } from '../lib/books';
import { bookHref } from '../lib/bookBrowse';
import { useDigits } from '../lib/useDigits';
import Icon from '../ui/Icon';

const MOST = Math.max(...BOOKS.map(hadisCount));

// Spine heights follow the real hadis counts, between 140 and 180 px.
const spineHeight = (book) => Math.round(140 + (hadisCount(book) / MOST) * 40);

// The new-features cards: a title and one plain line saying what the page is.
const QUICK = [
  { id: 'topics', href: '/topics', icon: 'tag', title: 'বিষয়ভিত্তিক হাদীস', note: 'বিষয় ধরে হাদীস খুঁজুন' },
  { id: 'narrators', href: '/narrators', icon: 'user', title: 'বর্ণনাকারী', note: 'বর্ণনাকারী ধরে তাঁর হাদীস দেখুন' },
  { id: 'daily', href: '/daily', icon: 'clock', title: 'আজকের হাদীস', note: 'প্রতিদিন একটি নির্বাচিত হাদীস' },
  { id: 'plan', href: '/daily?tab=plans', icon: 'plan', title: 'পরিকল্পনা', note: 'দিনে একটি করে হাদীস, ধাপে ধাপে পড়ুন' },
];

export default function Home() {
  const digits = useDigits();
  return (
    <main id="main" tabIndex={-1} className="screen home">
      <PageTitle />
      <section className="home-hero" aria-labelledby="home-title">
        <p className="home-eyebrow">আসসালামু আলাইকুম</p>
        <h1 className="h1" id="home-title">হাদীস সম্ভার</h1>
        <HomeDailyCard />
        <Link href="/search" className="home-search">
          <Icon name="search" size={24} />
          <span>হাদীস খুঁজুন: শব্দ, বিষয় বা হাদীস নম্বর</span>
          <span className="home-search-go" aria-hidden="true">খুঁজুন</span>
        </Link>
      </section>

      <section className="home-shelf-wrap" aria-labelledby="home-shelf-title">
        <div className="home-shelf-head">
          <h2 className="h2" id="home-shelf-title">হাদীসের তাক</h2>
          <span className="tiny">গ্রন্থ বেছে নিন</span>
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
              <span className="home-spine-name">{book.name}</span>
              <span className="home-spine-count">{digits(hadisCount(book))}</span>
            </Link>
          ))}
        </div>
        <div className="home-plank" />
      </section>

      <nav className="home-quick" aria-labelledby="home-quick-title">
        <h2 className="h2" id="home-quick-title">নতুন সুবিধা</h2>
        <div className="home-quick-links">
          {QUICK.map(({ id, href, icon, title, note }) => (
            <Link key={id} href={href} aria-labelledby={`home-${id}-t`} aria-describedby={`home-${id}-n`}>
              <Icon name={icon} size={22} />
              <span className="home-quick-text">
                <b id={`home-${id}-t`}>{title}</b>
                <span className="home-quick-note" id={`home-${id}-n`}>{note}</span>
              </span>
            </Link>
          ))}
        </div>
      </nav>
    </main>
  );
}
