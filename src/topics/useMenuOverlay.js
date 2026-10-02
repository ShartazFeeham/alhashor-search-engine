import { useEffect, useRef, useState } from 'react';
import { useWide } from './useWide';

// The state of a letter-block menu (topics, narrators): a sidebar from 900px wide; on a phone a
// full-screen overlay, open at first when `startOpen` and closed by choosing a name. Behind the
// overlay the page does not scroll, and closing it with × or Escape puts focus back on the button
// that opened it (`openerRef`).
export function useMenuOverlay(startOpen) {
  const wide = useWide();
  const [open, setOpen] = useState(startOpen);
  const overlay = !wide && open;
  const openerRef = useRef(null);
  const restoreFocus = useRef(false);
  const close = () => {
    restoreFocus.current = true;
    setOpen(false);
  };
  useEffect(() => {
    if (!overlay) return undefined;
    const before = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = before;
    };
  }, [overlay]);
  useEffect(() => {
    if (open || !restoreFocus.current) return;
    restoreFocus.current = false;
    openerRef.current?.focus();
  }, [open]);
  return { wide, overlay, openerRef, close, pick: () => setOpen(false), show: () => setOpen(true) };
}
