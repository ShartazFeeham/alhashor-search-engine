import { useSyncExternalStore } from 'react';

// The width from which the topics menu is a sidebar (keep in step with topics.css).
export const WIDE_QUERY = '(min-width: 900px)';

const query = () => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(WIDE_QUERY) : null);

function subscribe(listener) {
  const media = query();
  media?.addEventListener('change', listener);
  return () => media?.removeEventListener('change', listener);
}

// True from 900px wide. Without matchMedia (the server, tests) it is true: the sidebar.
export function useWide() {
  return useSyncExternalStore(subscribe, () => query()?.matches ?? true, () => true);
}
