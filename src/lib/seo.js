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

// The tags a hadis page puts in its HTML head: title, description, canonical address and the
// link-preview (Open Graph and Twitter) tags. `text` is the hadis text, or null when the hadis
// has no file (that page is kept out of search results), or undefined when it could not be read.
export function hadisMetadata(book, number, text) {
  const title = titleFor(book, number);
  const description = descriptionFor(text) || `${book.cite}, হাদীস নং ${formatNumber(number)}`;
  const url = absoluteUrl(hadisHref(book.id, number));
  const image = { url: absoluteUrl('/logo512.png'), width: 512, height: 512, alt: SITE_NAME };
  const metadata = {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { type: 'article', siteName: SITE_NAME, locale: 'bn_BD', url, title, description, images: [image] },
    twitter: { card: 'summary', title, description, images: [image.url] },
  };
  if (text === null) metadata.robots = { index: false, follow: true };
  return metadata;
}
