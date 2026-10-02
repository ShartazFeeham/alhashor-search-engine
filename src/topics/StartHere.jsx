'use client';

import HadisCard from '../hadis/HadisCard';
import { useDigits } from '../lib/useDigits';
import Icon from '../ui/Icon';

// The editor's "start here" picks for a topic: numbered, each with its short note above the
// shared hadis card. `entries` is [{ book, number, note }] (see src/data/curatedTopics.js).
export default function StartHere({ entries }) {
  const digits = useDigits();
  if (entries.length === 0) return null;
  return (
    <section className="topics-start" aria-labelledby="topics-start-title">
      <div className="topics-start-head">
        <h2 className="h3" id="topics-start-title"><Icon name="star" size={18} />এখান থেকে শুরু করুন</h2>
        <span className="topics-tag">সম্পাদকের বাছাই</span>
      </div>
      <ol className="topics-start-list">
        {entries.map((entry, index) => (
          <li key={`${entry.book}-${entry.number}`} className="topics-start-item">
            <span className="topics-start-no" aria-hidden="true">{digits(index + 1)}</span>
            <div className="topics-start-body">
              <p className="topics-note">{entry.note}</p>
              <HadisCard bookId={entry.book} number={entry.number} level={3} />
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
