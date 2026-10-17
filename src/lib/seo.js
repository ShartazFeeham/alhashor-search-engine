import { formatNumber } from './digits';
import { hadisHref } from './hadisRoute';
import { splitHadis } from './hadisText';
import { SITE_NAME, absoluteUrl } from './site';

// Hadis texts are packed 100 to a shard for the server (scripts/build-text-shards.mjs uses the
// same rule): numbers 1 to 100 are shard 0, 101 to 200 shard 1, and so on.
export const SHARD_SIZE = 100;

export const shardOf = (number) => Math.floor((number - 1) / SHARD_SIZE);

// "BUK", 6628 -> "BUK-66.json"
export const shardFile = (code, number) => `${code}-${shardOf(number)}.json`;

// The page title, as the hadis page has always had it.
export function titleFor(book, number) {
  return `${book.full} - হাদীস নং ${formatNumber(number)} - Alhashor`;
}

const DESCRIPTION_LENGTH = 160;

// The summary shown in search results and link previews: the saying only (no number, no narrator
// chain), on one line, cut at a word boundary near 160 characters with an ellipsis.
export function descriptionFor(text) {
  if (typeof text !== 'string') return '';
  const body = splitHadis(text).body.replace(/\s+/g, ' ').trim();
  if (body.length <= DESCRIPTION_LENGTH) return body;
  const head = body.slice(0, DESCRIPTION_LENGTH);
  // The cut is clean when the next character is a space; otherwise drop the half word.
  const kept = /\s/.test(body[DESCRIPTION_LENGTH]) ? head : head.replace(/\s+\S*$/, '') || head;
  return `${kept.trimEnd()}…`;
}

// The link-preview picture: 1200 x 630, the same card for every page of the site.
export const ogImage = () => ({ url: absoluteUrl('/og/islam.jpg'), width: 1200, height: 630, type: 'image/jpeg', alt: SITE_NAME });

// The head tags of an ordinary page: its own title and description, canonical address and a
// large link-preview card. `path` is the page's address on this site, e.g. "/daily".
export function pageMetadata({ title, description, path }) {
  const url = absoluteUrl(path);
  const desc = description || undefined;
  return {
    title,
    ...(desc && { description: desc }),
    alternates: { canonical: url },
    openGraph: { type: 'website', siteName: SITE_NAME, locale: 'bn_BD', url, title, ...(desc && { description: desc }), images: [ogImage()] },
    twitter: { card: 'summary_large_image', title, ...(desc && { description: desc }), images: [{ url: ogImage().url, alt: SITE_NAME }] },
  };
}

// The tags a hadis page puts in its HTML head: title, description, canonical address and the
// link-preview (Open Graph and Twitter) tags. `text` is the hadis text, or null when the hadis
// has no file (that page is kept out of search results), or undefined when it could not be read.
export function hadisMetadata(book, number, text) {
  const title = titleFor(book, number);
  const description = descriptionFor(text) || `${book.cite}, হাদীস নং ${formatNumber(number)}`;
  const url = absoluteUrl(hadisHref(book.id, number));
  const metadata = {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { type: 'article', siteName: SITE_NAME, locale: 'bn_BD', url, title, description, images: [ogImage()] },
    twitter: { card: 'summary_large_image', title, description, images: [{ url: ogImage().url, alt: SITE_NAME }] },
  };
  if (text === null) metadata.robots = { index: false, follow: true };
  return metadata;
}
