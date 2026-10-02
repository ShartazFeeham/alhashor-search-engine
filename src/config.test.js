import { readFileSync } from 'node:fs';
import path from 'node:path';

const read = (file) => readFileSync(path.resolve(process.cwd(), file), 'utf8');

test('Next.js usage reporting is switched off for every script that runs it', () => {
  const { scripts } = JSON.parse(read('package.json'));
  for (const name of ['dev', 'build', 'start']) {
    expect(scripts[name]).toContain('NEXT_TELEMETRY_DISABLED=1');
  }
});

test('and in CI', () => {
  expect(read('.github/workflows/ci.yml')).toMatch(/NEXT_TELEMETRY_DISABLED:\s*"?1"?/);
});

test('the dev server accepts the home Wi-Fi, so a phone can load its scripts (else the page never hydrates)', async () => {
  const { default: config } = await import(path.resolve(process.cwd(), 'next.config.mjs'));
  expect(config.allowedDevOrigins).toEqual(expect.arrayContaining(['192.168.*.*', '*.local', 'localhost']));
});
