'use client';

import Link from 'next/link';
import { BOOKS, hadisCount } from '../lib/books';
import { useDigits } from '../lib/useDigits';

const TOTAL = BOOKS.reduce((sum, book) => sum + hadisCount(book), 0);

export default function Footer() {
  const digits = useDigits();
  return (
    <footer className="shell-footer">
      <nav className="shell-footer-links" aria-label="ফুটার মেনু">
        <Link href="/">হোম</Link>
        <Link href="/search">সার্চ</Link>
        <Link href="/books">হাদীস বই</Link>
        <Link href="/topics">বিষয়ভিত্তিক হাদীস</Link>
        <Link href="/daily">আজকের হাদীস</Link>
        <Link href="/narrators">বর্ণনাকারী</Link>
      </nav>
      <p className="shell-footer-note"><span className="lat">Alhashor</span> · {digits(TOTAL)} হাদীস</p>
    </footer>
  );
}
