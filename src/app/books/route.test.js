import { generateMetadata, generateStaticParams, default as Page } from './[book]/page';

const params = (book) => ({ params: Promise.resolve({ book }) });

test('the title names the book', async () => {
  expect((await generateMetadata(params('muslim'))).title).toBe('মুসলিম শরীফ - হাদীসের বই - Alhashor');
});

test('an unknown book asks Next.js for a 404', async () => {
  await expect(Page(params('nobook'))).rejects.toThrow(/NEXT_HTTP_ERROR_FALLBACK;404|NEXT_NOT_FOUND/);
  expect((await generateMetadata(params('nobook'))).title).toBe('পৃষ্ঠাটি পাওয়া যায়নি - Alhashor');
});

test('every book has an address that renders its page', async () => {
  for (const slug of ['bukhari', 'muslim', 'tirmidhi', 'abudawud', 'ibnmajah', 'nasai']) {
    const element = await Page(params(slug));
    expect(element.props.children.props.bookId).toBe(slug);
  }
});

test('the six book pages are generated ahead of time, not on demand', () => {
  expect(generateStaticParams()).toEqual([
    { book: 'bukhari' }, { book: 'muslim' }, { book: 'tirmidhi' }, { book: 'abudawud' }, { book: 'ibnmajah' }, { book: 'nasai' },
  ]);
});
