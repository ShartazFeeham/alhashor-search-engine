'use client';

import { toTop } from '../lib/toTop';
import { useDigits } from '../lib/useDigits';

// Previous / next with "page n / m" between; changing page goes back to the top of the list.
export default function Pager({ page, lastPage, onPage }) {
  const digits = useDigits();
  const go = (target) => {
    onPage(target);
    toTop();
  };
  return (
    <nav className="search-pager" aria-label="পাতা">
      <button type="button" className="ui-btn ghost" disabled={page <= 0} onClick={() => go(page - 1)}>আগের</button>
      <span>পাতা {digits(page + 1)} / {digits(lastPage + 1)}</span>
      <button type="button" className="ui-btn ghost" disabled={page >= lastPage} onClick={() => go(page + 1)}>পরের</button>
    </nav>
  );
}
