import { realText } from '../test/hadisFixtures';
import { bookById } from './books';
import { descriptionFor, hadisMetadata, shardFile, shardOf, titleFor } from './seo';

test('hadis are packed 100 to a shard: 1 to 100 in shard 0', () => {
  expect([1, 100, 101, 200, 201, 6628, 7053].map(shardOf)).toEqual([0, 0, 1, 1, 2, 66, 70]);
});

test('a shard file is named by book code and shard', () => {
  expect(shardFile('BUK', 6628)).toBe('BUK-66.json');
  expect(shardFile('MAJ', 1)).toBe('MAJ-0.json');
});

test('the title names the book and the number in Bengali, as the page title always did', () => {
  expect(titleFor(bookById('bukhari'), 6628)).toBe('বুখারী শরীফ - হাদীস নং ৬,৬২৮ - BoiKotha');
});

test('the description is the saying only: no number, no narrator chain', () => {
  const description = descriptionFor(realText('bukhari', 6628));
  expect(description.startsWith('তিনি বলেন, বর্তমান যুগের মুনাফিকরা')).toBe(true);
  expect(description).not.toMatch(/^[০-৯]/);
  expect(description).not.toContain('আদম ইবনু');
  expect(description).not.toContain('থেকে বর্ণিত');
});

test('a short saying is kept whole, with no ellipsis', () => {
  const description = descriptionFor(realText('muslim', 4));
  expect(description).toBe('হাদিসটির উপরোক্ত হাদীসের অনুরূপ বর্ণনা করেছেন।');
});

test('a long saying is cut at a word boundary near 160 characters with an ellipsis', () => {
  const text = realText('bukhari', 1);
  const description = descriptionFor(text);
  expect(description.endsWith('…')).toBe(true);
  expect(description.length).toBeLessThanOrEqual(161);
  expect(description.length).toBeGreaterThan(120);
  const kept = description.slice(0, -1);
  // the cut falls between two words of the real text, never inside one
  expect(text).toContain(kept);
  expect(text[text.indexOf(kept) + kept.length]).toMatch(/\s/);
});

test('whitespace is normalised', () => {
  expect(descriptionFor('১। কেউ বলেছেন:\n\n  সত্য   কথা  বলো।')).toBe('কেউ বলেছেন: সত্য কথা বলো।');
});

test('an empty text gives an empty description', () => {
  expect(descriptionFor('')).toBe('');
  expect(descriptionFor(null)).toBe('');
});

describe('hadisMetadata', () => {
  const book = bookById('bukhari');
  const text = realText('bukhari', 6628);
  const metadata = hadisMetadata(book, 6628, text);

  test('has the title, the saying as the description and an absolute canonical address', () => {
    expect(metadata.title).toBe('বুখারী শরীফ - হাদীস নং ৬,৬২৮ - BoiKotha');
    expect(metadata.description).toBe(descriptionFor(text));
    expect(metadata.alternates.canonical).toBe('https://hadis.feeham.com/hadis/bukhari/6628');
  });

  test('has the link-preview tags: an article on the site, in Bengali, with the logo', () => {
    expect(metadata.openGraph).toMatchObject({
      type: 'article',
      siteName: 'BoiKotha · বইকথা',
      locale: 'bn_BD',
      url: 'https://hadis.feeham.com/hadis/bukhari/6628',
      title: metadata.title,
      description: metadata.description,
    });
    expect(metadata.openGraph.images[0].url).toBe('https://hadis.feeham.com/logo512.png');
    expect(metadata.twitter).toMatchObject({ card: 'summary', title: metadata.title, description: metadata.description });
  });

  test('a hadis that exists is open to search engines', () => {
    expect(metadata.robots).toBeUndefined();
    expect(hadisMetadata(book, 6628, undefined).robots).toBeUndefined();
  });

  test('a number with no file is kept out of search results and still has a description', () => {
    const gap = hadisMetadata(book, 63, null);
    expect(gap.robots).toEqual({ index: false, follow: true });
    expect(gap.description).toBe('সহীহ বুখারী, হাদীস নং ৬৩');
  });

  test('a text that could not be read still gets a description from the citation', () => {
    expect(hadisMetadata(book, 6628, undefined).description).toBe('সহীহ বুখারী, হাদীস নং ৬,৬২৮');
  });
});
