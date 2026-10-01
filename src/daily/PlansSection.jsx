'use client';

import { useSearchParams } from 'next/navigation';
import { PLANS } from '../data/readingPlans';
import PageTitle from '../Helpers/PageTitle';
import { planOf } from '../lib/dailyRoute';
import PlanDetail from './PlanDetail';
import PlanList from './PlanList';
import { useKhutbahList } from './useKhutbahList';
import { usePlanProgress } from './usePlanProgress';

// পরিকল্পনা: the list of reading plans, or one plan (?plan=<id>) as a day-by-day checklist.
export default function PlansSection({ plans = PLANS }) {
  const params = useSearchParams();
  const plan = planOf(params, plans);
  const { progress, toggle, reset } = usePlanProgress();
  const { items } = useKhutbahList();

  if (plan) {
    return (
      <>
        <PageTitle parts={[plan.title, 'পরিকল্পনা']} />
        <PlanDetail plan={plan} progress={progress} onToggle={toggle} onReset={reset} items={items} />
      </>
    );
  }
  return (
    <>
      <PageTitle parts={['পরিকল্পনা']} />
      {params.get('plan') && <p className="daily-note">এই পরিকল্পনাটি পাওয়া যায়নি। অন্য একটি বেছে নিন।</p>}
      <PlanList plans={plans} progress={progress} items={items} />
    </>
  );
}
