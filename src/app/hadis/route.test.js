import { realText } from '../../test/hadisFixtures';
import Page, * as route from './[book]/[number]/page';

const { generateMetadata } = route;
const at = (book, number) => ({ params: Promise.resolve({ book, number }) });

test('the title names the book and the number in Bengali', async () => {
  const metadata = await generateMetadata(at('bukhari', '6628'));
  expect(metadata.title).toBe('বুখারী শরীফ - হাদীস নং ৬,৬২৮ - Alhashor');
});

test('the description is the saying, and the preview tags and canonical address are absolute', async () => {
  const metadata = await generateMetadata(at('bukhari', '6628'));
  expect(metadata.description.startsWith('তিনি বলেন, বর্তমান যুগের মুনাফিকরা')).toBe(true);
  expect(metadata.alternates.canonical).toBe('https://islam.feeham.com/hadis/bukhari/6628');
  expect(metadata.openGraph).toMatchObject({ type: 'article', url: 'https://islam.feeham.com/hadis/bukhari/6628', locale: 'bn_BD' });
  expect(metadata.twitter.card).toBe('summary');
});

test('a number with no file is titled as usual but kept out of search results', async () => {
  const metadata = await generateMetadata(at('bukhari', '63'));
  expect(metadata.title).toBe('বুখারী শরীফ - হাদীস নং ৬৩ - Alhashor');
  expect(metadata.robots).toEqual({ index: false, follow: true });
});

test('an invalid address gets the not-found title and is kept out of search results', async () => {
  const metadata = await generateMetadata(at('bukhari', '0'));
  expect(metadata.title).toBe('পৃষ্ঠাটি পাওয়া যায়নি - Alhashor');
  expect(metadata.robots).toEqual({ index: false });
});

test('an invalid address asks Next.js for a 404', async () => {
  for (const [book, number] of [['nobook', '1'], ['bukhari', '0'], ['bukhari', '99999'], ['bukhari', 'abc']]) {
    await expect(Page(at(book, number))).rejects.toThrow(/NEXT_HTTP_ERROR_FALLBACK;404|NEXT_NOT_FOUND/);
  }
});

test('a valid address renders the hadis page with its text, so the text is in the server HTML', async () => {
  const element = await Page(at('bukhari', '6628'));
  expect(element.props).toMatchObject({ bookId: 'bukhari', number: 6628, initialText: realText('bukhari', 6628) });
});

test('a number with no file renders the page with null, which shows the message (status 200, noindex)', async () => {
  const element = await Page(at('bukhari', '63'));
  expect(element.props).toMatchObject({ bookId: 'bukhari', number: 63, initialText: null });
});

test('the route is built on demand and cached for a year, not rendered on every request', () => {
  expect(route.generateStaticParams()).toEqual([]);
  expect(route.dynamicParams).toBe(true);
  expect(route.revalidate).toBe(31536000);
});
