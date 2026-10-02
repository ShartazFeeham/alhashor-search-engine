'use client';

import PageTitle from '../Helpers/PageTitle';
import { TOP_PICKS } from '../lib/topPicks';
import PlanDetail from './PlanDetail';
import { usePlanProgress } from './usePlanProgress';

// /top-picks/<id>: one set as a hadis-by-hadis checklist (the plan page, unchanged).
export default function TopPicksSetPage({ id, sets = TOP_PICKS }) {
  const { progress, toggle, reset } = usePlanProgress();
  const set = sets.find((entry) => entry.id === id);

  if (!set) {
    return (
      <main id="main" tabIndex={-1} className="screen daily top-picks">
        <PageTitle parts={['টপ লিস্ট/হাদীস']} />
        <p className="daily-note">এই সেটটি পাওয়া যায়নি। অন্য একটি বেছে নিন।</p>
      </main>
    );
  }
  return (
    <main id="main" tabIndex={-1} className="screen daily top-picks">
      <PageTitle parts={[set.title, 'টপ লিস্ট/হাদীস']} />
      <PlanDetail plan={set} progress={progress} onToggle={toggle} onReset={reset} />
    </main>
  );
}
