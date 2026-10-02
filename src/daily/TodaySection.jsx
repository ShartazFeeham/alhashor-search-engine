'use client';

import { getDailyPool, pickDay, poolIsEnough, recentDays } from '../lib/dailyPool';
import Button from '../ui/Button';
import DailyCard from './DailyCard';
import RecentList from './RecentList';
import { useShortList } from './useShortList';
import { useToday } from './useToday';

// আজকের হাদীস: today's pick from the featured top-picks sets, and the seven days before.
export default function TodaySection() {
  return <TodayContent />;
}

function TodayContent() {
  const today = useToday();
  // The old short list is only the fallback while the featured sets hold too few hadis.
  const pool = getDailyPool();
  const fromPool = poolIsEnough(pool);
  const short = useShortList(!fromPool);

  if (!fromPool && short.status === 'error') {
    return (
      <div className="daily-note" role="alert">
        <p>আজকের হাদীসের তালিকা আনা যায়নি। ইন্টারনেট সংযোগ দেখে আবার চেষ্টা করুন।</p>
        <Button size="sm" onClick={short.retry}>আবার চেষ্টা করুন</Button>
      </div>
    );
  }
  if (!today || (!fromPool && short.status === 'loading')) {
    return (
      <div className="hadis-skeleton hadis-card" aria-busy="true" aria-label="লোড হচ্ছে">
        <div className="hadis-skel" style={{ width: '40%' }} />
        <div className="hadis-skel" style={{ width: '96%' }} />
        <div className="hadis-skel" style={{ width: '88%' }} />
        <div className="hadis-skel" style={{ width: '54%' }} />
      </div>
    );
  }
  const context = { pool, list: short.list };
  const pick = pickDay(today, context);
  if (!pick) return <p className="daily-note">আজকের জন্য কোনো হাদীস পাওয়া যায়নি।</p>;

  return (
    <>
      <DailyCard book={pick.book} number={pick.number} date={today} />
      <RecentList entries={recentDays(today, context)} />
    </>
  );
}
