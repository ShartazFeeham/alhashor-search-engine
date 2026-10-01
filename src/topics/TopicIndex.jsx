'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { normalizeBengali } from '../Helpers/bengali';
import { TOPICS, filterTopics, topicHref } from '../lib/topics';
import { useDigits } from '../lib/useDigits';
import Icon from '../ui/Icon';

// The index of topics: a box that narrows the chips, and a chip (a link to /topics?topic=<name>)
// for each topic. The chosen topic is marked; the link next to it clears the choice.
export default function TopicIndex({ topic, topics = TOPICS }) {
  const digits = useDigits();
  const [text, setText] = useState('');
  const shown = filterTopics(topics, text);
  const filtering = text.trim() !== '';
  const listRef = useRef(null);

  // A topic opened from a link can sit far down the scrolling list: bring its chip into view
  // (moving the list only, never the page), centred, when it is out of sight.
  useEffect(() => {
    const list = listRef.current;
    const chip = list?.querySelector('[aria-current="true"]');
    if (!chip) return;
    const box = list.getBoundingClientRect();
    const at = chip.getBoundingClientRect();
    if (at.top < box.top || at.bottom > box.bottom) list.scrollTop += at.top - box.top - (box.height - at.height) / 2;
  }, [topic]);

  return (
    <section className="topics-index" aria-labelledby="topics-index-title">
      <div className="topics-index-head">
        <h2 className="h3" id="topics-index-title">বিষয়ের সূচি</h2>
        <span className="topics-small">{digits(topics.length)}টি বিষয়</span>
      </div>
      <label className="topics-field">
        <Icon name="search" size={18} />
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
      <p className="topics-filter-live" role="status">
        {filtering && (shown.length > 0 ? `${digits(shown.length)}টি বিষয় পাওয়া গেছে` : 'কোনো বিষয় মেলেনি। অন্য শব্দ লিখে দেখুন।')}
      </p>
      {shown.length > 0 && (
        <ul className="topics-chips" aria-label="বিষয়" ref={listRef}>
          {shown.map((name) => (
            <li key={name}>
              <Link
                href={topicHref(name)}
                className="topics-chip"
                aria-current={normalizeBengali(name) === normalizeBengali(topic) ? 'true' : undefined}
                scroll={false}
              >
                {name}
              </Link>
            </li>
          ))}
        </ul>
      )}
      {topic && (
        <Link href={topicHref('')} className="ui-btn ghost sm topics-clear" scroll={false}>
          বাছাই মুছুন
        </Link>
      )}
    </section>
  );
}
