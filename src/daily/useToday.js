'use client';

import { useEffect, useState } from 'react';
import { dayNumber } from '../lib/dailyPick';

// Today's date on the visitor's own clock, or null until the page has loaded in the browser (a
// pre-built page cannot know the visitor's date). It moves on to the next day when the visitor
// comes back to the page after midnight.
export function useToday() {
  const [today, setToday] = useState(null);

  useEffect(() => {
    const update = () => setToday((current) => (current && dayNumber(current) === dayNumber(new Date()) ? current : new Date()));
    update();
    document.addEventListener('visibilitychange', update);
    window.addEventListener('focus', update);
    return () => {
      document.removeEventListener('visibilitychange', update);
      window.removeEventListener('focus', update);
    };
  }, []);

  return today;
}
