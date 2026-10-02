'use client';

import Link from 'next/link';
import { doneCount, percentDone } from '../lib/planProgress';
import { topPicksHref } from '../lib/topPicks';
import { useDigits } from '../lib/useDigits';
import PickTile from './PickTile';
import ProgressRing, { bandOf } from './ProgressRing';

// Every set (the loader leaves out a set with no hadis) as a compact card with a colour tile and three lines:
// the title (never cut, it wraps), the hadis count and description, and the reader's own progress
// as text with a small ring.
export default function PlanList({ plans, progress }) {
  const digits = useDigits();
  return (
    <ul className="plan-list">
      {plans.map((plan) => {
        const total = plan.days.length;
        const done = doneCount(progress, plan.id, total);
        const percent = percentDone(progress, plan.id, total);
        return (
          <li key={plan.id}>
            <Link href={topPicksHref(plan.id)} className="plan-card">
              <PickTile set={plan} />
              <span className="plan-card-body">
                <b className="plan-card-title">{plan.title}</b>
                <span className="plan-card-text">
                  <span className="plan-card-meta">{digits(total)}টি হাদীস</span>
                  {plan.description && ` · ${plan.description}`}
                </span>
                <span className="plan-card-progress">
                  <span className="plan-card-meta plan-card-read">
                    আপনি পড়েছেন{' '}
                    <b className="plan-card-count" data-band={bandOf(percent)}>{`${digits(done)}/${digits(total)}`}</b>
                  </span>
                  <ProgressRing percent={percent} label={`${digits(percent)} শতাংশ পড়া হয়েছে`} />
                </span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
