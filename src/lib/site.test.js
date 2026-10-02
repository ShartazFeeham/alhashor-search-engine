import { SITE_NAME, SITE_URL, absoluteUrl } from './site';

test('the site address has no trailing slash and defaults to the live domain', () => {
  expect(SITE_URL).toBe('https://hadis.feeham.com');
  expect(SITE_URL.endsWith('/')).toBe(false);
});

test('absoluteUrl joins a path to the site address', () => {
  expect(absoluteUrl('/hadis/bukhari/6628')).toBe('https://hadis.feeham.com/hadis/bukhari/6628');
  expect(absoluteUrl('daily')).toBe('https://hadis.feeham.com/daily');
  expect(absoluteUrl('/')).toBe('https://hadis.feeham.com/');
});

test('the site name is the one shown in the shell', () => {
  expect(SITE_NAME).toBe('Alhashor');
});

test('the layout sets metadataBase once, from the site address', async () => {
  const { metadata } = await import('../app/layout');
  expect(metadata.metadataBase.href).toBe('https://hadis.feeham.com/');
});
