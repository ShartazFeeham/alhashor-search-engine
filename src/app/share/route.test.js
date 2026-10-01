import { generateMetadata } from './[book]/[number]/page';

test('the title names the share page, the book and the number in Bengali', async () => {
  const metadata = await generateMetadata({ params: Promise.resolve({ book: 'bukhari', number: '6628' }) });
  expect(metadata.title).toBe('শেয়ার - বুখারী শরীফ - হাদীস নং ৬,৬২৮ - BoiKotha');
});

test('an invalid address gets the not-found title', async () => {
  const metadata = await generateMetadata({ params: Promise.resolve({ book: 'bukhari', number: '0' }) });
  expect(metadata.title).toBe('পৃষ্ঠাটি পাওয়া যায়নি - BoiKotha');
});

test('an invalid address asks Next.js for a 404', async () => {
  const { default: Page } = await import('./[book]/[number]/page');
  for (const [book, number] of [['nobook', '1'], ['bukhari', '0'], ['bukhari', '99999'], ['bukhari', 'abc']]) {
    await expect(Page({ params: Promise.resolve({ book, number }) })).rejects.toThrow(/NEXT_HTTP_ERROR_FALLBACK;404|NEXT_NOT_FOUND/);
  }
});

test('a valid address renders the share page', async () => {
  const { default: Page } = await import('./[book]/[number]/page');
  const element = await Page({ params: Promise.resolve({ book: 'bukhari', number: '6628' }) });
  expect(element.props).toMatchObject({ bookId: 'bukhari', number: 6628 });
});
