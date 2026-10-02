import { Suspense } from 'react';
import NarratorsFallback from '../../narrators/NarratorsFallback';
import NarratorsPage from '../../narrators/NarratorsPage';

// Static: the address (?name=, ?page=, ?book=) is read in the browser, and the page title is set by
// the page itself, so this route sets no title of its own (a pre-built one would win over it).
export default function Page() {
  return (
    <Suspense fallback={<NarratorsFallback />}>
      <NarratorsPage />
    </Suspense>
  );
}
