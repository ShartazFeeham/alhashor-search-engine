'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { goldenCount } from '../lib/planProgress';
import { TOP_PICKS, topPicksHref } from '../lib/topPicks';
import { useSettings } from '../settings/SettingsProvider';
import { useDigits } from '../lib/useDigits';
import ProgressTree from '../topPicks/ProgressTree';
import { usePlanProgress } from '../topPicks/usePlanProgress';

// Where the sparkles around a shining tree appear, in percent of the picture; one more shows with every golden tree.
const SPARKS = [[12, 22], [86, 18], [6, 58], [92, 52], [30, 6], [70, 8], [18, 84], [82, 80], [48, 2], [2, 36], [97, 34], [38, 92], [62, 94], [24, 40], [76, 40], [50, 18]];

// More sparkles that join at the full level, all outside the tree's own box.
const FULL_SPARKS = [[-18, 30], [118, 28], [-24, 70], [124, 66], [20, -14], [80, -12], [30, 112], [72, 114]];

// The shine steps: one for each set that can be won, so the tree shines fully once every set is golden.
// How long a slider preview lasts after the last touch of the slider.
export const PREVIEW_MS = 5000;

export const shineOf = (count, total) => (total > 0 ? Math.min(Math.max(count, 0), total) : 0);

// অ্যাচিভমেন্ট on the home page: how many of the জনপ্রিয় হাদীস sets (the ones listed on /top-picks) the reader
// has read to 100%, so their growth tree is golden. Nothing yet: a big "শূন্য" and a grey, empty tree.
// The tree shines a step stronger for each one (--shine goes from 1/total to 1). The first render (also the
// pre-built page) shows zero; the saved progress is read right after mounting. The whole block is one link to /top-picks. The text is on the left and the tree on the right, as on the set cards.
// A slider under the tree previews a stronger (or weaker) shine for PREVIEW_MS after the last touch, then the tree
// goes back to the reader's own level; the big number and the ribbon follow the preview too, only the best-reader line keeps the real count.
export default function HomeAchievements({ sets = TOP_PICKS }) {
  const digits = useDigits();
  const { settings } = useSettings();
  const { progress } = usePlanProgress();
  const total = sets.length;
  const count = goldenCount(progress, sets);
  const own = shineOf(count, total);
  const [preview, setPreview] = useState(null);
  const timer = useRef(null);
  const level = preview ?? own;
  // every set golden: the tree glows vividly
  const full = total > 0 && level === total;
  const best = Math.max(0, total - 2);
  // a reader who has reached the record takes the line (with their own count, which may be higher)
  const leader = count > 0 && count >= best;
  // "শূন্য" and "এক" are words, the rest (and English digits) are numbers
  const say = (value) => (settings.digits === 'en' || value > 1 ? digits(value) : ['শূন্য', 'এক'][value]);

  const slide = (event) => {
    setPreview(shineOf(Number(event.target.value), total));
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setPreview(null), PREVIEW_MS);
  };
  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <section className="home-achv" aria-labelledby="home-achv-title">
      <div className="home-achv-body">
        <div className="home-achv-text">
          <h2 className="h2" id="home-achv-title">অ্যাচিভমেন্ট</h2>
          <p className="sr-only">{level === 0 ? 'আপনার কোনো গাছ এখনও সোনালি হয়নি' : `আপনার ${digits(level)}টি গাছ সোনালি হয়েছে`}</p>
          <p className={level === 0 ? 'home-achv-num home-achv-zero' : 'home-achv-num'} data-max={full ? 'true' : 'false'} aria-hidden="true">
            {full && (
              <svg className="home-achv-crown" data-testid="achv-crown" viewBox="0 0 32 22">
                <path d="M2 7 L9.5 13 L16 2.5 L22.5 13 L30 7 L27 20 H5 Z" />
                <circle cx="2" cy="6" r="2" />
                <circle cx="16" cy="2.5" r="2" />
                <circle cx="30" cy="6" r="2" />
              </svg>
            )}
            {say(level)}
          </p>
          <p className="home-achv-desc">টপ লিস্টের জনপ্রিয় হাদীস সেটগুলো নিয়মিত পড়ে অ্যাচিভমেন্ট সংগ্রহ করুন।</p>
          <p className="home-achv-best">
            আমাদের ইউজার বেসে সর্বোচ্চ অ্যাচিভমেন্ট: <b>{leader ? `আপনি (${digits(count)} টি)` : `সারতাজ ফিহাম (${digits(best)} টি)`}</b>
          </p>
          <Link href={topPicksHref()} className="home-achv-go">জনপ্রিয় তালিকা থেকে পড়ুন</Link>
        </div>
        <div className="home-achv-side">
          <div
            className="home-achv-stage"
            aria-hidden="true"
            data-testid="achv-stage"
            data-shine={level}
            data-full={full ? 'true' : 'false'}
            style={{ '--shine': total > 0 ? level / total : 0 }}
          >
            {level > 0 && (
              <>
                <span className="home-achv-halo" />
                <span className="home-achv-rays" />
                {SPARKS.slice(0, level).map(([x, y], index) => (
                  <i key={index} className="home-achv-spark" data-testid="achv-spark" style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${(index % 5) * 0.5}s` }} />
                ))}
                {full && FULL_SPARKS.map(([x, y], index) => (
                  <i key={`full-${index}`} className="home-achv-spark" data-testid="achv-spark-full" style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${(index % 4) * 0.3}s` }} />
                ))}
              </>
            )}
            {level > 0 ? <ProgressTree percent={100} /> : <ProgressTree percent={0} ghost />}
            {level > 0 && <b className="home-achv-ribbon">{say(level)}</b>}
          </div>
          <input
            type="range"
            className="home-achv-range"
            min={0}
            max={total}
            step={1}
            value={level}
            onChange={slide}
            aria-label="শাইন লেভেল দেখুন"
            aria-valuetext={`লেভেল ${digits(level)}, সর্বোচ্চ ${digits(total)}`}
          />
        </div>
      </div>
    </section>
  );
}
