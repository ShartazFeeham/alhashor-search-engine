import * as sitemapRoute from '../app/sitemap/[id]/route';
import robots from '../app/robots';
import { GET } from '../app/sitemap.xml/route';
import { BOOKS, hadisCount } from './books';
import { STATIC_PATHS, sitemapEntries, sitemapIdOf, sitemapIndexXml, sitemapUrl } from './sitemap';

// Reading 33,000 addresses is quick alone but not when the whole suite runs at once.
vi.setConfig({ testTimeout: 30000 });

const request = (part) => sitemapRoute.GET(new Request('https://hadis.feeham.com/'), { params: Promise.resolve({ id: part }) }); // Next.js 16: params is a promise
const parse = (xml) => new DOMParser().parseFromString(xml, 'application/xml');
// The addresses a sitemap lists, read from the XML the route really answers with (read once each:
// the six sitemaps hold 33,000 addresses).
const listed = new Map();
const urlsOf = async (id) => {
  if (!listed.has(id)) {
    const xml = await (await request(`${id}.xml`)).text();
    listed.set(id, [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]));
  }
  return listed.get(id);
};

test('there is one sitemap per book, built at build time with no other id possible', () => {
  expect(sitemapRoute.generateStaticParams()).toEqual(['0', '1', '2', '3', '4', '5'].map((id) => ({ id: `${id}.xml` })));
  expect(sitemapRoute.dynamicParams).toBe(false);
  expect(sitemapRoute.dynamic).toBe('force-static');
});

test('a sitemap is well-formed XML with one <url> per hadis, and only a real book has one', async () => {
  const response = await request('2.xml');
  expect(response.status).toBe(200);
  expect(response.headers.get('content-type')).toMatch(/application\/xml/);
  const doc = parse(await response.text());
  expect(doc.getElementsByTagName('parsererror')).toHaveLength(0);
  expect(doc.documentElement.nodeName).toBe('urlset');
  expect(doc.getElementsByTagName('url')).toHaveLength(hadisCount(BOOKS[2]));
  for (const part of ['6.xml', '2', 'x.xml', '-1.xml']) expect((await request(part)).status).toBe(404);
  expect(['0.xml', '5.xml', '6.xml', '0', undefined].map(sitemapIdOf)).toEqual([0, 5, null, null, null]);
});

test('each book lists exactly the hadis that exist', async () => {
  for (const [id, book] of BOOKS.entries()) {
    const hadis = (await urlsOf(id)).filter((url) => url.includes('/hadis/'));
    expect(hadis).toHaveLength(hadisCount(book));
  }
});

test('all sitemaps together list 32,886 hadis plus the static pages', async () => {
  let total = 0;
  for (let id = 0; id < BOOKS.length; id++) total += (await urlsOf(id)).length;
  expect(total).toBe(32886 + STATIC_PATHS.length);
});

test('a number with no file is absent: Bukhari 63 and 448, but 62 and 64 are there', async () => {
  const urls = new Set(await urlsOf(0));
  expect(urls.has('https://hadis.feeham.com/hadis/bukhari/63')).toBe(false);
  expect(urls.has('https://hadis.feeham.com/hadis/bukhari/448')).toBe(false);
  expect(urls.has('https://hadis.feeham.com/hadis/bukhari/62')).toBe(true);
  expect(urls.has('https://hadis.feeham.com/hadis/bukhari/64')).toBe(true);
  expect(urls.has('https://hadis.feeham.com/hadis/bukhari/7053')).toBe(true);
});

test('every address is absolute, on the site, and appears once', async () => {
  const seen = new Set();
  for (let id = 0; id < BOOKS.length; id++) {
    for (const url of await urlsOf(id)) {
      expect(url.startsWith('https://hadis.feeham.com/')).toBe(true);
      expect(seen.has(url)).toBe(false);
      seen.add(url);
    }
  }
});

test('only the first sitemap has the static pages, and utility pages are not among them', async () => {
  const first = await urlsOf(0);
  expect(first.slice(0, 3)).toEqual(['https://hadis.feeham.com/', 'https://hadis.feeham.com/books', 'https://hadis.feeham.com/books/bukhari']);
  for (const path of ['/topics', '/daily', '/top-picks', '/top-picks/ramadan-30', '/narrators']) expect(first).toContain(`https://hadis.feeham.com${path}`);
  for (const path of ['/search', '/settings', '/share']) {
    expect(first.some((url) => url.startsWith(`https://hadis.feeham.com${path}`))).toBe(false);
  }
  expect((await urlsOf(1)).some((url) => !url.includes('/hadis/'))).toBe(false);
});

test('an id that is not a book has no entries', () => {
  expect(sitemapEntries(9)).toEqual([]);
  expect(sitemapEntries(-1)).toEqual([]);
});

test('the index points at the six real sitemap addresses', async () => {
  const response = GET();
  expect(response.headers.get('content-type')).toMatch(/application\/xml/);
  const xml = await response.text();
  expect(xml).toBe(sitemapIndexXml());
  expect(xml).toMatch(/^<\?xml version="1.0" encoding="UTF-8"\?>\n<sitemapindex xmlns="http:\/\/www.sitemaps.org\/schemas\/sitemap\/0.9">/);
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
  expect(locs).toEqual([0, 1, 2, 3, 4, 5].map((id) => `https://hadis.feeham.com/sitemap/${id}.xml`));
  expect(locs[2]).toBe(sitemapUrl(2));
});

test('robots lets everything in except the utility pages and points at the sitemap index', () => {
  const rules = robots();
  expect(rules.rules).toEqual({ userAgent: '*', allow: '/', disallow: ['/search', '/share/', '/settings'] });
  expect(rules.sitemap).toBe('https://hadis.feeham.com/sitemap.xml');
});
