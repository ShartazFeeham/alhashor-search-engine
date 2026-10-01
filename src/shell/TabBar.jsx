'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import Icon from '../ui/Icon';
import { activeSection } from './activeTab';

// The phone's bottom bar: Home, Books, a raised Search, Topics, and More (which holds settings).
export default function TabBar() {
  const current = activeSection(usePathname());
  const [moreOpen, setMoreOpen] = useState(false);
  const tab = (id, href, icon, label) => (
    <Link href={href} aria-current={current === id ? 'page' : undefined} onClick={() => setMoreOpen(false)}>
      <Icon name={icon} size={22} />
      <span>{label}</span>
    </Link>
  );
  return (
    <>
      {moreOpen && (
        <div className="shell-more">
          <Link href="/daily" onClick={() => setMoreOpen(false)}>
            <Icon name="clock" size={20} />
            আজকের হাদীস
          </Link>
          <Link href="/daily?tab=plans" onClick={() => setMoreOpen(false)}>
            <Icon name="plan" size={20} />
            পরিকল্পনা
          </Link>
          <Link href="/daily?tab=khutbah" onClick={() => setMoreOpen(false)}>
            <Icon name="print" size={20} />
            খুতবার তালিকা
          </Link>
          <Link href="/settings" onClick={() => setMoreOpen(false)}>
            <Icon name="sliders" size={20} />
            পড়ার সেটিংস
          </Link>
        </div>
      )}
      <nav className="shell-tabbar" aria-label="নিচের মেনু">
        {tab('home', '/', 'home', 'হোম')}
        {tab('books', '/books', 'book', 'বই')}
        <Link
          href="/search"
          className="mid"
          aria-label="সার্চ"
          aria-current={current === 'search' ? 'page' : undefined}
          onClick={() => setMoreOpen(false)}
        >
          <Icon name="search" size={26} />
        </Link>
        {tab('topics', '/topics', 'tag', 'বিষয়')}
        <button
          type="button"
          aria-expanded={moreOpen}
          aria-current={current === 'daily' ? 'true' : undefined}
          onClick={() => setMoreOpen((open) => !open)}>
          <Icon name="grid" size={22} />
          <span>আরও</span>
        </button>
      </nav>
    </>
  );
}
