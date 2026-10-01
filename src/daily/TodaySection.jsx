'use client';

import PageTitle from '../Helpers/PageTitle';
import { pickDaily, recentPicks } from '../lib/dailyPick';
import Button from '../ui/Button';
import DailyCard from './DailyCard';
import RecentList from './RecentList';
import { useShortList } from './useShortList';
import { useToday } from './useToday';

// আজকের হাদীস: today's pick from the list of short hadis, and the seven days before.
export default function TodaySection() {
  return (
    <>
      <PageTitle parts={['আজকের হাদীস']} />
      <TodayContent />
    </>
  );
}

function TodayContent() {
  const today = useToday();
  const short = useShortList();

  if (short.status === 'error') {
    return (
      <div className="daily-note" role="alert">
        <p>আজকের হাদীসের তালিকা আনা যায়নি। ইন্টারনেট সংযোগ দেখে আবার চেষ্টা করুন।</p>
        <Button size="sm" onClick={short.retry}>আবার চেষ্টা করুন</Button>
      </div>
    );
  }
  if (!today || short.status === 'loading') {
    return (
      <div className="daily-card daily-card-loading" aria-busy="true" aria-label="লোড হচ্ছে">
        <div className="hadis-skel" style={{ width: '40%' }} />
        <div className="hadis-skel" style={{ width: '96%' }} />
        <div className="hadis-skel" style={{ width: '88%' }} />
        <div className="hadis-skel" style={{ width: '54%' }} />
      </div>
    );
  }
  const pick = pickDaily(short.list, today);
  if (!pick) return <p className="daily-note">আজকের জন্য কোনো হাদীস পাওয়া যায়নি।</p>;

  return (
    <>
      <DailyCard book={pick.book} number={pick.number} date={today} />
      <RecentList entries={recentPicks(short.list, today)} />
    </>
  );
}
