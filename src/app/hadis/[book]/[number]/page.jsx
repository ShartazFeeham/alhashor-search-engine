import { notFound } from 'next/navigation';
import HadisPage from '../../../../hadis/HadisPage';
import { hasHadis } from '../../../../lib/books';
import { parseHadisParams } from '../../../../lib/hadisRoute';
import { getHadisText } from '../../../../lib/hadisServer';
import { hadisMetadata } from '../../../../lib/seo';

// Built on the first visit, then served from the cache. No page is built ahead of time (33k pages
// would make every deploy slow), and any other number is built on demand (dynamicParams).
export const generateStaticParams = () => [];
export const dynamicParams = true;
// A hadis text never changes, so the cached page is kept for a year.
export const revalidate = 31536000;

// The text for a number, as the page needs it: a string, null when the hadis has no file, or
// undefined when it should exist but could not be read here (the page then fetches it in the
// browser instead of telling every visitor, for a year, that it is missing).
async function textFor(book, number) {
  if (!hasHadis(book, number)) return null;
  const text = await getHadisText(book.id, number);
  if (typeof text === 'string') return text;
  console.error(`hadis text not readable on the server: ${book.id} ${number}`);
  return undefined;
}

export async function generateMetadata({ params }) {
  const { book: slug, number: text } = await params;
  const parsed = parseHadisParams(slug, text);
  if (!parsed) return { title: 'পৃষ্ঠাটি পাওয়া যায়নি - Alhashor', robots: { index: false } };
  return hadisMetadata(parsed.book, parsed.number, await textFor(parsed.book, parsed.number));
}

export default async function Page({ params }) {
  const { book: slug, number: text } = await params;
  const parsed = parseHadisParams(slug, text);
  if (!parsed) notFound();
  const initialText = await textFor(parsed.book, parsed.number);
  return <HadisPage bookId={parsed.book.id} number={parsed.number} initialText={initialText} />;
}
