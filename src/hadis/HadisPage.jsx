'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import PageTitle from '../Helpers/PageTitle';
import { bookById } from '../lib/books';
import { tagOf } from '../lib/hadisRoute';
import { useDigits } from '../lib/useDigits';
import { useHadisText } from '../lib/useHadisText';
import Button from '../ui/Button';
import Breadcrumb from './Breadcrumb';
import HadisArticle from './HadisArticle';
import PrevNext from './PrevNext';
import RelatedList from './RelatedList';

const ARTICLE_ID = 'hadis-article';

// `initialText` comes from the server-rendered route: the text (so it is in the HTML), or null
// for a number with no file. Leave it out and the page fetches the text itself.
function HadisView({ bookId, number, initialText, term }) {
  const book = bookById(bookId);
  const digits = useDigits();
  const { status, text, retry } = useHadisText(tagOf(bookId, number), initialText);
  const crumbs = <Breadcrumb book={book} number={number} />;

  return (
    <main id="main" tabIndex={-1} className="screen hadis-page">
      {/* The route's metadata already sets this title; a second <title> would repeat it in the head. */}
      {initialText === undefined && <PageTitle parts={[`${book.full} - হাদীস নং ${digits(number)}`]} />}

      {status !== 'ok' && <div className="hadis-card">{crumbs}</div>}

      {status === 'loading' && (
        <div className="hadis-skeleton hadis-card" aria-busy="true" aria-label="লোড হচ্ছে">
          <h1 className="sr-only">{book.full} - হাদীস নং {digits(number)}</h1>
          <div className="hadis-skel" style={{ width: '40%' }} />
          <div className="hadis-skel" style={{ width: '96%' }} />
          <div className="hadis-skel" style={{ width: '90%' }} />
          <div className="hadis-skel" style={{ width: '55%' }} />
        </div>
      )}

      {status === 'missing' && (
        <div className="hadis-message hadis-card">
          <h1>{book.full} - হাদীস নং {digits(number)}</h1>
          <p>এই হাদীসটি পাওয়া যায়নি। আগের বা পরের হাদীসে যেতে পারেন।</p>
        </div>
      )}

      {status === 'error' && (
        <div className="hadis-message hadis-card">
          <h1>{book.full} - হাদীস নং {digits(number)}</h1>
          <p>হাদীসটি আনা যায়নি। ইন্টারনেট সংযোগ দেখে আবার চেষ্টা করুন।</p>
          <Button variant="primary" onClick={retry}>আবার চেষ্টা করুন</Button>
        </div>
      )}

      {status === 'ok' && (
        <HadisArticle id={ARTICLE_ID} book={book} number={number} text={text} crumbs={crumbs} term={term} />
      )}

      {status !== 'loading' && <PrevNext bookId={bookId} number={number} swipeTarget="page" term={term} />}
      {status === 'ok' && <RelatedList bookId={bookId} number={number} text={text} />}
    </main>
  );
}

function WithTerm(props) {
  return <HadisView {...props} term={useSearchParams().get('q') ?? ''} />;
}

// The route is cached as static HTML, so ?q= (the term of the page the reader came from) is read in the
// browser: the cached page shows the plain text first and the term's words turn bold on load.
export default function HadisPage(props) {
  return (
    <Suspense fallback={<HadisView {...props} term="" />}>
      <WithTerm {...props} />
    </Suspense>
  );
}
