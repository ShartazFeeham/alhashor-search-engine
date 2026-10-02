'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import PageTitle from '../Helpers/PageTitle';
import { dailyHref, tabOf } from '../lib/dailyRoute';
import PlansSection from './PlansSection';
import TodaySection from './TodaySection';

const TABS = [
  { id: 'today', label: 'আজকের হাদীস', lead: 'প্রতিদিন একটি ছোট হাদীস, তারিখ ধরে বাছা।' },
  { id: 'plans', label: 'পরিকল্পনা', lead: 'প্রতিদিন একটি করে হাদীস পড়ুন। কতদূর পড়লেন, তা এই ডিভাইসেই মনে থাকে।' },
];

// /daily: the hadis of the day, reading plans, switched by ?tab=.
export default function DailyPage() {
  const params = useSearchParams();
  const tab = tabOf(params);
  const current = TABS.find((entry) => entry.id === tab);

  return (
    <main id="main" tabIndex={-1} className="screen daily" data-tab={tab}>
      {/* One title for the whole route, the same as the pre-built one in app/daily/page.jsx. */}
      <PageTitle parts={['আজকের হাদীস']} />
      <header className="daily-head">
        <h1 className="h1">{current.label}</h1>
        <p className="muted">{current.lead}</p>
      </header>
      <nav className="daily-tabs" aria-label="বিভাগ">
        {TABS.map(({ id, label }) => (
          <Link key={id} href={dailyHref({ tab: id })} aria-current={id === tab ? 'page' : undefined}>
            {label}
          </Link>
        ))}
      </nav>
      {tab === 'today' && <TodaySection />}
      {tab === 'plans' && <PlansSection />}
    </main>
  );
}
