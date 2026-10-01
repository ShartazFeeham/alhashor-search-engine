'use client';

import { useSearchParams } from 'next/navigation';
import PageTitle from '../Helpers/PageTitle';
import { HADIS_PER_PAGE, lastPageOf, pageFromParam, pageSlice } from '../Helpers/paging';
import HadisCard from '../hadis/HadisCard';
import { curatedFor } from '../lib/topics';
import { useDigits } from '../lib/useDigits';
import { searchTags } from '../search/searchIndex';
import Button from '../ui/Button';
import Icon from '../ui/Icon';
import StartHere from './StartHere';
import TopicIndex from './TopicIndex';
import TopicPager from './TopicPager';
import { DONE, FAILED, LOADING, useTopicHadis } from './useTopicHadis';

/*
    /topics?topic=<name>&page=<n>: the address is the whole state. A topic's hadis are the ones
    containing every word of its name, best matches first, 20 to a page. For a topic the editor
    has picked entries for (`curated`, see src/data/curatedTopics.js) a numbered "start here"
    block comes first, on the first page. `search` is injectable for tests.
*/
export default function TopicsPage({ curated = {}, search = searchTags }) {
  const params = useSearchParams();
  const digits = useDigits();
  const topic = (params.get('topic') || '').trim();
  const { status, hadis, retry } = useTopicHadis(topic, search);
  const page = pageFromParam(params.get('page'), hadis.length);
  const lastPage = lastPageOf(hadis.length);
  const picks = curatedFor(curated, topic);
  const showPicks = picks.length > 0 && page === 0;

  return (
    <main className="screen topics">
      <PageTitle parts={[topic, 'বিষয়ভিত্তিক হাদীস']} />
      <h1 className="h1">বিষয়ভিত্তিক হাদীস</h1>
      <TopicIndex topic={topic} />

      {topic === '' && (
        <div className="topics-empty">
          <span className="topics-empty-icon"><Icon name="tag" size={26} /></span>
          <b>একটি বিষয় বেছে নিন</b>
          <span>ওপরের সূচি থেকে বিষয় ছুঁলে সেই শব্দ আছে এমন সব হাদীস এখানে আসবে।</span>
        </div>
      )}

      {topic !== '' && (
        <>
          <h2 className="topics-name">{topic}</h2>
          {/* One live region, always on the page, so the changing state is announced to screen readers. */}
          <div className="topics-live" role="status">
            {status === LOADING && (
              <div className="topics-indicator">
                <span>খুঁজছি...</span>
                <i />
              </div>
            )}
            {status === FAILED && (
              <div className="topics-problem">
                <p>বিষয়টি খোঁজা যায়নি। ইন্টারনেট সংযোগ দেখে আবার চেষ্টা করুন।</p>
                <Button size="sm" onClick={retry}>আবার চেষ্টা করুন</Button>
              </div>
            )}
            {status === DONE && hadis.length === 0 && picks.length === 0 && (
              <p className="topics-none">এই বিষয়ে কোনো হাদীস পাওয়া যায়নি</p>
            )}
            {status === DONE && hadis.length > 0 && (
              <p className="topics-total">
                মোট {digits(hadis.length)} টি হাদীস পাওয়া গেছে
                <br />
                <b>
                  {digits(page * HADIS_PER_PAGE + 1)} - {digits(Math.min((page + 1) * HADIS_PER_PAGE, hadis.length))} পর্যন্ত দেখানো হচ্ছে
                </b>
              </p>
            )}
          </div>

          {showPicks && <StartHere entries={picks} />}

          {status === DONE && hadis.length > 0 && (
            <>
              {showPicks && <h2 className="h3 topics-all">সব হাদীস</h2>}
              <ol className="topics-list">
                {pageSlice(hadis, page).map(({ bookId, number }) => (
                  <li key={`${bookId}-${number}`} className="topics-item">
                    <HadisCard bookId={bookId} number={number} />
                  </li>
                ))}
              </ol>
              {lastPage > 0 && <TopicPager topic={topic} page={page} lastPage={lastPage} />}
            </>
          )}
        </>
      )}
    </main>
  );
}
