'use client';

import { formatDate, weekdayName } from '../lib/bnDate';
import { tagOf } from '../lib/hadisRoute';
import { useSettings } from '../settings/SettingsProvider';
import ResultItem from '../search/ResultItem';

const isoDate = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

// The pick of each of the last seven days, newest first. Each is the same card as the hadis in the
// search, book and narrator listings (ResultItem), with its date on top and the saying only.
export default function RecentList({ entries }) {
  const { settings } = useSettings();
  return (
    <section className="daily-recent" aria-labelledby="daily-recent-title">
      <h2 className="h2" id="daily-recent-title">গত ৭ দিন</h2>
      <ol className="search-list" aria-label="গত ৭ দিনের হাদীস">
        {entries.map(({ date, pick }) => (
          <ResultItem
            key={date.getTime()}
            tag={tagOf(pick.book.id, pick.number)}
            plain
            core
            dateLabel={
              <>
                <time dateTime={isoDate(date)}>{formatDate(date, settings.digits)}</time>
                <span>{weekdayName(date)}</span>
              </>
            }
          />
        ))}
      </ol>
    </section>
  );
}
