import { BOOKS, hasHadis } from './books';
import { absoluteUrl } from './site';
import { TOP_PICKS } from './topPicks';

// The pages worth finding in a search engine that are not a single hadis. Utility pages
// (search, settings, share) are left out and kept out by robots.js.
export const STATIC_PATHS = [
  '/',
  '/books',
  ...BOOKS.map((book) => `/books/${book.slug}`),
  '/topics',
  '/daily',
  '/top-picks',
  ...TOP_PICKS.map((set) => `/top-picks/${set.id}`),
  '/narrators',
];

// One sitemap per book (the biggest has 7,281 addresses; a sitemap may hold 50,000).
export const sitemapIds = () => BOOKS.map((_, id) => ({ id }));

// The address of sitemap `id` (served by src/app/sitemap/[id]/route.js).
export const sitemapUrl = (id) => absoluteUrl(`/sitemap/${id}.xml`);

// The route's `id` part ("3.xml") as the position of a book, or null when it is not one.
export function sitemapIdOf(part) {
  const match = /^(\d+)\.xml$/.exec(part ?? '');
  return match && Number(match[1]) < BOOKS.length ? Number(match[1]) : null;
}

// Every hadis that exists in one book (numbers with no file are skipped).
export function hadisUrls(book) {
  const urls = [];
  for (let number = 1; number <= book.total; number++) {
    if (hasHadis(book, number)) urls.push(absoluteUrl(`/hadis/${book.slug}/${number}`));
  }
  return urls;
}

// The entries of sitemap `id` (the position of the book); the first one also lists the static pages.
export function sitemapEntries(id) {
  const book = BOOKS[id];
  if (!book) return [];
  const pages = id === 0 ? STATIC_PATHS.map((path) => ({ url: absoluteUrl(path) })) : [];
  return [...pages, ...hadisUrls(book).map((url) => ({ url }))];
}

const escape = (text) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const HEADER = '<?xml version="1.0" encoding="UTF-8"?>\n';

// One sitemap as XML.
export function sitemapXml(entries) {
  const items = entries.map(({ url }) => `<url><loc>${escape(url)}</loc></url>`);
  return `${HEADER}<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${items.join('\n')}\n</urlset>\n`;
}

// The sitemap index: a list of the sitemaps above.
export function sitemapIndexXml() {
  const items = sitemapIds().map(({ id }) => `  <sitemap><loc>${sitemapUrl(id)}</loc></sitemap>`);
  return `${HEADER}<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${items.join('\n')}\n</sitemapindex>\n`;
}
