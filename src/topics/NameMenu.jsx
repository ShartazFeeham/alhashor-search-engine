'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { wantPageFocus } from '../lib/pageFocus';
import { groupTopics } from '../lib/topicBlocks';
import { toTop } from '../lib/toTop';
import { useDigits } from '../lib/useDigits';
import Icon from '../ui/Icon';

const FOCUSABLE = 'a[href],button:not([disabled]),input,select';

// The slim button that opens the menu on a phone (it is only rendered there).
export function MenuButton({ label, onClick, buttonRef }) {
  return (
    <button type="button" className="topics-open" aria-haspopup="dialog" onClick={onClick} ref={buttonRef}>
      <Icon name="menu" size={18} />{label}
    </button>
  );
}

// The menu of /topics and /narrators: one row with a thin search box and the sort select, then the
// names in blocks, one block (an h3 with the letter) for each first letter of the Bangla alphabet;
// each name is a link. It is a sidebar by default; with `overlay` it is a full-screen dialog
// (phones), closed by `onClose` (the × button, Escape) and by choosing a name (`onPick`).
// `items` are names or objects with a name (`nameOf`, `keyOf`); `filter(items, text)` narrows them,
// `hrefOf(item)` and `sortHref(sort)` give the addresses, `isCurrent(item)` marks the chosen one
// (`current` changes when it does, to scroll it into view). `empty` shows while there is no item.
// `labels` holds the texts: title, search, none, found(count).
export default function NameMenu({
  items,
  nameOf = (item) => item,
  keyOf = (item) => item,
  filter,
  hrefOf,
  sortHref,
  isCurrent,
  current,
  sort = 'asc',
  labels,
  empty = null,
  overlay = false,
  onClose,
  onPick,
}) {
  const digits = useDigits();
  const router = useRouter();
  const [text, setText] = useState('');
  const blocks = groupTopics(filter(items, text), sort, nameOf);
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
  }, [current, overlay]);

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
          <h2 className="h3" id="topics-menu-title">{labels.title}</h2>
          <button type="button" className="topics-menu-close" aria-label="বন্ধ করুন" onClick={onClose} ref={closeRef}>
            <span aria-hidden="true">×</span>
          </button>
        </div>
      )}
      {!overlay && <h2 className="sr-only">{labels.title}</h2>}
      <div className="topics-menu-row">
        <label className="topics-field">
          <Icon name="search" size={16} />
          <input
            type="text"
            lang="bn"
            value={text}
            placeholder={labels.search}
            aria-label={labels.search}
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
          onChange={(event) => router.replace(sortHref(event.target.value), { scroll: false })}
        >
          <option value="asc">আরোহী (ক → হ)</option>
          <option value="desc">অবরোহী (হ → ক)</option>
        </select>
      </div>
      <p className={filtering && count === 0 ? 'topics-filter-none' : 'sr-only'} role="status">
        {filtering && (count > 0 ? labels.found(digits(count)) : labels.none)}
      </p>
      <div className="topics-scroll" ref={scrollRef}>
        {items.length === 0 && empty}
        {blocks.map(({ letter, names }) => (
          <section key={letter} className="topics-block" aria-labelledby={`topics-letter-${letter}`}>
            <h3 className="topics-letter" id={`topics-letter-${letter}`}>{letter}</h3>
            <ul className="topics-chips">
              {names.map((item) => (
                <li key={keyOf(item)}>
                  <Link
                    href={hrefOf(item)}
                    className="topics-chip"
                    aria-current={isCurrent(item) ? 'page' : undefined}
                    scroll={false}
                    onClick={pick}
                  >
                    {nameOf(item)}
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
      <div className="topics-menu is-overlay" role="dialog" aria-modal="true" aria-label={labels.title} onKeyDown={keys}>
        {body}
      </div>
    );
  }
  return (
    <nav className="topics-menu" aria-label={labels.title}>
      {body}
    </nav>
  );
}
