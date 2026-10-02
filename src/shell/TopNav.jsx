'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCompare } from '../compare/CompareProvider';
import { compareHref } from '../lib/compareList';
import Icon from '../ui/Icon';
import { activeSection } from './activeTab';

const LINKS = [
  ['home', '/', 'হোম'],
  ['search', '/search', 'সার্চ'],
  ['books', '/books', 'হাদীস বই'],
  ['topics', '/topics', 'বিষয়ভিত্তিক হাদীস'],
  ['daily', '/daily', 'আজকের হাদীস'],
  ['compare', '/compare', 'তুলনা'],
];

export default function TopNav() {
  const current = activeSection(usePathname());
  const { ids } = useCompare();
  return (
    <header className="shell-nav">
      <div className="shell-nav-in">
        <Link href="/" className="shell-brand">
          <span className="shell-logo"><Icon name="book" size={20} /></span>
          <span>
            <b>Alhashor</b>
            <small>বইকথা · হাদীস সম্ভার</small>
          </span>
        </Link>
        <nav className="shell-links" aria-label="প্রধান মেনু">
          {LINKS.map(([id, href, label]) => (
            <Link key={id} href={id === 'compare' ? compareHref(ids) : href} aria-current={current === id ? 'page' : undefined}>
              {label}
            </Link>
          ))}
        </nav>
        <Link href="/settings" className="shell-iconbtn" aria-label="পড়ার সেটিংস" title="পড়ার সেটিংস">
          <b>Aa</b>
        </Link>
      </div>
    </header>
  );
}
