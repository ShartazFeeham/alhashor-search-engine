'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useRef } from 'react';
import PageTitle from '../Helpers/PageTitle';
import { tagOf } from '../lib/hadisRoute';
import { bookFromParam, narratorHref } from '../lib/narrators';
import { usePageFocus } from '../lib/pageFocus';
import { toTop } from '../lib/toTop';
import { useDigits } from '../lib/useDigits';
import ResultsListing, { DONE as LISTED, SEARCHING } from '../search/ResultsListing';
import { MenuButton } from '../topics/NameMenu';
import { useMenuOverlay } from '../topics/useMenuOverlay';
import Button from '../ui/Button';
import Icon from '../ui/Icon';
import NarratorIndex from './NarratorIndex';
import { DONE, LOADING, useNarratorHadis, useNarratorIndex } from './useNarrators';

const NOTE = 'নামগুলো স্বয়ংক্রিয়ভাবে বাছাই করা, কিছু বানান আলাদা থাকতে পারে।';
const Loading = () => (
  <div className="topics-live" role="status">
    <div className="topics-indicator">
      <span>খুঁজছি...</span>
      <i />
    </div>
  </div>
);

/*
    /narrators?name=<id>&page=<n>&book=<bookId>&sort=desc: the address is the whole state. The
    page is laid out like /topics: a menu of the narrators in letter blocks (a sticky sidebar from
    900px wide, on a phone a full-screen overlay open at first when no narrator is chosen), and
    for the chosen one the listing of /search and /topics (ResultsListing) over the narrator's
    ready list of hadis. `sort` only orders the menu. The index and the lists come from static
    files built once by scripts/build-narrators.mjs, so nothing is worked out in the browser.
*/
export default function NarratorsPage() {
  const params = useSearchParams();
  const router = useRouter();
  const digits = useDigits();
  const id = (params.get('name') || '').trim();
  const sort = params.get('sort') === 'desc' ? 'desc' : 'asc';
  const book = bookFromParam(params.get('book'));
  const pageParam = params.get('page');
  const pageNumber = Math.max(1, parseInt(pageParam ?? '', 10) || 1);
  const index = useNarratorIndex();
  const narrator = id === '' ? undefined : index.narrators.find((entry) => entry.id === id);
  const lookup = useNarratorHadis(narrator ? id : '', 'all');

  // A narrator link asks for focus (see pageFocus.js); it goes to the narrator's heading.
  const nameRef = useRef(null);
  usePageFocus(id, nameRef);

  const { wide, overlay, openerRef, close, pick, show } = useMenuOverlay(id === '');
  const opener = <MenuButton label="বর্ণনাকারীসূচি" onClick={show} buttonRef={openerRef} />;

  // The listing asks for another book or page ({ book, page }: page 0 is the first, else 1-based).
  const change = ({ book: nextBook = book, page = 0 }) =>
    router.push(narratorHref(id, page > 0 ? page - 1 : 0, nextBook, sort), { scroll: false });

  const menuEmpty =
    index.status === LOADING ? (
      <Loading />
    ) : index.status !== DONE ? (
      <div className="topics-problem">
        <p>বর্ণনাকারীদের তালিকা আনা যায়নি। ইন্টারনেট সংযোগ দেখে আবার চেষ্টা করুন।</p>
        <Button size="sm" onClick={index.retry}>আবার চেষ্টা করুন</Button>
      </div>
    ) : null;

  const tags = lookup.status === DONE ? lookup.hadis.map(({ bookId, number }) => tagOf(bookId, number)) : [];

  return (
    <main id="main" tabIndex={-1} className="screen topics">
      <PageTitle parts={narrator ? [narrator.name, 'বর্ণনাকারী'] : ['বর্ণনাকারী']} />
      <h1 className="h1">বর্ণনাকারী</h1>
      <div className="topics-layout">
        {(wide || overlay) && (
          <NarratorIndex
            id={id}
            page={pageNumber - 1}
            book={book}
            sort={sort}
            narrators={index.narrators}
            empty={menuEmpty}
            overlay={overlay}
            onClose={close}
            onPick={pick}
          />
        )}
        <div className="topics-main">
          {!wide && id !== '' && opener}
          {id === '' && (
            <div className="topics-empty">
              <span className="topics-empty-icon"><Icon name="user" size={26} /></span>
              <b>একজন বর্ণনাকারী বেছে নিন</b>
              <span>হাদীসের সনদের শেষ বর্ণনাকারী (সাধারণত সাহাবী) অনুযায়ী হাদীস দেখুন। সূচি থেকে নাম ছুঁলে তার সব হাদীস এখানে আসবে।</span>
              <span className="topics-note">{NOTE}</span>
              {!wide && opener}
            </div>
          )}

          {id !== '' && index.status === LOADING && <Loading />}
          {id !== '' && index.status !== LOADING && index.status !== DONE && (
            <div className="topics-problem">
              <p>বর্ণনাকারীকে খোঁজা যায়নি। ইন্টারনেট সংযোগ দেখে আবার চেষ্টা করুন।</p>
              <Button size="sm" onClick={index.retry}>আবার চেষ্টা করুন</Button>
            </div>
          )}
          {id !== '' && index.status === DONE && !narrator && (
            <div className="topics-problem" role="status">
              <p>এই বর্ণনাকারীকে পাওয়া যায়নি।</p>
              <Link href={narratorHref('')} className="ui-btn sm" scroll={false} onClick={toTop}>সব বর্ণনাকারী দেখুন</Link>
            </div>
          )}

          {narrator && (
            <>
              <h2 className="topics-name" ref={nameRef} tabIndex={-1}>
                {narrator.name} <span className="topics-name-n">{digits(narrator.count)} টি হাদীস</span>
              </h2>
              <p className="topics-note">{NOTE}</p>
              {lookup.status !== LOADING && lookup.status !== DONE ? (
                <div className="topics-problem">
                  <p>হাদীসের তালিকা আনা যায়নি। ইন্টারনেট সংযোগ দেখে আবার চেষ্টা করুন।</p>
                  <Button size="sm" onClick={lookup.retry}>আবার চেষ্টা করুন</Button>
                </div>
              ) : (
                <ResultsListing
                  status={lookup.status === DONE ? LISTED : SEARCHING}
                  tags={tags}
                  book={book}
                  pageParam={pageParam}
                  onChange={change}
                  plain
                />
              )}
            </>
          )}
        </div>
      </div>
    </main>
  );
}
