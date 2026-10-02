import { Suspense } from 'react';
import DailyPage from '../../daily/DailyPage';

// One title for the whole route (the page is static, so it cannot read ?tab=); DailyPage renders
// the same title, and the tab names are the page's h1.
export const metadata = { title: 'আজকের হাদীস - BoiKotha' };

export default function Page() {
  return (
    <Suspense>
      <DailyPage />
    </Suspense>
  );
}
