'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useMemo } from 'react';
import { dailyHref, tabOf } from '../lib/dailyRoute';
import { addItem, moveItem, parseIds, removeAt } from '../lib/khutbahList';

// The khutbah list, read from and written to the address (?ids=bukhari-1234,muslim-5), so a link
// is a saved list. Changes replace the address instead of adding to the history, and keep the
// page where it is.
export function useKhutbahList() {
  const params = useSearchParams();
  const router = useRouter();
  const ids = params.get('ids');
  const tab = tabOf(params);
  const plan = params.get('plan');
  const items = useMemo(() => parseIds(ids), [ids]);

  const write = useCallback(
    (next) => router.replace(dailyHref({ tab, plan, items: next }), { scroll: false }),
    [router, tab, plan]
  );

  const add = useCallback(
    (item) => {
      const result = addItem(items, item);
      if (result.status === 'added') write(result.items);
      return result.status;
    },
    [items, write]
  );
  const remove = useCallback((index) => write(removeAt(items, index)), [items, write]);
  const move = useCallback((index, delta) => write(moveItem(items, index, delta)), [items, write]);

  return { items, add, remove, move };
}
