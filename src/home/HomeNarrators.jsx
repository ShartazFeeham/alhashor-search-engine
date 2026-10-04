'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import BookBar from '../narrators/BookBar';
import { DONE, useNarratorIndex } from '../narrators/useNarrators';
import { BOOKS } from '../lib/books';
import { honorific, narratorHref, NARRATORS_PATH } from '../lib/narrators';
import { compareNames } from '../lib/topicBlocks';
import { randomSets } from '../lib/topPicks';
import { useDigits } from '../lib/useDigits';

const TOP = 20;
const SHOWN = 5;

// The most-narrating narrators, in the order the narrators page lists them by default (count, ties by name).
export const topNarrators = (narrators) =>
  [...narrators].sort((a, b) => b.count - a.count || compareNames(a.name, b.name)).slice(0, TOP);

// শীর্ষ বর্ণনাকারী on the home page: five of the top twenty narrators, each row a link to the narrator's
// page (/narrators?name=<id>, the same address the narrators menu uses) with the name, the hadis count and
// the per-book bar of /narrators. The index is fetched like on that page, so the pre-built page and the first
// client render show nothing, and the random five appear once it has loaded (a different choice on every
// visit). Hovering (or touching) a segment of the bar names its book and the narrator's hadis in it; the
// rows also name every book in text, and the legend above them is the colour key; the heading, the legend and the rows all sit in one card.
export default function HomeNarrators() {
  const digits = useDigits();
  const { status, narrators } = useNarratorIndex();
  const [shown, setShown] = useState([]);
  const [tip, setTip] = useState(null);

  useEffect(() => {
    if (status === DONE) setShown(randomSets(topNarrators(narrators), SHOWN));
  }, [status, narrators]);

  if (shown.length === 0) return null;

  // the tooltip sits above the hovered segment, centred on it (kept inside the row by the css)
  const showTip = (narrator) => (book, segment) =>
    setTip(book && { id: narrator.id, text: `${book.name}: ${digits(narrator.perBook[book.id])} হাদীস`, x: segment.parentElement.offsetLeft + segment.offsetLeft + segment.offsetWidth / 2 });

  return (
    <section className="home-narr" aria-labelledby="home-narr-title">
      <div className="home-narr-card">
        <div className="home-narr-head">
          <h2 className="h2" id="home-narr-title">শীর্ষ বর্ণনাকারী</h2>
          <Link href={NARRATORS_PATH} className="home-narr-all">সব দেখুন</Link>
        </div>
        <ul className="home-narr-legend" aria-label="বইয়ের রং">
          {BOOKS.map((book) => (
            <li key={book.id}>
              <i aria-hidden="true" style={{ background: `var(${book.colorVar})` }} />
              {book.name}
            </li>
          ))}
        </ul>
        <ul className="home-narr-list">
          {shown.map((narrator) => (
            <li key={narrator.id}>
              <Link href={narratorHref(narrator.id)} className="topics-row">
                <span className="topics-row-name with-hon">
                  <span className="narr-plain">{narrator.name}</span>
                  {honorific(narrator.name) && <span className="narr-hon"> {honorific(narrator.name)}</span>}
                </span>
                <span className="topics-row-count">{digits(narrator.count)}</span>
                <BookBar
                  perBook={narrator.perBook}
                  labelOf={(book, count) => `${book.name}: ${digits(count)} হাদীস`}
                  onTip={showTip(narrator)}
                />
              </Link>
              {tip?.id === narrator.id && (
                <span className="home-narr-tip" role="tooltip" style={{ '--tip-x': `${tip.x}px` }}>{tip.text}</span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
