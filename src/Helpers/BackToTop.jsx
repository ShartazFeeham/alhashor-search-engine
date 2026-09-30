'use client';

import { useEffect, useState } from 'react';
import Icon from '../ui/Icon';

const SHOW_AFTER = 300;

// A round button that appears once the page has been scrolled down and jumps back to the top.
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
    <div
      className={shown ? 'ui-fab show' : 'ui-fab'}
      role="button"
      tabIndex={shown ? 0 : -1}
      aria-label="Back to top"
      onClick={toTop}
      onKeyDown={(event) => {
        if (event.key === 'Enter') toTop();
      }}
    >
      <Icon name="up" size={20} />
    </div>
  );
}
