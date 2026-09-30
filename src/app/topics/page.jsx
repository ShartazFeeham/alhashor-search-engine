import { Suspense } from 'react';
import Topics from '../../Topics/Topics';

export default function Page() {
  return (
    <Suspense>
      <Topics />
    </Suspense>
  );
}
