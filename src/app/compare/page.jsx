import { Suspense } from 'react';
import ComparePage from '../../compare/ComparePage';

// The title here is the pre-built one for the first paint; the page sets the same title once it is running.
export const metadata = { title: 'হাদীস তুলনা - Alhashor' };

export default function Page() {
  return (
    <Suspense>
      <ComparePage />
    </Suspense>
  );
}
