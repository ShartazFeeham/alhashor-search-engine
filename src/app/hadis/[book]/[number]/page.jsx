import { notFound } from 'next/navigation';
import HadisPage from '../../../../hadis/HadisPage';
import { formatNumber } from '../../../../lib/digits';
import { parseHadisParams } from '../../../../lib/hadisRoute';

export async function generateMetadata({ params }) {
  const { book: slug, number: text } = await params;
  const parsed = parseHadisParams(slug, text);
  if (!parsed) return { title: 'পৃষ্ঠাটি পাওয়া যায়নি - BoiKotha' };
  return { title: `${parsed.book.full} - হাদীস নং ${formatNumber(parsed.number)} - BoiKotha` };
}

export default async function Page({ params }) {
  const { book: slug, number: text } = await params;
  const parsed = parseHadisParams(slug, text);
  if (!parsed) notFound();
  return <HadisPage bookId={parsed.book.id} number={parsed.number} />;
}
