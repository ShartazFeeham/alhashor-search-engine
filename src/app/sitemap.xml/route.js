import { sitemapIndexXml } from '../../lib/sitemap';

// The index of the per-book sitemaps in src/app/sitemap/[id]/route.js. Static: written at build time.
export const dynamic = 'force-static';

export function GET() {
  return new Response(sitemapIndexXml(), {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
}
