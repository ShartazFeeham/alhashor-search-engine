import { ALL_SETS, TOP_PICKS } from '../../lib/topPicks';
import { generateMetadata, generateStaticParams, default as Page } from './[id]/page';

const params = (id) => ({ params: Promise.resolve({ id }) });

test('the title names the set', async () => {
  const set = TOP_PICKS[0];
  expect((await generateMetadata(params(set.id))).title).toBe(`${set.title} - টপ লিস্ট/হাদীস - Alhashor`);
});

test('an unknown set asks Next.js for a 404', async () => {
  await expect(Page(params('nope'))).rejects.toThrow(/NEXT_HTTP_ERROR_FALLBACK;404|NEXT_NOT_FOUND/);
  expect((await generateMetadata(params('nope'))).title).toBe('পৃষ্ঠাটি পাওয়া যায়নি - Alhashor');
});

test('every set has an address that renders its page, and all are built ahead of time', async () => {
  expect(generateStaticParams()).toEqual(TOP_PICKS.map((set) => ({ id: set.id })));
  for (const set of TOP_PICKS) expect((await Page(params(set.id))).props.id).toBe(set.id);
});

test('the old plan ids keep their address under /top-picks', () => {
  const ids = generateStaticParams().map((entry) => entry.id);
  for (const id of ['ramadan-30', 'short-40', 'character-7']) expect(ids).toContain(id);
});

test('a set with no hadis returns not found', async () => {
  const empty = ALL_SETS.find((set) => set.days.length === 0);
  if (!empty) return;
  await expect(Page(params(empty.id))).rejects.toThrow(/NEXT_HTTP_ERROR_FALLBACK;404|NEXT_NOT_FOUND/);
  expect(generateStaticParams().map((entry) => entry.id)).not.toContain(empty.id);
});
