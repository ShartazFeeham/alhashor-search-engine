'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { filterNarrators, narratorHref } from '../lib/narrators';
import { toTop } from '../lib/toTop';
import { useDigits } from '../lib/useDigits';
import Button from '../ui/Button';
import Icon from '../ui/Icon';
import BookBar from './BookBar';
import { DONE, LOADING } from './useNarrators';

// How many narrators are drawn at first, and how many more each "show more" adds, so the list of
// hundreds is never drawn all at once.
export const STEP = 50;

// The list of narrators, most hadis first: a box that narrows it, a row (a link) for each narrator.
// `index` is what useNarratorIndex returns.
export default function NarratorList({ index }) {
  const digits = useDigits();
  const [text, setText] = useState('');
  const [limit, setLimit] = useState(STEP);
  const { status, narrators, retry } = index;
  const shown = useMemo(() => filterNarrators(narrators, text), [narrators, text]);
  const filtering = text.trim() !== '';

  return (
    <>
      <label className="narr-field">
        <Icon name="search" size={18} />
        <input
          type="text"
          lang="bn"
          value={text}
          placeholder="বর্ণনাকারী খুঁজুন"
          aria-label="বর্ণনাকারী খুঁজুন"
          autoComplete="off"
          onChange={(event) => {
            setText(event.target.value);
            setLimit(STEP);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') event.preventDefault();
          }}
        />
      </label>
      {/* One live region, always on the page, so the changing state is announced to screen readers. */}
      <div className="narr-live" role="status">
        {status === LOADING && (
          <div className="narr-indicator">
            <span>খুঁজছি...</span>
            <i />
          </div>
        )}
        {status === DONE && narrators.length > 0 && (
          <p className="narr-total">
            {filtering
              ? shown.length > 0
                ? `${digits(shown.length)} জন বর্ণনাকারী পাওয়া গেছে`
                : 'কোনো বর্ণনাকারী মেলেনি। অন্য বানান লিখে দেখুন।'
              : `মোট ${digits(narrators.length)} জন বর্ণনাকারী`}
          </p>
        )}
      </div>
      {status !== LOADING && status !== DONE && (
        <div className="narr-problem">
          <p>বর্ণনাকারীদের তালিকা আনা যায়নি। ইন্টারনেট সংযোগ দেখে আবার চেষ্টা করুন।</p>
          <Button size="sm" onClick={retry}>আবার চেষ্টা করুন</Button>
        </div>
      )}
      {status === DONE && shown.length > 0 && (
        <>
          <ol className="narr-list" aria-label="বর্ণনাকারী">
            {shown.slice(0, limit).map((narrator) => (
              <li key={narrator.id}>
                <Link href={narratorHref(narrator.id)} className="narr-row" scroll={false} onClick={toTop}>
                  <span className="narr-name">{narrator.name}</span>
                  <span className="narr-count">{digits(narrator.count)} টি হাদীস</span>
                  <BookBar perBook={narrator.perBook} />
                </Link>
              </li>
            ))}
          </ol>
          {shown.length > limit && (
            <Button className="narr-more" onClick={() => setLimit((n) => n + STEP)}>
              আরও দেখান ({digits(shown.length - limit)} জন বাকি)
            </Button>
          )}
        </>
      )}
    </>
  );
}
