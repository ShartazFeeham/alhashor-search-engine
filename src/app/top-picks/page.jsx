import { TOP_PICKS_TAGLINE } from '../../lib/topPicks';
import { pageMetadata } from '../../lib/seo';
import TopPicksPage from '../../topPicks/TopPicksPage';

export const metadata = pageMetadata({ title: 'টপ লিস্ট/হাদীস - Alhashor', description: TOP_PICKS_TAGLINE, path: '/top-picks' });

export default function Page() {
  return <TopPicksPage />;
}
