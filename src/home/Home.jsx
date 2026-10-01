'use client';

import Link from 'next/link';
import PageTitle from '../Helpers/PageTitle';
import { BOOKS, hadisCount } from '../lib/books';
import { bookHref } from '../lib/bookBrowse';
import { useDigits } from '../lib/useDigits';
import Icon from '../ui/Icon';

const TOTAL = BOOKS.reduce((sum, book) => sum + hadisCount(book), 0);
const MOST = Math.max(...BOOKS.map(hadisCount));

// Spine heights follow the real hadis counts, between 140 and 180 px.
const spineHeight = (book) => Math.round(140 + (hadisCount(book) / MOST) * 40);

export default function Home() {
  const digits = useDigits();
  return (
    <main className="screen home">
      <PageTitle />
      <section className="home-hero">
        <p className="home-eyebrow">আসসালামু আলাইকুম</p>
        <h1 className="h1">হাদীস সম্ভার</h1>
        <p className="home-lead">
          বাংলায় হাদীস পড়ুন ও খুঁজুন। ছয়টি প্রধান গ্রন্থ, {digits(TOTAL)} হাদীস, সম্পূর্ণ বিনামূল্যে।
        </p>
        <Link href="/search" className="home-search">
          <Icon name="search" size={22} />
          <span>হাদীস খুঁজুন: শব্দ, বিষয় বা হাদীস নম্বর</span>
        </Link>
      </section>

      <div className="home-tiles">
        <Link href="/search" className="home-tile wide">
          <span className="home-tile-icon"><Icon name="search" size={22} /></span>
          <b>সার্চ</b>
          <span className="home-tile-text">শব্দ, বাক্য, নম্বর বা বর্ণনাকারীর নাম দিয়ে খুঁজুন</span>
        </Link>
        <Link href="/topics" className="home-tile">
          <span className="home-tile-icon"><Icon name="tag" size={22} /></span>
          <b>বিষয়ভিত্তিক হাদীস</b>
          <span className="home-tile-text">নামাজ, রোজা, ঈমান, আমলসহ শতাধিক বিষয়</span>
        </Link>
        <Link href="/books" className="home-tile">
          <span className="home-tile-icon"><Icon name="book" size={22} /></span>
          <b>হাদীসের বই</b>
          <span className="home-tile-text">{digits(BOOKS.length)}টি প্রধান গ্রন্থ, শুরু থেকে শেষ</span>
        </Link>
        <div className="home-tile soon">
          <b>আরও আসছে...</b>
          <span className="home-tile-text">নতুন সুবিধা শীঘ্রই আসছে, ইনশাআল্লাহ</span>
        </div>
      </div>

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
              <span className="home-spine-badge">{book.badge}</span>
              <span className="home-spine-name">{book.name}</span>
              <span className="home-spine-count">{digits(hadisCount(book))}</span>
            </Link>
          ))}
        </div>
        <div className="home-plank" />
      </section>
    </main>
  );
}
