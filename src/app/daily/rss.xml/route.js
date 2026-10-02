import shortHadis from '../../../../public/json/short-hadis.json';
import { getHadisText } from '../../../lib/hadisServer';
import { dailyFeedXml, feedEntries } from '../../../lib/rss';

// The feed changes once a day, so it is rebuilt at most once an hour.
export const revalidate = 3600;

export async function GET() {
  const now = new Date();
  const entries = feedEntries(shortHadis, now);
  const texts = {};
  await Promise.all(
    entries.map(async ({ book, number }) => {
      texts[`${book.id}-${number}`] = await getHadisText(book.id, number);
    }),
  );
  return new Response(dailyFeedXml(entries, texts, now), {
    headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' },
  });
}
