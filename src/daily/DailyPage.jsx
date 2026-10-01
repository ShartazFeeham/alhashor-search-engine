'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { dailyHref, tabOf } from '../lib/dailyRoute';
import { useDigits } from '../lib/useDigits';
import KhutbahSection from './KhutbahSection';
import PlansSection from './PlansSection';
import TodaySection from './TodaySection';
import { useKhutbahList } from './useKhutbahList';

const TABS = [
  { id: 'today', label: 'আজকের হাদীস', lead: 'প্রতিদিন একটি ছোট হাদীস, তারিখ ধরে বাছা।' },
  { id: 'plans', label: 'পরিকল্পনা', lead: 'প্রতিদিন একটি করে হাদীস পড়ুন। কতদূর পড়লেন, তা এই ডিভাইসেই মনে থাকে।' },
  { id: 'khutbah', label: 'খুতবার তালিকা', lead: 'আলোচনা বা খুতবার জন্য হাদীস বেছে ছাপার উপযোগী তালিকা বানান।' },
];

// /daily: the hadis of the day, reading plans and the khutbah sheet, switched by ?tab=. The
// khutbah list (?ids=) is kept in every tab's link.
export default function DailyPage() {
  const params = useSearchParams();
  const tab = tabOf(params);
  const { items } = useKhutbahList();
  const digits = useDigits();
  const current = TABS.find((entry) => entry.id === tab);

  return (
    <main className="screen daily" data-tab={tab}>
      <header className="daily-head">
        <h1 className="h1">{current.label}</h1>
        <p className="muted">{current.lead}</p>
      </header>
      <nav className="daily-tabs" aria-label="বিভাগ">
        {TABS.map(({ id, label }) => (
          <Link key={id} href={dailyHref({ tab: id, items })} aria-current={id === tab ? 'page' : undefined}>
            {label}
            {id === 'khutbah' && items.length > 0 && <span className="daily-tab-count">{digits(items.length)}</span>}
          </Link>
        ))}
      </nav>
      {tab === 'today' && <TodaySection />}
      {tab === 'plans' && <PlansSection />}
      {tab === 'khutbah' && <KhutbahSection />}
    </main>
  );
}
