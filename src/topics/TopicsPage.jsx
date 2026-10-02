'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import PageTitle from '../Helpers/PageTitle';
import { BOOKS } from '../lib/books';
import { usePageFocus } from '../lib/pageFocus';
import { topicHref } from '../lib/topics';
import SearchResults from '../search/SearchResults';
import Icon from '../ui/Icon';
import TopicIndex from './TopicIndex';
import { useWide } from './useWide';

// The slim button that opens the topics menu on a phone (it is only rendered there).
function MenuButton({ onClick, buttonRef }) {
  return (
    <button type="button" className="topics-open" aria-haspopup="dialog" onClick={onClick} ref={buttonRef}>
      <Icon name="menu" size={18} />বিষয়সূচি
    </button>
  );
}

/*
    /topics?topic=<name>&page=<n>&book=<id>&sort=desc: the address is the whole state. A topic is
    just a search for its name: its listing is the one of /search (SearchResults: count line, book
    filter with counts, result cards with the matched words highlighted, boxed pager, "did you
    mean"), so the same hadis appear as when the name is typed in the search box. `sort` only
    orders the menu.
    The editor's "start here" block (src/topics/StartHere.jsx) is switched off by the owner.
    The topics menu is one element: a sticky sidebar from 900px wide, and on a phone a full-screen
    overlay that is open at first when no topic is chosen and closes when a topic is chosen.
*/
export default function TopicsPage() {
  const params = useSearchParams();
  const router = useRouter();
  const topic = (params.get('topic') || '').trim();
  const sort = params.get('sort') === 'desc' ? 'desc' : 'asc';
  const bookParam = params.get('book');
  const book = BOOKS.some((b) => b.id === bookParam) ? bookParam : 'all';
  const pageParam = params.get('page');
  // Text of the page number as the listing clamps it; the menu's sort link keeps it.
  const pageNumber = Math.max(1, parseInt(pageParam ?? '', 10) || 1);

  // A topic link asks for focus (see pageFocus.js); it goes to the topic's heading.
  const nameRef = useRef(null);
  usePageFocus(topic, nameRef);

  const wide = useWide();
  const [open, setOpen] = useState(topic === '');
  const overlay = !wide && open;
  const openerRef = useRef(null);
  const restoreFocus = useRef(false);
  const close = () => {
    restoreFocus.current = true;
    setOpen(false);
  };
  // Behind the overlay the page does not scroll.
  useEffect(() => {
    if (!overlay) return undefined;
    const before = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = before;
    };
  }, [overlay]);
  // Closing with × or Escape puts focus back on the button that opened it.
  useEffect(() => {
    if (open || !restoreFocus.current) return;
    restoreFocus.current = false;
    openerRef.current?.focus();
  }, [open]);
  const opener = <MenuButton onClick={() => setOpen(true)} buttonRef={openerRef} />;

  // The listing asks for another book or page ({ book, page }: page 0 is the first, else 1-based).
  const change = ({ book: nextBook = book, page = 0 }) =>
    router.push(topicHref(topic, page > 0 ? page - 1 : 0, sort, nextBook), { scroll: false });
  const suggest = (corrected) => router.push(topicHref(corrected, 0, sort), { scroll: false });

  return (
    <main id="main" tabIndex={-1} className="screen topics">
      <PageTitle parts={[topic, 'বিষয়ভিত্তিক হাদীস']} />
      <h1 className="h1">বিষয়ভিত্তিক হাদীস</h1>
      <div className="topics-layout">
        {(wide || overlay) && (
          <TopicIndex topic={topic} page={pageNumber - 1} sort={sort} book={book} overlay={overlay} onClose={close} onPick={() => setOpen(false)} />
        )}
        <div className="topics-main">
          {!wide && topic !== '' && opener}
          {topic === '' && (
            <div className="topics-empty">
              <span className="topics-empty-icon"><Icon name="tag" size={26} /></span>
              <b>একটি বিষয় বেছে নিন</b>
              <span>সূচি থেকে বিষয় ছুঁলে সেই শব্দ আছে এমন সব হাদীস এখানে আসবে।</span>
              {!wide && opener}
            </div>
          )}

          {topic !== '' && (
            <>
              <h2 className="topics-name" ref={nameRef} tabIndex={-1}>{topic}</h2>
              <SearchResults
                query={topic}
                book={book}
                near={false}
                allowNear={false}
                pageParam={pageParam}
                onChange={change}
                onSuggest={suggest}
              />
            </>
          )}
        </div>
      </div>
    </main>
  );
}
