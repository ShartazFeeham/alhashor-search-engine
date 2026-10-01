import { Suspense } from 'react';
import DailyPage from '../../daily/DailyPage';

// The title here is the pre-built one; the page sets its own per tab once it is running.
export const metadata = { title: 'আজকের হাদীস - BoiKotha' };

export default function Page() {
  return (
    <Suspense>
      <DailyPage />
    </Suspense>
  );
}
