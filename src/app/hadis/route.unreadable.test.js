import { vi } from 'vitest';

vi.mock('../../lib/hadisServer', () => ({ getHadisText: vi.fn(() => Promise.resolve(null)) }));

const at = (book, number) => ({ params: Promise.resolve({ book, number }) });

test('a hadis that exists but cannot be read is not reported as missing: the browser fetches it', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  const { default: Page, generateMetadata } = await import('./[book]/[number]/page');
  const element = await Page(at('muslim', '5'));
  expect(element.props.initialText).toBeUndefined();
  const metadata = await generateMetadata(at('muslim', '5'));
  expect(metadata.robots).toBeUndefined();
  expect(metadata.description).toBe('সহীহ মুসলিম, হাদীস নং ৫');
});
