'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { normalizeBengali } from '../Helpers/bengali';
import { wantPageFocus } from '../lib/pageFocus';
import { groupTopics } from '../lib/topicBlocks';
import { toTop } from '../lib/toTop';
import { TOPICS, filterTopics, topicHref } from '../lib/topics';
import { useDigits } from '../lib/useDigits';
import Icon from '../ui/Icon';

const FOCUSABLE = 'a[href],button:not([disabled]),input,select';

// The topics menu: one row with a thin search box and the sort select, then the topics in blocks,
// one block (an h3 with the letter) for each first letter of the Bangla alphabet; each topic is a
// link to /topics?topic=<name>. It is a sidebar by default; with `overlay` it is a full-screen
// dialog (phones), closed by `onClose` (the × button, Escape) and by choosing a topic (`onPick`).
export default function TopicIndex({ topic, page = 0, sort = 'asc', book = 'all', topics = TOPICS, overlay = false, onClose, onPick }) {
  const digits = useDigits();
  const router = useRouter();
  const [text, setText] = useState('');
  const blocks = groupTopics(filterTopics(topics, text), sort);
  const count = blocks.reduce((sum, block) => sum + block.names.length, 0);
  const filtering = text.trim() !== '';
  const scrollRef = useRef(null);
  const closeRef = useRef(null);

  // A topic opened from a link can sit far down the menu: bring it into view, centred, when it is
  // out of sight (moving the menu only, never the page, and never when it is already visible).
  useEffect(() => {
    const list = scrollRef.current;
    const chip = list?.querySelector('[aria-current="page"]');
    if (!chip) return;
    const box = list.getBoundingClientRect();
    const at = chip.getBoundingClientRect();
    if (at.top < box.top || at.bottom > box.bottom) list.scrollTop += at.top - box.top - (box.height - at.height) / 2;
  }, [topic, overlay]);

  // The overlay takes focus when it opens.
  useEffect(() => {
    if (overlay) closeRef.current?.focus();
  }, [overlay]);

  function keys(event) {
    if (event.key === 'Escape') {
      event.stopPropagation();
      onClose?.();
    } else if (event.key === 'Tab') {
      // Keep Tab inside the dialog.
      const items = [...event.currentTarget.querySelectorAll(FOCUSABLE)];
      const at = items.indexOf(document.activeElement);
      if (event.shiftKey && at <= 0) {
        event.preventDefault();
        items[items.length - 1]?.focus();
      } else if (!event.shiftKey && at === items.length - 1) {
        event.preventDefault();
        items[0]?.focus();
      }
    }
  }

  const pick = (event) => {
    if (overlay) toTop();
    else wantPageFocus();
    onPick?.(event);
  };

  const body = (
    <>
      {overlay && (
        <div className="topics-menu-head">
          <h2 className="h3" id="topics-menu-title">বিষয়সূচি</h2>
          <button type="button" className="topics-menu-close" aria-label="বন্ধ করুন" onClick={onClose} ref={closeRef}>
            <span aria-hidden="true">×</span>
          </button>
        </div>
      )}
      {!overlay && <h2 className="sr-only">বিষয়সূচি</h2>}
      <div className="topics-menu-row">
        <label className="topics-field">
          <Icon name="search" size={16} />
          <input
            type="text"
            lang="bn"
            value={text}
            placeholder="বিষয় খুঁজুন"
            aria-label="বিষয় খুঁজুন"
            autoComplete="off"
            onChange={(event) => setText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') event.preventDefault();
            }}
          />
        </label>
        <select
          className="topics-sort"
          aria-label="সাজান"
          value={sort === 'desc' ? 'desc' : 'asc'}
          onChange={(event) => router.replace(topicHref(topic, page, event.target.value, book), { scroll: false })}
        >
          <option value="asc">আরোহী (ক → হ)</option>
          <option value="desc">অবরোহী (হ → ক)</option>
        </select>
      </div>
      <p className={filtering && count === 0 ? 'topics-filter-none' : 'sr-only'} role="status">
        {filtering && (count > 0 ? `${digits(count)}টি বিষয় পাওয়া গেছে` : 'কোনো বিষয় পাওয়া যায়নি')}
      </p>
      <div className="topics-scroll" ref={scrollRef}>
        {blocks.map(({ letter, names }) => (
          <section key={letter} className="topics-block" aria-labelledby={`topics-letter-${letter}`}>
            <h3 className="topics-letter" id={`topics-letter-${letter}`}>{letter}</h3>
            <ul className="topics-chips">
              {names.map((name) => (
                <li key={name}>
                  <Link
                    href={topicHref(name, 0, sort)}
                    className="topics-chip"
                    aria-current={normalizeBengali(name) === normalizeBengali(topic) ? 'page' : undefined}
                    scroll={false}
                    onClick={pick}
                  >
                    {name}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </>
  );

  if (overlay) {
    return (
      // The dialog only handles Escape and Tab for what is inside it.
      // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
      <div className="topics-menu is-overlay" role="dialog" aria-modal="true" aria-label="বিষয়সূচি" onKeyDown={keys}>
        {body}
      </div>
    );
  }
  return (
    <nav className="topics-menu" aria-label="বিষয়সূচি">
      {body}
    </nav>
  );
}
