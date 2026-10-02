import { matchHas } from 'next/dist/shared/lib/router/utils/prepare-destination';
import nextConfig from '../next.config.mjs';

// The first rule whose path and query conditions match the old address: where it goes.
async function target(address) {
  const url = new URL(address, 'http://localhost');
  const query = Object.fromEntries(url.searchParams);
  for (const rule of await nextConfig.redirects()) {
    // Every source here is a literal path, or a literal path plus one :param segment.
    const pathPattern = new RegExp(`^${rule.source.replace(/:(\w+)/, '(?<$1>[^/]+)')}$`);
    const path = pathPattern.exec(url.pathname);
    if (!path) continue;
    const found = rule.has ? matchHas({ headers: {}, url: url.pathname + url.search }, query, rule.has) : {};
    if (!found) continue;
    const params = { ...found, ...path.groups };
    return { to: rule.destination.replace(/:(\w+)/g, (_, key) => params[key]), permanent: rule.permanent };
  }
  return null;
}

test('/daily?tab=plans goes to /top-picks, permanently', async () => {
  expect(await target('/daily?tab=plans')).toEqual({ to: '/top-picks', permanent: true });
});

test('/daily?tab=plans&plan=<id> goes to /top-picks/<id>, permanently', async () => {
  expect(await target('/daily?tab=plans&plan=ramadan-30')).toEqual({ to: '/top-picks/ramadan-30', permanent: true });
  expect(await target('/daily?plan=short-40&tab=plans')).toEqual({ to: '/top-picks/short-40', permanent: true });
});

test('the plain daily page and other tabs are not redirected', async () => {
  expect(await target('/daily')).toBeNull();
  expect(await target('/daily?tab=today')).toBeNull();
});

test('an old /plans route redirects too', async () => {
  expect(await target('/plans')).toEqual({ to: '/top-picks', permanent: true });
  expect(await target('/plans/character-7')).toEqual({ to: '/top-picks/character-7', permanent: true });
});
