'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';

// The address's query string, plus a setter that navigates to a new one on the same page.
// setParams({ q: 'রোজা', page: '2' }) goes to <pathname>?q=...&page=2 (just <pathname> if empty).
export function useUrlParams() {
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  function setParams(values) {
    const query = new URLSearchParams(values).toString();
    // scroll: false keeps the page where it is; Next would otherwise scroll to the page content
    // and leave it below the navigation bar (the app scrolled to the top by itself before).
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  return [params, setParams];
}
