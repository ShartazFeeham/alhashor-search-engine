'use client';

import Link from 'next/link';
import { useDigits } from '../lib/useDigits';

export default function Breadcrumb({ book, number }) {
  const digits = useDigits();
  return (
    <nav className="hadis-crumbs" aria-label="পথ">
      <ol>
        <li><Link href="/">হোম</Link></li>
        <li><Link href="/books">{book.full}</Link></li>
        <li aria-current="page">হাদীস নং {digits(number)}</li>
      </ol>
    </nav>
  );
}
