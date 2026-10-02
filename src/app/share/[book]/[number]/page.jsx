import { notFound } from 'next/navigation';
import { formatNumber } from '../../../../lib/digits';
import { parseHadisParams } from '../../../../lib/hadisRoute';
import SharePage from '../../../../share/SharePage';

// Built on the first visit, then served from the cache, like the hadis page (the page itself
// draws the card in the browser, so nothing here changes with time).
export const generateStaticParams = () => [];
export const dynamicParams = true;
export const revalidate = 31536000;

// A utility page, not something to find in a search engine.
const NO_INDEX = { index: false, follow: false };

export async function generateMetadata({ params }) {
  const { book: slug, number: text } = await params;
  const parsed = parseHadisParams(slug, text);
  if (!parsed) return { title: 'পৃষ্ঠাটি পাওয়া যায়নি - Alhashor', robots: NO_INDEX };
  return { title: `শেয়ার - ${parsed.book.full} - হাদীস নং ${formatNumber(parsed.number)} - Alhashor`, robots: NO_INDEX };
}

export default async function Page({ params }) {
  const { book: slug, number: text } = await params;
  const parsed = parseHadisParams(slug, text);
  if (!parsed) notFound();
  return <SharePage bookId={parsed.book.id} number={parsed.number} />;
}
