'use client';

import Icon from '../ui/Icon';
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
      <button type="button" className="search-pager-btn" disabled={page <= 0} onClick={() => go(page - 1)}>
        <Icon name="cl" size={18} />
        আগের
      </button>
      <span className="search-pager-label">পাতা {digits(page + 1)} / {digits(lastPage + 1)}</span>
      <button type="button" className="search-pager-btn" disabled={page >= lastPage} onClick={() => go(page + 1)}>
        পরের
        <Icon name="cr" size={18} />
      </button>
    </nav>
  );
}
