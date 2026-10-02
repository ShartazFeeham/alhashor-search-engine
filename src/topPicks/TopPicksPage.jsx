'use client';

import PageTitle from '../Helpers/PageTitle';
import { TOP_PICKS, TOP_PICKS_TAGLINE } from '../lib/topPicks';
import PlanList from './PlanList';
import { usePlanProgress } from './usePlanProgress';

// /top-picks: the owner's hand-picked hadis in themed sets, one thin card per set.
export default function TopPicksPage({ sets = TOP_PICKS }) {
  const { progress } = usePlanProgress();
  return (
    <main id="main" tabIndex={-1} className="screen daily top-picks">
      <PageTitle parts={['টপ লিস্ট/হাদীস']} />
      <header className="daily-head">
        <h1 className="h1">টপ লিস্ট/হাদীস</h1>
        <p className="muted">{TOP_PICKS_TAGLINE}</p>
      </header>
      <PlanList plans={sets} progress={progress} />
    </main>
  );
}
