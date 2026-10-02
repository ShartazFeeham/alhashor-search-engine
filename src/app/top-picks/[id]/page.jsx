import { notFound } from 'next/navigation';
import { TOP_PICKS } from '../../../lib/topPicks';
import TopPicksSetPage from '../../../topPicks/TopPicksSetPage';

// Every set is known, so its page is built once and served as a plain file.
export const dynamicParams = false;
export const generateStaticParams = () => TOP_PICKS.map((set) => ({ id: set.id }));

const setOf = (id) => TOP_PICKS.find((set) => set.id === id);

export async function generateMetadata({ params }) {
  const set = setOf((await params).id);
  if (!set) return { title: 'পৃষ্ঠাটি পাওয়া যায়নি - Alhashor' };
  return { title: `${set.title} - টপ লিস্ট/হাদীস - Alhashor` };
}

export default async function Page({ params }) {
  const { id } = await params;
  if (!setOf(id)) notFound();
  return <TopPicksSetPage id={id} />;
}
