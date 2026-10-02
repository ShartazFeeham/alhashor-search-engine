'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { addId, loadSelection, parseIds, removeId, saveSelection, serializeIds, toggleId } from '../lib/compareList';
import { useToast } from '../ui/Toast';

const none = () => 'invalid';
const OUTSIDE = { ids: [], has: () => false, add: none, remove() {}, toggle: none, clear() {}, setAll() {}, getAll: () => [], ready: false };
const CompareContext = createContext(OUTSIDE);

const FULL = 'সর্বোচ্চ ৪টি হাদীস তুলনা করা যায়';

// The hadis chosen for comparison (up to four): held in memory while the visitor moves around the
// site, and copied to sessionStorage so a reload keeps it. The server and the first browser render
// both start empty, so they agree; the saved choice is read right after mounting (`ready`).
export function CompareProvider({ children }) {
  const toast = useToast();
  const [ids, setIds] = useState([]);
  const [ready, setReady] = useState(false);
  const current = useRef([]);

  const commit = useCallback((next) => {
    current.current = next;
    setIds(next);
    saveSelection(next);
  }, []);

  useEffect(() => {
    const saved = loadSelection();
    current.current = saved;
    setIds(saved);
    setReady(true);
  }, []);

  const add = useCallback(
    (id) => {
      const result = addId(current.current, id);
      if (result.status === 'added') commit(result.ids);
      return result.status;
    },
    [commit]
  );

  const remove = useCallback((id) => commit(removeId(current.current, id)), [commit]);

  const toggle = useCallback(
    (id) => {
      const result = toggleId(current.current, id);
      if (result.status === 'added' || result.status === 'removed') commit(result.ids);
      if (result.status === 'added') toast('তুলনায় যোগ হয়েছে');
      else if (result.status === 'removed') toast('তুলনা থেকে সরানো হয়েছে');
      else if (result.status === 'full') toast(FULL);
      return result.status;
    },
    [commit, toast]
  );

  const clear = useCallback(() => commit([]), [commit]);

  // Replaces the whole choice (the compare page does this when the address says something else).
  const setAll = useCallback((next) => commit(parseIds(serializeIds(next))), [commit]);

  // The choice right now, for effects that must not run again every time the choice changes.
  const getAll = useCallback(() => current.current, []);

  const has = useCallback((id) => ids.includes(id), [ids]);

  const value = useMemo(
    () => ({ ids, has, add, remove, toggle, clear, setAll, getAll, ready }),
    [ids, has, add, remove, toggle, clear, setAll, getAll, ready]
  );
  return <CompareContext.Provider value={value}>{children}</CompareContext.Provider>;
}

export function useCompare() {
  return useContext(CompareContext);
}
