'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useRef } from 'react';
import PageTitle from '../Helpers/PageTitle';
import { HADIS_PER_PAGE, lastPageOf, pageFromParam, pageSlice } from '../Helpers/paging';
import HadisCard from '../hadis/HadisCard';
import { usePageFocus } from '../lib/pageFocus';
import { bookFromParam, narratorHref } from '../lib/narrators';
import { toTop } from '../lib/toTop';
import { useDigits } from '../lib/useDigits';
import Button from '../ui/Button';
import Icon from '../ui/Icon';
import PageStatus from '../ui/PageStatus';
import NarratorBookFilter from './NarratorBookFilter';
import NarratorList from './NarratorList';
import NarratorPager from './NarratorPager';
import { DONE, LOADING, useNarratorHadis, useNarratorIndex } from './useNarrators';

const NOTE = 'নামগুলো স্বয়ংক্রিয়ভাবে বাছাই করা, কিছু বানান আলাদা থাকতে পারে।';
const DETAIL_NOTE = 'যে হাদীসের সনদের শেষে এই নামটি আছে, শুধু সেগুলোই গোনা হয়েছে। যে হাদীসের সনদ চেনা যায়নি, সেগুলো এখানে নেই।';

/*
    /narrators is the list of narrators; /narrators?name=<id>&page=<n>&book=<bookId> is one narrator's
    hadis (20 to a page, in book order), as a page of the shared hadis card. The address is the
    whole state. The index and the lists come from static files built once by
    scripts/build-narrators.mjs, so nothing is worked out in the browser.
*/
export default function NarratorsPage() {
  const params = useSearchParams();
  const id = (params.get('name') || '').trim();
  const book = bookFromParam(params.get('book'));
  const index = useNarratorIndex();
  const narrator = id === '' ? undefined : index.narrators.find((entry) => entry.id === id);
  const lookup = useNarratorHadis(narrator ? id : '', book);
  const page = pageFromParam(params.get('page'), lookup.hadis.length);
  const lastPage = lastPageOf(lookup.hadis.length);
  // A row, a book chip or the pager asks for focus (see pageFocus.js); it goes to the heading.
  const headingRef = useRef(null);
  usePageFocus(`${id}|${book}|${page}`, headingRef);

  return (
    <main id="main" tabIndex={-1} className="screen narrators">
      <PageTitle parts={narrator ? [narrator.name, 'বর্ণনাকারী'] : ['বর্ণনাকারী']} />
      {id !== '' && (
        <Link href={narratorHref('')} className="narr-back" scroll={false} onClick={toTop}>
          <Icon name="cl" size={16} />সব বর্ণনাকারী
        </Link>
      )}
      <h1 className="h1 narr-title" ref={headingRef} tabIndex={-1}>{narrator ? narrator.name : 'বর্ণনাকারী'}</h1>

      {id === '' && (
        <>
          <p className="narr-intro">হাদীসের সনদের শেষ বর্ণনাকারী (সাধারণত সাহাবী) অনুযায়ী হাদীস দেখুন। নাম বেছে নিন, তার সব হাদীস পাবেন।</p>
          <p className="narr-note">{NOTE}</p>
          <NarratorList index={index} />
        </>
      )}

      {id !== '' && (
        <Detail
          id={id}
          book={book}
          page={page}
          lastPage={lastPage}
          index={index}
          narrator={narrator}
          lookup={lookup}
        />
      )}
    </main>
  );
}

function Detail({ id, book, page, lastPage, index, narrator, lookup }) {
  const digits = useDigits();

  if (index.status === LOADING) {
    return (
      <div className="narr-live" role="status">
        <div className="narr-indicator">
          <span>খুঁজছি...</span>
          <i />
        </div>
      </div>
    );
  }
  if (index.status !== DONE) {
    return (
      <div className="narr-problem">
        <p>বর্ণনাকারীকে খোঁজা যায়নি। ইন্টারনেট সংযোগ দেখে আবার চেষ্টা করুন।</p>
        <Button size="sm" onClick={index.retry}>আবার চেষ্টা করুন</Button>
      </div>
    );
  }
  if (!narrator) {
    return (
      <div className="narr-problem" role="status">
        <p>এই বর্ণনাকারীকে পাওয়া যায়নি।</p>
        <Link href={narratorHref('')} className="ui-btn sm" scroll={false} onClick={toTop}>সব বর্ণনাকারী দেখুন</Link>
      </div>
    );
  }

  const { status, hadis, retry } = lookup;
  return (
    <>
      <p className="narr-note">{NOTE} {DETAIL_NOTE}</p>
      <NarratorBookFilter id={id} perBook={narrator.perBook} selected={book} />
      <PageStatus page={page} />
      {/* One live region, always on the page, so the changing state is announced to screen readers. */}
      <div className="narr-live" role="status">
        {status === LOADING && (
          <div className="narr-indicator">
            <span>খুঁজছি...</span>
            <i />
          </div>
        )}
        {status !== LOADING && status !== DONE && (
          <div className="narr-problem">
            <p>হাদীসের তালিকা আনা যায়নি। ইন্টারনেট সংযোগ দেখে আবার চেষ্টা করুন।</p>
            <Button size="sm" onClick={retry}>আবার চেষ্টা করুন</Button>
          </div>
        )}
        {status === DONE && hadis.length === 0 && (
          <p className="narr-none">এই বইয়ে এই বর্ণনাকারীর কোনো হাদীস পাওয়া যায়নি</p>
        )}
        {status === DONE && hadis.length > 0 && (
          <p className="narr-total">
            মোট {digits(hadis.length)} টি হাদীস পাওয়া গেছে
            <br />
            <b>
              {digits(page * HADIS_PER_PAGE + 1)} - {digits(Math.min((page + 1) * HADIS_PER_PAGE, hadis.length))} পর্যন্ত দেখানো হচ্ছে
            </b>
          </p>
        )}
      </div>
      {status === DONE && hadis.length > 0 && (
        <>
          <ol className="narr-hadis">
            {pageSlice(hadis, page).map(({ bookId, number }) => (
              <li key={`${bookId}-${number}`} className="narr-item">
                <HadisCard bookId={bookId} number={number} level={2} />
              </li>
            ))}
          </ol>
          {lastPage > 0 && <NarratorPager id={id} book={book} page={page} lastPage={lastPage} />}
        </>
      )}
    </>
  );
}
