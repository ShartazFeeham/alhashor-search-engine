import path from 'node:path';
import { fileURLToPath } from 'node:url';

// The hadis texts, packed into .data/hadis by scripts/build-text-shards.mjs (`prebuild`), are read
// from disk by the routes that render a text on the server. Next.js cannot see that from the code
// (the file names are made at run time), so say so: the files travel with those functions.
// Keys are route paths (picomatch); `*` stands for [book] and [number].
const withShards = ['./.data/**/*'];
// Nothing the server renders reads public/ from disk (the host serves it from its CDN), so keep the
// 33,000 data files out of every function's bundle.
const withoutPublic = ['./public/**/*'];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Dev only (`next build` and production never read it). The dev server answers
  // its own /_next/* scripts and the HMR socket only to localhost unless the page's address is
  // listed here. Opened from a phone at http://192.168.x.x:3000 the HTML arrives but every script
  // is refused (403), so the page never hydrates: no search, no daily card. Patterns match the
  // hostname only (one label per `*`): the home Wi-Fi (its address changes on reconnect), the
  // other private ranges, and Bonjour names such as my-mac.local.
  allowedDevOrigins: ['localhost', '127.0.0.1', '192.168.*.*', '10.*.*.*', '172.*.*.*', '*.local'],
  // Dev only: hide the round "N" dev-tools indicator that floats at the bottom-left of every page.
  devIndicators: false,
  // Pin the project root: there is another package-lock.json higher up in the home folder.
  turbopack: { root: path.dirname(fileURLToPath(import.meta.url)) },
  // The reading plans moved out of the daily page into /top-picks (permanent). `has` matches the
  // old query: ?tab=plans&plan=<id> opens that set, ?tab=plans the list.
  async redirects() {
    return [
      {
        source: '/daily',
        has: [{ type: 'query', key: 'plan', value: '(?<plan>[a-z0-9-]+)' }],
        destination: '/top-picks/:plan',
        permanent: true,
      },
      {
        source: '/daily',
        has: [{ type: 'query', key: 'tab', value: 'plans' }],
        destination: '/top-picks',
        permanent: true,
      },
      { source: '/plans', destination: '/top-picks', permanent: true },
      { source: '/plans/:plan', destination: '/top-picks/:plan', permanent: true },
    ];
  },
  outputFileTracingIncludes: {
    '/hadis/*/*': withShards,
    '/daily/rss.xml': withShards,
  },
  outputFileTracingExcludes: {
    '/*': withoutPublic,
  },
};

export default nextConfig;
