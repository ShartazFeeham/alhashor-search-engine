'use client';

import Link from 'next/link';
import { useState } from 'react';
import { doneCount, isDone, percentDone } from '../lib/planProgress';
import { topPicksHref } from '../lib/topPicks';
import { useDigits } from '../lib/useDigits';
import Button from '../ui/Button';
import Icon from '../ui/Icon';
import PlanDay from './PlanDay';
import ProgressBar from './ProgressBar';

// One set (or plan): the count, the day-by-day checklist, a progress bar pinned to the bottom of
// the screen and "start again" (with a confirm step).
export default function PlanDetail({ plan, progress, onToggle, onReset }) {
  const digits = useDigits();
  const [confirming, setConfirming] = useState(false);
  const total = plan.days.length;
  const done = doneCount(progress, plan.id, total);

  return (
    <section className="plan-detail" aria-labelledby="plan-detail-title">
      <Link href={topPicksHref()} className="plan-back">
        <Icon name="cl" size={18} />সব সেট
      </Link>
      <header className="plan-detail-head">
        <h1 className="h2" id="plan-detail-title">{plan.title}</h1>
        {plan.description && <p className="muted">{plan.description}</p>}
        <div className="plan-detail-count">
          <p role="status" aria-label="অগ্রগতি" aria-live="polite">{digits(done)}/{digits(total)} দিন সম্পন্ন</p>
          {done > 0 && !confirming && (
            <Button size="sm" variant="ghost" onClick={() => setConfirming(true)}>মুছে ফেলুন</Button>
          )}
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
        <p className="tiny">অগ্রগতি শুধু এই ডিভাইসেই থাকে, কোনো অ্যাকাউন্ট লাগে না।</p>
      </header>
      <ol className="plan-days" aria-label="দিনের তালিকা">
        {plan.days.map((day, index) => (
          <PlanDay
            key={`${day.book}-${day.number}-${index}`}
            index={index}
            day={day}
            done={isDone(progress, plan.id, index)}
            onToggle={() => onToggle(plan.id, index)}
          />
        ))}
      </ol>
      {/* The last child of the section: sticky at the bottom of the screen while the list scrolls
          (above the phone tab bar), and in its own place under the list at the end. */}
      <div className="plan-pinned">
        <ProgressBar label={`${plan.title}: অগ্রগতি`} value={percentDone(progress, plan.id, total)} />
        <span aria-hidden="true">{digits(done)}/{digits(total)}</span>
      </div>
    </section>
  );
}
