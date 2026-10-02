'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { compareHref } from '../lib/compareList';
import { useDigits } from '../lib/useDigits';
import Icon from '../ui/Icon';
import { useCompare } from './CompareProvider';

// A floating bar that shows while at least one hadis is chosen for comparison: a link to the
// compare page and a button to start over. It is hidden on the compare page itself (the page is
// the list) and in print (see compare.css).
export default function CompareBar() {
  const { ids, clear } = useCompare();
  const digits = useDigits();
  const onComparePage = usePathname().startsWith('/compare');
  const visible = ids.length > 0 && !onComparePage;

  // While the bar shows, the body carries has-cmp-bar: the page keeps room at the bottom for it and
  // back-to-top stacks above it (ui.css, compare.css), so it never hides the footer or the last content.
  useEffect(() => {
    if (!visible) return undefined;
    document.body.classList.add('has-cmp-bar');
    return () => document.body.classList.remove('has-cmp-bar');
  }, [visible]);

  if (!visible) return null;

  return (
    <div className="cmp-bar" role="region" aria-label="তুলনার তালিকা">
      <Link href={compareHref(ids)} className="cmp-bar-link">
        <Icon name="cols" size={20} />
        তুলনা ({digits(ids.length)})
      </Link>
      <button type="button" className="cmp-bar-clear" aria-label="তুলনার তালিকা খালি করুন" title="খালি করুন" onClick={clear}>
        <Icon name="x" size={18} />
      </button>
    </div>
  );
}
