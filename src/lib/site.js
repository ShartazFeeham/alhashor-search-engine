// Where the site lives. Absolute addresses are needed in link previews, the sitemap and the
// RSS feed. Set NEXT_PUBLIC_SITE_URL to serve the site from another address.
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://islam.feeham.com').replace(/\/+$/, '');

export const SITE_NAME = 'Alhashor';

// "/hadis/bukhari/6628" -> "https://islam.feeham.com/hadis/bukhari/6628"
export function absoluteUrl(pathname) {
  return `${SITE_URL}${pathname.startsWith('/') ? '' : '/'}${pathname}`;
}
