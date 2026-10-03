'use client';

import { getDailyPool, pickDay, recentDays } from '../lib/dailyPool';
import DailyCard from './DailyCard';
import RecentList from './RecentList';
import { useToday } from './useToday';

// আজকের হাদীস: today's pick from the featured top-picks sets, and the seven days before.
export default function TodaySection() {
  return <TodayContent />;
}

function TodayContent() {
  const today = useToday();
  if (!today) {
    return (
      <div className="hadis-skeleton hadis-card" aria-busy="true" aria-label="লোড হচ্ছে">
        <div className="hadis-skel" style={{ width: '40%' }} />
        <div className="hadis-skel" style={{ width: '96%' }} />
        <div className="hadis-skel" style={{ width: '88%' }} />
        <div className="hadis-skel" style={{ width: '54%' }} />
      </div>
    );
  }
  const pool = getDailyPool();
  const pick = pickDay(today, { pool });
  if (!pick) return <p className="daily-note">আজকের জন্য কোনো হাদীস পাওয়া যায়নি।</p>;

  return (
    <>
      <DailyCard book={pick.book} number={pick.number} date={today} />
      <RecentList entries={recentDays(today, { pool })} />
    </>
  );
}
