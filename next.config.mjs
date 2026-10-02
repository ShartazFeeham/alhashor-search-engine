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
  // Pin the project root: there is another package-lock.json higher up in the home folder.
  turbopack: { root: path.dirname(fileURLToPath(import.meta.url)) },
  outputFileTracingIncludes: {
    '/hadis/*/*': withShards,
    '/daily/rss.xml': withShards,
  },
  outputFileTracingExcludes: {
    '/*': withoutPublic,
  },
};

export default nextConfig;
