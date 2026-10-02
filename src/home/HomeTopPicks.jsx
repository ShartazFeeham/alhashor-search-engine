'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { featuredSets, randomSets, topPicksHref } from '../lib/topPicks';
import PickTile from '../topPicks/PickTile';
import Icon from '../ui/Icon';

const SHOWN = 3;
const FEATURED = featuredSets();

// টপ লিস্ট/হাদীস on the home page: three of the featured sets (FEATURED_SET_NUMBERS in
// lib/topPicks.js), titles only, each row a link to its set with a small "পড়ুন" label. The
// pre-built page and the first client render show the first three, so server and browser agree;
// right after mounting three random ones replace them (a different choice on every visit).
export default function HomeTopPicks({ sets = FEATURED }) {
  const [shown, setShown] = useState(() => sets.slice(0, SHOWN));

  useEffect(() => {
    setShown(randomSets(sets, SHOWN));
  }, [sets]);

  if (shown.length === 0) return null;
  return (
    <section className="home-picks" aria-labelledby="home-picks-title">
      <h2 className="h2" id="home-picks-title">
        <Link href={topPicksHref()}>
          টপ লিস্ট/হাদীস <Icon name="cr" size={16} />
        </Link>
      </h2>
      <ul className="home-picks-list">
        {shown.map((set) => (
          <li key={set.id}>
            <Link href={topPicksHref(set.id)} className="home-pick">
              <PickTile set={set} />
              <b className="home-pick-title">{set.title}</b>
              <span className="home-pick-go">পড়ুন</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
