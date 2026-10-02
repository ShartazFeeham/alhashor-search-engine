'use client';

import { useEffect, useState } from 'react';
import Icon from '../ui/Icon';

const SHOW_AFTER = 300;

// A round button that appears once the page has been scrolled down and jumps back to the top.
// While it is out of sight it is also out of the tab order and the accessibility tree.
export default function BackToTop() {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const onScroll = () => setShown(window.scrollY > SHOW_AFTER);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const toTop = () => {
    document.documentElement.scrollTop = 0;
  };

  return (
    <button
      type="button"
      className={shown ? 'ui-fab show' : 'ui-fab'}
      tabIndex={shown ? 0 : -1}
      aria-hidden={shown ? undefined : true}
      aria-label="উপরে যান"
      onClick={toTop}
    >
      <Icon name="up" size={20} />
    </button>
  );
}
