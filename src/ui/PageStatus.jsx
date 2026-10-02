'use client';

import { useDigits } from '../lib/useDigits';

// "পাতা n" for screen readers only: a status region, so moving to another page of a list is announced
// (the visible "page n / m" text is not a live region).
export default function PageStatus({ page }) {
  const digits = useDigits();
  return <p className="sr-only" role="status">পাতা {digits(page + 1)}</p>;
}
