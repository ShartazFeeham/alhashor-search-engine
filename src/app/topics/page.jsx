import { Suspense } from 'react';
import TopicsPage from '../../topics/TopicsPage';

export default function Page() {
  return (
    <Suspense>
      <TopicsPage />
    </Suspense>
  );
}
