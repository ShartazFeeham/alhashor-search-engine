import DailyPage from '../../daily/DailyPage';

export const metadata = {
  title: 'আজকের হাদীস - Alhashor',
  // Feed readers find the daily feed from the page's head.
  alternates: { types: { 'application/rss+xml': '/daily/rss.xml' } },
};

export default function Page() {
  return <DailyPage />;
}
