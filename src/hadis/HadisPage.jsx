'use client';

import PageTitle from '../Helpers/PageTitle';
import { bookById } from '../lib/books';
import { tagOf } from '../lib/hadisRoute';
import { wordCount } from '../lib/hadisText';
import { useDigits } from '../lib/useDigits';
import { useHadisText } from '../lib/useHadisText';
import Button from '../ui/Button';
import Breadcrumb from './Breadcrumb';
import HadisArticle from './HadisArticle';
import PrevNext from './PrevNext';
import ReadingProgress from './ReadingProgress';
import RelatedList from './RelatedList';

const ARTICLE_ID = 'hadis-article';

// `initialText` comes from the server-rendered route: the text (so it is in the HTML), or null
// for a number with no file. Leave it out and the page fetches the text itself.
export default function HadisPage({ bookId, number, initialText }) {
  const book = bookById(bookId);
  const digits = useDigits();
  const { status, text, retry } = useHadisText(tagOf(bookId, number), initialText);

  return (
    <main id="main" tabIndex={-1} className="screen hadis-page">
      {/* The route's metadata already sets this title; a second <title> would repeat it in the head. */}
      {initialText === undefined && <PageTitle parts={[`${book.full} - হাদীস নং ${digits(number)}`]} />}
      <Breadcrumb book={book} number={number} />

      {status === 'loading' && (
        <div className="hadis-skeleton" aria-busy="true" aria-label="লোড হচ্ছে">
          <h1 className="sr-only">{book.full} - হাদীস নং {digits(number)}</h1>
          <div className="hadis-skel" style={{ width: '40%' }} />
          <div className="hadis-skel" style={{ width: '96%' }} />
          <div className="hadis-skel" style={{ width: '90%' }} />
          <div className="hadis-skel" style={{ width: '55%' }} />
        </div>
      )}

      {status === 'missing' && (
        <div className="hadis-message">
          <h1>{book.full} - হাদীস নং {digits(number)}</h1>
          <p>এই হাদীসটি পাওয়া যায়নি। আগের বা পরের হাদীসে যেতে পারেন।</p>
        </div>
      )}

      {status === 'error' && (
        <div className="hadis-message">
          <h1>{book.full} - হাদীস নং {digits(number)}</h1>
          <p>হাদীসটি আনা যায়নি। ইন্টারনেট সংযোগ দেখে আবার চেষ্টা করুন।</p>
          <Button variant="primary" onClick={retry}>আবার চেষ্টা করুন</Button>
        </div>
      )}

      {status === 'ok' && (
        <>
          <ReadingProgress words={wordCount(text)} targetId={ARTICLE_ID} />
          <HadisArticle id={ARTICLE_ID} book={book} number={number} text={text} />
        </>
      )}

      {status !== 'loading' && <PrevNext bookId={bookId} number={number} swipeTarget="page" />}
      {status === 'ok' && <RelatedList bookId={bookId} number={number} />}
    </main>
  );
}
