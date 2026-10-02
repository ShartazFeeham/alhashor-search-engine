'use client';

import { useSearchParams } from 'next/navigation';
import { PLANS } from '../data/readingPlans';
import { planOf } from '../lib/dailyRoute';
import PlanDetail from './PlanDetail';
import PlanList from './PlanList';
import { usePlanProgress } from './usePlanProgress';

// পরিকল্পনা: the list of reading plans, or one plan (?plan=<id>) as a day-by-day checklist.
export default function PlansSection({ plans = PLANS }) {
  const params = useSearchParams();
  const plan = planOf(params, plans);
  const { progress, toggle, reset } = usePlanProgress();

  if (plan) {
    return <PlanDetail plan={plan} progress={progress} onToggle={toggle} onReset={reset} />;
  }
  return (
    <>
      {params.get('plan') && <p className="daily-note">এই পরিকল্পনাটি পাওয়া যায়নি। অন্য একটি বেছে নিন।</p>}
      <PlanList plans={plans} progress={progress} />
    </>
  );
}
