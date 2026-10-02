import { GET } from '../app/daily/rss.xml/route';
import { metadata as dailyMetadata } from '../app/daily/page';
import { realShortList, realText } from '../test/hadisFixtures';
import { pickDaily } from './dailyPick';
import { dailyFeedXml, dhakaToday, escapeXml, feedEntries, pubDateOf } from './rss';

const list = realShortList();
const NOW = new Date(Date.UTC(2026, 9, 2, 10, 0)); // 2 October 2026, 16:00 in Bangladesh
const parse = (xml) => new DOMParser().parseFromString(xml, 'application/xml');
const textOf = (node, tag) => node.getElementsByTagName(tag)[0]?.textContent;

test('escapeXml escapes the five special characters and drops characters XML cannot hold', () => {
  expect(escapeXml('a & b < c > "d" \'e\'')).toBe('a &amp; b &lt; c &gt; &quot;d&quot; &apos;e&apos;');
  expect(escapeXml('ক\u0001খ')).toBe('কখ');
  expect(escapeXml('& already &amp;')).toBe('&amp; already &amp;amp;');
});

test('the date is the one in Bangladesh: just after 18:00 UTC is already tomorrow there', () => {
  expect(dhakaToday(new Date(Date.UTC(2026, 9, 2, 17, 59))).getDate()).toBe(2);
  expect(dhakaToday(new Date(Date.UTC(2026, 9, 2, 18, 1))).getDate()).toBe(3);
  expect(dhakaToday(new Date(Date.UTC(2026, 11, 31, 20, 0)))).toEqual(new Date(2027, 0, 1, 12));
});

test('there are 14 entries, newest first, one per day, the same picks as the daily page', () => {
  const entries = feedEntries(list, NOW);
  expect(entries).toHaveLength(14);
  expect(entries.map((entry) => entry.date.getDate())).toEqual([2, 1, 30, 29, 28, 27, 26, 25, 24, 23, 22, 21, 20, 19]);
  const today = pickDaily(list, new Date(2026, 9, 2));
  expect([entries[0].book.id, entries[0].number]).toEqual([today.book.id, today.number]);
  const earlier = pickDaily(list, new Date(2026, 8, 19));
  expect([entries[13].book.id, entries[13].number]).toEqual([earlier.book.id, earlier.number]);
});

test('no hadis appears twice in the feed', () => {
  const keys = feedEntries(list, NOW).map((entry) => `${entry.book.id}-${entry.number}`);
  expect(new Set(keys).size).toBe(14);
});

test('a day is dated from its start in Bangladesh, in RFC 822 form', () => {
  expect(pubDateOf(new Date(2026, 9, 2, 12))).toBe('Thu, 01 Oct 2026 18:00:00 GMT');
});

test('the feed is well-formed RSS 2.0 with a channel and one item per entry', () => {
  const entries = feedEntries(list, NOW);
  const texts = Object.fromEntries(entries.map(({ book, number }) => [`${book.id}-${number}`, realText(book.id, number)]));
  const doc = parse(dailyFeedXml(entries, texts, NOW));
  expect(doc.getElementsByTagName('parsererror')).toHaveLength(0);
  expect(doc.documentElement.nodeName).toBe('rss');
  expect(doc.documentElement.getAttribute('version')).toBe('2.0');
  const channel = doc.getElementsByTagName('channel')[0];
  expect(textOf(channel, 'language')).toBe('bn');
  expect(textOf(channel, 'link')).toBe('https://hadis.feeham.com/daily');
  expect(doc.getElementsByTagName('item')).toHaveLength(14);
});

test('an item has the citation as title, the text as description, the hadis address and a date', () => {
  const entries = feedEntries(list, NOW);
  const first = entries[0];
  const text = realText(first.book.id, first.number);
  const doc = parse(dailyFeedXml(entries, { [`${first.book.id}-${first.number}`]: text }, NOW));
  const item = doc.getElementsByTagName('item')[0];
  expect(textOf(item, 'title')).toBe(`${first.book.cite}, হাদীস নং ${first.number.toLocaleString('en-US').replace(/[0-9]/g, (d) => '০১২৩৪৫৬৭৮৯'[d])}`);
  expect(textOf(item, 'description')).toBe(text);
  expect(textOf(item, 'link')).toBe(`https://hadis.feeham.com/hadis/${first.book.slug}/${first.number}`);
  expect(textOf(item, 'guid')).toBe(textOf(item, 'link'));
  expect(item.getElementsByTagName('guid')[0].getAttribute('isPermaLink')).toBe('true');
  expect(textOf(item, 'pubDate')).toBe('Thu, 01 Oct 2026 18:00:00 GMT');
  const dates = [...doc.getElementsByTagName('pubDate')].map((node) => Date.parse(node.textContent));
  expect(dates).toEqual([...dates].sort((a, b) => b - a));
});

test('markup characters in a text cannot break the feed', () => {
  const entries = feedEntries(list, NOW).slice(0, 1);
  const key = `${entries[0].book.id}-${entries[0].number}`;
  const doc = parse(dailyFeedXml(entries, { [key]: '<b>& "quote" ]]></b>' }, NOW));
  expect(doc.getElementsByTagName('parsererror')).toHaveLength(0);
  expect(textOf(doc.getElementsByTagName('item')[0], 'description')).toBe('<b>& "quote" ]]></b>');
});

test('an entry whose text could not be read is listed with its citation only', () => {
  const doc = parse(dailyFeedXml(feedEntries(list, NOW).slice(0, 2), {}, NOW));
  expect(doc.getElementsByTagName('item')).toHaveLength(2);
  expect(doc.getElementsByTagName('description')).toHaveLength(1); // only the channel's own
});

test('the route answers with RSS read from the real texts', async () => {
  const response = await GET();
  expect(response.headers.get('content-type')).toBe('application/rss+xml; charset=utf-8');
  const doc = parse(await response.text());
  expect(doc.getElementsByTagName('parsererror')).toHaveLength(0);
  const items = [...doc.getElementsByTagName('item')];
  expect(items).toHaveLength(14);
  for (const item of items) expect(textOf(item, 'description').length).toBeGreaterThan(10);
});

test('the daily page announces the feed to feed readers, with no other change to its title', () => {
  expect(dailyMetadata.alternates.types['application/rss+xml']).toBe('/daily/rss.xml');
  expect(dailyMetadata.title).toBe('আজকের হাদীস - BoiKotha');
});

test('the route is rebuilt at most once an hour', async () => {
  const route = await import('../app/daily/rss.xml/route');
  expect(route.revalidate).toBe(3600);
});
