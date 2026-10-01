'use client';

import Link from 'next/link';
import { BOOKS, hadisCount } from '../lib/books';
import { useDigits } from '../lib/useDigits';
import Icon from '../ui/Icon';

const TOTAL = BOOKS.reduce((sum, book) => sum + hadisCount(book), 0);

export default function Footer() {
  const digits = useDigits();
  return (
    <footer className="shell-footer">
      <div className="shell-footer-brand">
        <span className="shell-logo small"><Icon name="book" size={18} /></span>
        <div>
          <b className="lat">BoiKotha</b> <b>বইকথা</b>
          <div className="tiny">হাদীস সম্ভার</div>
        </div>
      </div>
      <div>ছয়টি প্রধান গ্রন্থ · {digits(TOTAL)} হাদীস · শুধু বাংলা পাঠ · বিনামূল্যে</div>
      <nav className="shell-footer-links" aria-label="ফুটার মেনু">
        <Link href="/">হোম</Link>
        <Link href="/search">সার্চ</Link>
        <Link href="/books">হাদীস বই</Link>
        <Link href="/topics">বিষয়ভিত্তিক হাদীস</Link>
        <Link href="/daily">আজকের হাদীস</Link>
      </nav>
    </footer>
  );
}
