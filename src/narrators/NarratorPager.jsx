'use client';

import Link from 'next/link';
import { toTop } from '../lib/toTop';
import { narratorHref } from '../lib/narrators';
import { useDigits } from '../lib/useDigits';
import Icon from '../ui/Icon';

// A control that is a link when it can go somewhere and plain, dimmed text when it cannot.
function Step({ href, children }) {
  if (href === null) return <span aria-disabled="true">{children}</span>;
  return <Link href={href} scroll={false} onClick={toTop}>{children}</Link>;
}

// Previous and next page of a narrator's hadis, with "page n / m" above (pages are 0-based here).
// The chosen book stays in the address.
export default function NarratorPager({ id, book, page, lastPage }) {
  const digits = useDigits();
  return (
    <nav className="narr-pager" aria-label="পাতা">
      <span className="narr-pager-now">পাতা {digits(page + 1)} / {digits(lastPage + 1)}</span>
      <Step href={page > 0 ? narratorHref(id, page - 1, book) : null}><Icon name="cl" size={16} />আগের</Step>
      <Step href={page < lastPage ? narratorHref(id, page + 1, book) : null}>পরের<Icon name="cr" size={16} /></Step>
    </nav>
  );
}
