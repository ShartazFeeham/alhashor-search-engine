import { TOP_PICKS_TAGLINE } from '../../lib/topPicks';
import TopPicksPage from '../../topPicks/TopPicksPage';

export const metadata = { title: 'টপ লিস্ট/হাদীস - Alhashor', description: TOP_PICKS_TAGLINE };

export default function Page() {
  return <TopPicksPage />;
}
