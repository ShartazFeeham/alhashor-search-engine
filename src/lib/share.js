import { formatNumber } from './digits';
import { splitHadis } from './hadisText';

// A narrator line longer than this is left out of what is shared (the saying matters most).
const MAX_NARRATOR_LENGTH = 80;
// A text longer than this is shared as an excerpt with a link to the full page.
const MAX_SHARE_CHARS = 450;
const ELLIPSIS = ' ...';

// "সহীহ বুখারী, হাদীস নং ১২৩"
export function citation(book, number, digitStyle = 'bn') {
  return `${book.cite}, হাদীস নং ${formatNumber(number, digitStyle)}`;
}

// The text cut at a word boundary with " ..." so the whole result is at most maxChars long.
// A text that already fits is returned as it is.
export function excerptFor(text, maxChars) {
  if (text.length <= maxChars) return text;
  const room = Math.max(0, maxChars - ELLIPSIS.length);
  const head = text.slice(0, room);
  // Cut at the last space, unless the next character is itself a space (the head ends on a word).
  const atBoundary = /\s/.test(text[room]);
  const kept = atBoundary ? head : head.replace(/\s+\S*$/, '');
  return `${(kept || head).trimEnd()}${ELLIPSIS}`;
}

// The saying without its leading hadis number. The narrator line stays only when it is short.
export function cleanText(text) {
  const { chain, body } = splitHadis(text);
  return chain && chain.length <= MAX_NARRATOR_LENGTH ? `${chain}\n${body}` : body;
}

// What the copy button puts on the clipboard: the whole text, a blank line, the citation.
export function textWithCitation(text, cite) {
  return `${text}\n\n${cite}`;
}

// The quote-card page of a hadis.
export function shareHref(bookId, number) {
  return `/share/${bookId}/${number}`;
}

// "https://host/hadis/bukhari/6" -> "host/hadis/bukhari/6", for a short written link.
export function shortLink(url) {
  return url.replace(/^https?:\/\//, '');
}

// What is shared as text: the clean saying (an excerpt when it is long), a blank line, the
// citation and the permanent link, each on its own line. Without a url the link line is left out
// (the native share sheet gets the url separately).
export function shareText({ book, number, text, url, digitStyle = 'bn', maxChars = MAX_SHARE_CHARS }) {
  const clean = cleanText(text);
  const cut = clean.length > maxChars;
  const lines = [cut ? excerptFor(clean, maxChars) : clean, '', citation(book, number, digitStyle)];
  if (url) lines.push(cut ? `সম্পূর্ণ হাদীস: ${url}` : url);
  return lines.join('\n');
}
