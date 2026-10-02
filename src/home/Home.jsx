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
          <Link href="/topics" aria-describedby="home-topics-note"><Icon name="tag" size={20} />বিষয়ভিত্তিক হাদীস</Link>
          <Link href="/daily"><Icon name="clock" size={20} />আজকের হাদীস</Link>
          <Link href="/daily?tab=plans"><Icon name="plan" size={20} />পরিকল্পনা</Link>
          <Link href="/narrators" aria-describedby="home-narrators-note"><Icon name="user" size={20} />বর্ণনাকারী</Link>
        </div>
        <span id="home-topics-note" hidden>নামাজ, রোজা, ঈমান, আমলসহ শতাধিক বিষয়</span>
        <span id="home-narrators-note" hidden>সাহাবী ও রাবীদের নাম ধরে তাঁদের বর্ণিত হাদীস</span>
      </nav>
    </main>
  );
}
