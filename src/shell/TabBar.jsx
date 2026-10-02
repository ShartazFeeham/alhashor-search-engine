'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useId, useRef, useState } from 'react';
import Icon from '../ui/Icon';
import { activeSection } from './activeTab';
import { rememberReturn } from './settingsReturn';

// The phone's bottom bar: Home, Books, a raised Search, Top picks (named জনপ্রিয় হাদীস here), and More (which holds the daily
// hadis, topics, narrators and settings).
export default function TabBar() {
  const pathname = usePathname();
  const current = activeSection(pathname);
  const [moreOpen, setMoreOpen] = useState(false);
  const menuId = useId();
  const moreRef = useRef(null);
  const menuRef = useRef(null);

  // The menu closes when the page changes (a link elsewhere on the page was followed), on
  // Escape (focus goes back to the button) and when the visitor clicks or touches outside it.
  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);
  useEffect(() => {
    if (!moreOpen) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') {
        setMoreOpen(false);
        moreRef.current?.focus();
        return;
      }
      // Arrow keys, Home and End move between the menu's links (Tab works as usual).
      if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
      const links = [...(menuRef.current?.querySelectorAll('a') ?? [])];
      const at = links.indexOf(document.activeElement);
      if (at === -1) return;
      let next;
      if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = links.length - 1;
      else if (event.key === 'ArrowDown') next = (at + 1) % links.length;
      else next = (at - 1 + links.length) % links.length;
      event.preventDefault();
      links[next].focus();
    };
    const onPointer = (event) => {
      if (menuRef.current?.contains(event.target) || moreRef.current?.contains(event.target)) return;
      setMoreOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointer);
    };
  }, [moreOpen]);

  const tab = (id, href, icon, label, name) => (
    <Link href={href} aria-label={name} aria-current={current === id ? 'page' : undefined} onClick={() => setMoreOpen(false)}>
      <Icon name={icon} size={22} />
      <span>{label}</span>
    </Link>
  );
  return (
    <>
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
        {tab('top-picks', '/top-picks', 'list', 'জনপ্রিয়', 'জনপ্রিয় হাদীস')}
        <button
          type="button"
          ref={moreRef}
          aria-expanded={moreOpen}
          aria-controls={menuId}
          aria-current={current === 'daily' || current === 'topics' || current === 'narrators' ? 'true' : undefined}
          onClick={() => setMoreOpen((open) => !open)}>
          <Icon name="grid" size={22} />
          <span>আরও</span>
        </button>
      </nav>
      {moreOpen && (
        <div className="shell-more" id={menuId} ref={menuRef} aria-label="আরও মেনু" role="group">
          <Link href="/daily" onClick={() => setMoreOpen(false)}>
            <Icon name="clock" size={20} />
            আজকের হাদীস
          </Link>
          <Link href="/topics" onClick={() => setMoreOpen(false)}>
            <Icon name="tag" size={20} />
            বিষয়ভিত্তিক হাদীস
          </Link>
          <Link href="/narrators" onClick={() => setMoreOpen(false)}>
            <Icon name="user" size={20} />
            বর্ণনাকারী
          </Link>
          <Link href="/settings" onClick={() => { rememberReturn(); setMoreOpen(false); }}>
            <Icon name="sliders" size={20} />
            পড়ার সেটিংস
          </Link>
        </div>
      )}
    </>
  );
}
