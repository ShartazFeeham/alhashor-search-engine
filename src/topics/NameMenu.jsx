'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { wantPageFocus } from '../lib/pageFocus';
import { groupTopics } from '../lib/topicBlocks';
import { toTop } from '../lib/toTop';
import { useDigits } from '../lib/useDigits';
import Icon from '../ui/Icon';

const SORT_OPTIONS = [
  { value: 'asc', label: 'আরোহী (ক → হ)' },
  { value: 'desc', label: 'অবরোহী (হ → ক)' },
];
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
// `labels` holds the texts: title, search, none, found(count). Optional, used by the narrators menu:
// `countOf(item)` turns each name into a row with its count at the right (formatted with the
// visitor's digits), `flat` lists the rows with no letter blocks (the items come in the order to
// show), `sortOptions` [{ value, label }] replaces the two topics sorts, and `blockSort` ('asc' or
// 'desc') orders the letter blocks when `sort` is not one of those two. The search row sticks to
// the top of the scrolling area.
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
  countOf,
  flat = false,
  sortOptions = SORT_OPTIONS,
  blockSort = sort,
  labels,
  empty = null,
  overlay = false,
  onClose,
  onPick,
}) {
  const digits = useDigits();
  const router = useRouter();
  const [text, setText] = useState('');
  const shown = filter(items, text);
  const blocks = flat ? [{ letter: '', names: shown }] : groupTopics(shown, blockSort === 'desc' ? 'desc' : 'asc', nameOf);
  const count = shown.length;
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
    const bar = list.querySelector('.topics-menu-row')?.offsetHeight ?? 0; // the sticky search row covers the top
    if (at.top < box.top + bar || at.bottom > box.bottom) list.scrollTop += at.top - box.top - (box.height - at.height) / 2;
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
      <div className="topics-scroll" ref={scrollRef}>
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
            value={sortOptions.some((option) => option.value === sort) ? sort : sortOptions[0].value}
            onChange={(event) => router.replace(sortHref(event.target.value), { scroll: false })}
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
        <p className={filtering && count === 0 ? 'topics-filter-none' : 'sr-only'} role="status">
          {filtering && (count > 0 ? labels.found(digits(count)) : labels.none)}
        </p>
        {items.length === 0 && empty}
        {blocks.map(({ letter, names }) => {
          const list = (
            <ul className={countOf ? 'topics-rows' : 'topics-chips'}>
              {names.map((item) => (
                <li key={keyOf(item)}>
                  <Link
                    href={hrefOf(item)}
                    className={countOf ? 'topics-row' : 'topics-chip'}
                    aria-current={isCurrent(item) ? 'page' : undefined}
                    scroll={false}
                    onClick={pick}
                  >
                    {countOf ? (
                      <>
                        <span className="topics-row-name">{nameOf(item)}</span>
                        <span className="topics-row-count">{digits(countOf(item))}</span>
                      </>
                    ) : (
                      nameOf(item)
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          );
          if (flat) return <div key="flat">{list}</div>;
          return (
            <section key={letter} className="topics-block" aria-labelledby={`topics-letter-${letter}`}>
              <h3 className="topics-letter" id={`topics-letter-${letter}`}>{letter}</h3>
              {list}
            </section>
          );
        })}
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
