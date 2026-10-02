'use client';

import PageTitle from '../Helpers/PageTitle';
import TodaySection from './TodaySection';

// /daily: the hadis of the day. (The reading plans moved to /top-picks.)
export default function DailyPage() {
  return (
    <main id="main" tabIndex={-1} className="screen daily">
      <PageTitle parts={['আজকের হাদীস']} />
      <header className="daily-head">
        <h1 className="h1">আজকের হাদীস</h1>
        <p className="muted">প্রতিদিন একটি ছোট হাদীস, তারিখ ধরে বাছা।</p>
      </header>
      <TodaySection />
    </main>
  );
}
