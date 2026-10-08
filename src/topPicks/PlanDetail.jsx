'use client';

import Link from 'next/link';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { doneCount, isDone, percentDone } from '../lib/planProgress';
import { topPicksHref } from '../lib/topPicks';
import { useDigits } from '../lib/useDigits';
import Button from '../ui/Button';
import Icon from '../ui/Icon';
import { similarWords } from '../lib/similarWords';
import PlanDay from './PlanDay';
import ProgressBar from './ProgressBar';
import ProgressTree from './ProgressTree';
import { bandOf } from './ProgressRing';

// A counter-clockwise arrow: start again.
function ResetIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 12a8 8 0 1 0 2.4-5.7" />
      <path d="M4 4v5h5" />
    </svg>
  );
}

// The small green circle with a tick that marks a finished set.
function TickBadge() {
  return (
    <svg className="plan-detail-tick" data-testid="hero-tick" width="18" height="18" viewBox="0 0 20 20" aria-hidden="true">
      <circle cx="10" cy="10" r="10" fill="var(--progress-green)" />
      <path d="M5.6 10.4 8.7 13.5 14.4 7.3" fill="none" stroke="var(--surface)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// The top bar is 57px tall (--nav-h, ui.css): a 1px sentinel just above the hero leaves the
// viewport exactly when the hero sticks below the bar.
const NAV_H = 57;

// One set (or plan): the count, the day-by-day checklist, a progress bar pinned to the bottom of
// the screen and "start again" (with a confirm step).
export default function PlanDetail({ plan, progress, onToggle, onReset }) {
  const digits = useDigits();
  const [confirming, setConfirming] = useState(false);
  const titleTerm = similarWords(plan.title).join(' ');
  const total = plan.days.length;
  const done = doneCount(progress, plan.id, total);
  const percent = percentDone(progress, plan.id, total);
  const band = bandOf(percent);
  const sentinel = useRef(null);
  const head = useRef(null);
  const fullHeight = useRef(0);
  const [stuck, setStuck] = useState(false);

  // The hero is pinned below the top bar; once it sticks it turns compact (no description or
  // privacy note, a small tree).
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined' || !sentinel.current) return undefined;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting === stuck) {
        fullHeight.current = head.current?.offsetHeight ?? 0;
        setStuck(!entry.isIntersecting);
      }
    }, { rootMargin: `-${NAV_H}px 0px 0px 0px` });
    observer.observe(sentinel.current);
    return () => observer.disconnect();
  }, [stuck]);

  // The shrunk hero takes less room in the flow: pull the list back up by the difference, so
  // nothing under it jumps when it turns compact (and back).
  useLayoutEffect(() => {
    if (!head.current) return;
    head.current.style.marginBottom = stuck ? `${head.current.offsetHeight - fullHeight.current}px` : '';
  }, [stuck]);

  return (
    <section className="plan-detail" aria-labelledby="plan-detail-title">
      <Link href={topPicksHref()} className="plan-back">
        <Icon name="cl" size={18} />সব সেট
      </Link>
      <div ref={sentinel} className="plan-sentinel" aria-hidden="true" />
      <header ref={head} className={stuck ? 'plan-detail-head is-stuck' : 'plan-detail-head'} data-stuck={stuck ? 'true' : 'false'}>
        <div className="plan-detail-main">
          <h1 className="h2" id="plan-detail-title">{plan.title}</h1>
          {!stuck && plan.description && <p className="muted plan-detail-desc">{plan.description}</p>}
          <div className="plan-detail-count">
            <p role="status" aria-label="অগ্রগতি" aria-live="polite">
              আপনি পড়েছেন <b className="plan-detail-n" data-band={band}>{digits(done)}/{digits(total)}</b>
              {percent >= 100 && <TickBadge />}
            </p>
            {done > 0 && !confirming && (
              <button type="button" className="plan-reset" aria-label="মুছে ফেলুন" title="মুছে ফেলুন" onClick={() => setConfirming(true)}>
                <ResetIcon />
              </button>
            )}
          </div>
          <div className="hero-prog" data-testid="hero-progress" data-band={band} aria-hidden="true">
            <i style={{ width: `${percent}%` }} />
          </div>
          {confirming && (
            <div className="plan-confirm" role="alert">
              <p>এই পরিকল্পনার অগ্রগতি মুছে ফেলবেন? এটি ফেরানো যাবে না।</p>
              <div className="plan-confirm-buttons">
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => {
                    onReset(plan.id);
                    setConfirming(false);
                  }}
                >
                  হ্যাঁ, মুছে ফেলুন
                </Button>
                <Button size="sm" onClick={() => setConfirming(false)}>না, থাক</Button>
              </div>
            </div>
          )}
          {!stuck && <p className="tiny">অগ্রগতি শুধু এই ডিভাইসেই থাকে, কোনো অ্যাকাউন্ট লাগে না।</p>}
        </div>
        <div className="plan-detail-tree">
          <ProgressTree percent={percent} />
        </div>
      </header>
      <ol className="plan-days" aria-label="দিনের তালিকা">
        {plan.days.map((day, index) => (
          <PlanDay
            key={`${day.book}-${day.number}-${index}`}
            index={index}
            day={day}
            term={titleTerm}
            done={isDone(progress, plan.id, index)}
            onToggle={() => onToggle(plan.id, index)}
          />
        ))}
      </ol>
      {/* The last child of the section: sticky at the bottom of the screen while the list scrolls
          (above the phone tab bar), and in its own place under the list at the end. */}
      <div className="plan-pinned">
        <ProgressBar label={`${plan.title}: অগ্রগতি`} value={percent} />
        <span aria-hidden="true">{digits(done)}/{digits(total)}</span>
      </div>
    </section>
  );
}
