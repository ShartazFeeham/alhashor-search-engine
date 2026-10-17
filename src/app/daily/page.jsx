import DailyPage from '../../daily/DailyPage';
import { pageMetadata } from '../../lib/seo';
import { absoluteUrl } from '../../lib/site';

export const metadata = {
  ...pageMetadata({ title: 'আজকের হাদীস - Alhashor', path: '/daily' }),
  // Feed readers find the daily feed from the page's head.
  alternates: { canonical: absoluteUrl('/daily'), types: { 'application/rss+xml': '/daily/rss.xml' } },
};

export default function Page() {
  return <DailyPage />;
}
