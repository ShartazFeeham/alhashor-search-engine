import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import BookPage from '../../../books/BookPage';
import BookPageFallback from '../../../books/BookPageFallback';
import { BOOKS } from '../../../lib/books';

// The six books are known, so their pages are built once and served as plain files.
export const generateStaticParams = () => BOOKS.map((book) => ({ book: book.slug }));

const bookOf = (slug) => BOOKS.find((book) => book.slug === slug);

export async function generateMetadata({ params }) {
  const book = bookOf((await params).book);
  if (!book) return { title: 'পৃষ্ঠাটি পাওয়া যায়নি - Alhashor' };
  return { title: `${book.full} - হাদীসের বই - Alhashor` };
}

export default async function Page({ params }) {
  const book = bookOf((await params).book);
  if (!book) notFound();
  return (
    <Suspense fallback={<BookPageFallback bookId={book.id} />}>
      <BookPage bookId={book.id} />
    </Suspense>
  );
}
