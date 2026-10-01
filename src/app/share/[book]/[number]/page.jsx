import { notFound } from 'next/navigation';
import { formatNumber } from '../../../../lib/digits';
import { parseHadisParams } from '../../../../lib/hadisRoute';
import SharePage from '../../../../share/SharePage';

export async function generateMetadata({ params }) {
  const { book: slug, number: text } = await params;
  const parsed = parseHadisParams(slug, text);
  if (!parsed) return { title: 'পৃষ্ঠাটি পাওয়া যায়নি - BoiKotha' };
  return { title: `শেয়ার - ${parsed.book.full} - হাদীস নং ${formatNumber(parsed.number)} - BoiKotha` };
}

export default async function Page({ params }) {
  const { book: slug, number: text } = await params;
  const parsed = parseHadisParams(slug, text);
  if (!parsed) notFound();
  return <SharePage bookId={parsed.book.id} number={parsed.number} />;
}
