import { Suspense } from 'react';
import { CURATED_TOPICS } from '../../data/curatedTopics';
import TopicsPage from '../../topics/TopicsPage';

export default function Page() {
  return (
    <Suspense>
      <TopicsPage curated={CURATED_TOPICS} />
    </Suspense>
  );
}
