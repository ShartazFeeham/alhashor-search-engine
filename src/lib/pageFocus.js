import { useEffect, useRef } from 'react';

// Paging links (a book's pager, the search pager, a topic chip) turn off Next's own focus and
// scroll step and jump to the top by hand (see toTop.js), which leaves keyboard focus on the
// control that was used, sometimes far below the new content. toTop() calls wantPageFocus();
// the page's results heading or list then takes focus when its page changes.
const WINDOW_MS = 5000;
let askedAt = -Infinity;

export function wantPageFocus() {
  askedAt = Date.now();
}

// `key` identifies what is shown (a page number, a topic and page); `ref` is the element to focus,
// which needs tabIndex={-1}. Focus moves only after a paging link asked for it, and never when the
// page first shows.
export function usePageFocus(key, ref) {
  const last = useRef(key);
  useEffect(() => {
    if (last.current === key) return;
    last.current = key;
    if (Date.now() - askedAt > WINDOW_MS) return;
    askedAt = -Infinity;
    ref.current?.focus({ preventScroll: true });
  }, [key, ref]);
}
