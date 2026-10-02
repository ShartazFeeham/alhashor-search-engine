'use client';

import PageTitle from '../Helpers/PageTitle';

// What the pre-built page shows before the address can be read in the browser: the title and the
// heading, so the page is never blank.
export default function NarratorsFallback() {
  return (
    <main id="main" tabIndex={-1} className="screen narrators">
      <PageTitle parts={['বর্ণনাকারী']} />
      <h1 className="h1">বর্ণনাকারী</h1>
    </main>
  );
}
