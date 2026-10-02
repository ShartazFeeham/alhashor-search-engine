'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
import Icon from '../ui/Icon';
import { activeSection } from './activeTab';
import { leaveSettings, rememberReturn } from './settingsReturn';

const LINKS = [
  ['home', '/', 'হোম'],
  ['search', '/search', 'সার্চ'],
  ['books', '/books', 'হাদীস বই'],
  ['topics', '/topics', 'বিষয়ভিত্তিক হাদীস'],
  ['daily', '/daily', 'আজকের হাদীস'],
  ['top-picks', '/top-picks', 'জনপ্রিয় হাদীস'],
  ['narrators', '/narrators', 'বর্ণনাকারী'],
];

export default function TopNav() {
  const pathname = usePathname();
  const current = activeSection(pathname);
  const router = useRouter();
  const open = pathname === '/settings';
  const button = useRef(null);
  const refocus = useRef(false);

  const close = () => {
    refocus.current = true;
    leaveSettings(router);
  };
  // Escape closes the settings page like the cross does.
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape' && !event.defaultPrevented) close();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  });
  // After the cross closed the settings the same spot of the bar is the settings link again;
  // focus goes back to it.
  useEffect(() => {
    if (!open && refocus.current) {
      refocus.current = false;
      button.current?.focus();
    }
  }, [open]);
  return (
    <header className="shell-nav">
      <div className="shell-nav-in">
        <Link href="/" className="shell-brand">
          <span className="shell-logo"><Icon name="book" size={20} /></span>
          <span>
            <b>Alhashor</b>
            <small>হাদীস সম্ভার</small>
          </span>
        </Link>
        <nav className="shell-links" aria-label="প্রধান মেনু">
          {LINKS.map(([id, href, label]) => (
            <Link key={id} href={href} aria-current={current === id ? 'page' : undefined}>
              {label}
            </Link>
          ))}
        </nav>
        {open ? (
          <button type="button" ref={button} className="shell-iconbtn" aria-label="সেটিংস বন্ধ করুন" title="সেটিংস বন্ধ করুন" aria-expanded="true" onClick={close}>
            <Icon name="x" size={20} />
          </button>
        ) : (
          <Link href="/settings" ref={button} className="shell-iconbtn" aria-label="পড়ার সেটিংস" title="পড়ার সেটিংস" onClick={rememberReturn}>
            <Icon name="sliders" size={20} />
          </Link>
        )}
      </div>
    </header>
  );
}
