'use client';

import { useEffect, useState } from 'react';
import { readingTime } from '../lib/hadisText';
import { useDigits } from '../lib/useDigits';

// Reading time and word count, with a thin line that fills as the article is scrolled through.
export default function ReadingProgress({ words, targetId }) {
  const digits = useDigits();
  const [percent, setPercent] = useState(0);

  useEffect(() => {
    const update = () => {
      const article = document.getElementById(targetId);
      if (!article) return;
      const { top, height } = article.getBoundingClientRect();
      const scrollable = height - window.innerHeight;
      const done = scrollable > 0 ? (-top / scrollable) * 100 : top < 0 ? 100 : 0;
      setPercent(Math.round(Math.min(100, Math.max(0, done))));
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [targetId]);

  return (
    <div className="hadis-progress">
      <div className="hadis-progress-meta">
        <span>{readingTime(words)} · {digits(words)} শব্দ</span>
      </div>
      <div
        className="hadis-progress-bar"
        role="progressbar"
        aria-label="পড়ার অগ্রগতি"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
      >
        <i style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
