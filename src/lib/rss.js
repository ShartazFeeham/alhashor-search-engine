import { getDailyPool, pickDay } from './dailyPool';
import { hadisHref } from './hadisRoute';
import { citation } from './share';
import { SITE_NAME, absoluteUrl } from './site';

const HOUR = 3600000;
const DHAKA_OFFSET = 6 * HOUR; // Bangladesh time, UTC+6 all year
export const FEED_DAYS = 14;

// Characters that are not allowed in XML 1.0 are dropped, then the five special ones are escaped.
export function escapeXml(text) {
  return String(text)
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f￾￿]/g, '') // eslint-disable-line no-control-regex
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// The calendar date in Bangladesh at `now`, as a local Date at noon (dailyPick reads the local
// year, month and day, and noon keeps clock changes from moving it).
export function dhakaToday(now) {
  const shifted = new Date(now.getTime() + DHAKA_OFFSET);
  return new Date(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate(), 12);
}

// The hadis of the day for today and the days before it, newest first: { date, book, number }.
// Same pool as the pages (the featured top-picks sets).
export function feedEntries(now, days = FEED_DAYS, pool = getDailyPool()) {
  const today = dhakaToday(now);
  const entries = [];
  for (let back = 0; back < days; back++) {
    const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() - back, 12);
    const pick = pickDay(date, { pool });
    if (pick) entries.push({ date, book: pick.book, number: pick.number });
  }
  return entries;
}

// The moment the day began in Bangladesh, as an RFC 822 date.
export const pubDateOf = (date) =>
  new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) - DHAKA_OFFSET).toUTCString();

// An RSS 2.0 feed of the entries. `texts` maps "<book id>-<number>" to the hadis text; an entry
// with no text is listed with its citation only.
export function dailyFeedXml(entries, texts, now) {
  const link = absoluteUrl('/daily');
  const items = entries.map(({ date, book, number }) => {
    const url = absoluteUrl(hadisHref(book.id, number));
    const text = texts[`${book.id}-${number}`];
    return [
      '    <item>',
      `      <title>${escapeXml(citation(book, number))}</title>`,
      `      <link>${escapeXml(url)}</link>`,
      `      <guid isPermaLink="true">${escapeXml(url)}</guid>`,
      `      <pubDate>${pubDateOf(date)}</pubDate>`,
      ...(text ? [`      <description>${escapeXml(text)}</description>`] : []),
      '    </item>',
    ].join('\n');
  });
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    '  <channel>',
    `    <title>${escapeXml(`আজকের হাদীস - ${SITE_NAME}`)}</title>`,
    `    <link>${escapeXml(link)}</link>`,
    `    <atom:link href="${escapeXml(absoluteUrl('/daily/rss.xml'))}" rel="self" type="application/rss+xml" />`,
    '    <description>প্রতিদিন একটি ছোট হাদীস।</description>',
    '    <language>bn</language>',
    `    <lastBuildDate>${new Date(now).toUTCString()}</lastBuildDate>`,
    ...items,
    '  </channel>',
    '</rss>',
    '',
  ].join('\n');
}
