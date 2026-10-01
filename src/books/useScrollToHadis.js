import { useEffect } from 'react';
import { hadisAnchor } from '../lib/bookBrowse';

const KEEP_FOR = 4000; // how long the hadis is held in view while the cards above it load
const INTERACTIONS = ['wheel', 'touchstart', 'keydown', 'mousedown'];

// Scrolls the hadis with this number to the top of the screen, and keeps it there while the
// texts above it load and change the page's height. A touch, key or click by the reader ends that.
export function useScrollToHadis(number, listRef) {
  useEffect(() => {
    if (number === null) return undefined;
    const element = document.getElementById(hadisAnchor(number));
    if (!element) return undefined;
    const show = () => element.scrollIntoView({ block: 'start', behavior: 'instant' });
    show();

    if (typeof ResizeObserver === 'undefined' || !listRef.current) return undefined;
    const observer = new ResizeObserver(show);
    observer.observe(listRef.current);
    const stop = () => observer.disconnect();
    const timer = setTimeout(stop, KEEP_FOR);
    INTERACTIONS.forEach((name) => window.addEventListener(name, stop, { once: true, passive: true }));
    return () => {
      stop();
      clearTimeout(timer);
      INTERACTIONS.forEach((name) => window.removeEventListener(name, stop));
    };
  }, [number, listRef]);
}
