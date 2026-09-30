import { Suspense } from 'react';
import SearchPage from '../../search/SearchPage';

export default function Page() {
  return (
    <Suspense>
      <SearchPage />
    </Suspense>
  );
}
