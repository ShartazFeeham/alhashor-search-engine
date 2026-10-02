'use client';

import Link from 'next/link';
import { dailyHref } from '../lib/dailyRoute';
import { doneCount, percentDone } from '../lib/planProgress';
import { useDigits } from '../lib/useDigits';
import Icon from '../ui/Icon';
import ProgressBar from './ProgressBar';

// Every plan as a card: title, description, length and how far along the visitor is.
export default function PlanList({ plans, progress }) {
  const digits = useDigits();
  return (
    <ul className="plan-list">
      {plans.map((plan) => {
        const total = plan.days.length;
        return (
          <li key={plan.id}>
            <Link href={dailyHref({ tab: 'plans', plan: plan.id })} className="plan-card">
              <span className="plan-card-head">
                <b>{plan.title}</b>
                <Icon name="cr" size={20} />
              </span>
              <span className="plan-card-text">{plan.description}</span>
              <span className="plan-card-meta">{digits(total)} দিন</span>
              <ProgressBar label={`${plan.title}: অগ্রগতি`} value={percentDone(progress, plan.id, total)} />
              <span className="plan-card-meta">{digits(doneCount(progress, plan.id, total))}/{digits(total)} সম্পন্ন</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
