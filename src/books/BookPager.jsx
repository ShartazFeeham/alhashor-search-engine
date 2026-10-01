'use client';

import Link from 'next/link';
import { bookHref, pageCount } from '../lib/bookBrowse';
import { useDigits } from '../lib/useDigits';
import { toTop } from './toTop';
import Icon from '../ui/Icon';

// A control that is a link when it can go somewhere and plain, dimmed text when it cannot.
function Step({ href, label, children }) {
  if (href === null) return <span role="button" aria-disabled="true" aria-label={label}>{children}</span>;
  return <Link href={href} aria-label={label} scroll={false} onClick={toTop}>{children}</Link>;
}

// Previous, next, and ten pages either way (a book has hundreds of pages), with "page n / m".
// `where` ("উপরে" or "নিচে") tells the two pagers on a page apart.
export default function BookPager({ book, page, where }) {
  const digits = useDigits();
  const last = pageCount(book) - 1;
  const to = (target) => bookHref(book, Math.min(Math.max(target, 0), last));
  const canBack = page > 0;
  const canForward = page < last;
  return (
    <nav className="books-pager" aria-label={`পাতা (${where})`}>
      <Step href={canBack ? to(page - 10) : null} label={`${digits(10)} পাতা পিছনে`}>−{digits(10)}</Step>
      <Step href={canBack ? to(page - 1) : null}><Icon name="cl" size={16} />আগের</Step>
      <span className="books-pager-now">পাতা {digits(page + 1)} / {digits(last + 1)}</span>
      <Step href={canForward ? to(page + 1) : null}>পরের<Icon name="cr" size={16} /></Step>
      <Step href={canForward ? to(page + 10) : null} label={`${digits(10)} পাতা সামনে`}>+{digits(10)}</Step>
    </nav>
  );
}
