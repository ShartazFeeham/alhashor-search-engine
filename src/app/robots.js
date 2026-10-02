import { absoluteUrl } from '../lib/site';

// Everything may be crawled except the utility pages, which have nothing worth indexing.
export default function robots() {
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/search', '/compare', '/share/', '/settings'] },
    sitemap: absoluteUrl('/sitemap.xml'),
  };
}
