import { sitemapEntries, sitemapIdOf, sitemapIds, sitemapXml } from '../../../lib/sitemap';

// One sitemap per book at /sitemap/<position>.xml, written at build time (6 small files). Hand
// made rather than a Next.js `sitemap.js` with generateSitemaps: Next.js refuses a route at
// /sitemap.xml next to that file, and the index must live at /sitemap.xml.
export const dynamic = 'force-static';
export const dynamicParams = false;

export function generateStaticParams() {
  return sitemapIds().map(({ id }) => ({ id: `${id}.xml` }));
}

export async function GET(_request, { params }) {
  const id = sitemapIdOf((await params).id);
  if (id === null) return new Response('Not found', { status: 404 });
  return new Response(sitemapXml(sitemapEntries(id)), {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
}
