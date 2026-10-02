import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { readingTime, splitHadis, wordCount } from './hadisText';

const BUKHARI_6628 = '৬৬২৮। আদম ইবনু আবূ ইয়াস (রহঃ) ... হুযায়ফা ইবনুু-ইয়ামান (রাঃ) থেকে বর্ণিত। তিনি বলেন, বর্তমান যুগের মুনাফিকরা নবী সাল্লাল্লাহু আলাইহি ওয়াসাল্লাম এর যুগের মুনাফিকদের চাইতেও জঘন্য। কেননা, সে যুগে তারা (মুনাফিকী) করত গোপনে আর আজ করে প্রকাশ্যে।';
const TIRMIDHI_987 = '৯৮৭. কুতায়বা (রহঃ) ...... আনাস (রাঃ) থেকে বর্ণিত আছে যে, রাসূলুল্লাহ সাল্লাল্লাহু আলাইহি ওয়াসাল্লাম বলেছেন, কষ্টের প্রথম অবস্থায়ই ধৈর্যধারণ করতে হয়।';
const DAUD_203 = '২০৩. হায়ওয়াত শুরায়হ্ .... আলী ইবনু আবূ তালিব (রাঃ) হতে বর্ণিত। রাসূলুল্লাহ্ সাল্লাল্লাহু আলাইহি ওয়া সাল্লাম বলেছেনঃ চক্ষু হল পাশ্চাদ্বারের সংরক্ষণকারী। অতএব যে ব্যক্তি চোখ মুদে নিদ্রা যায় সে যেন উযূ করে।';
const MAJAH_201 = '২৫/২০১। জাবির ইবনু আবদুল্লাহ (রাঃ) থেকে বর্ণিত। তিনি বলেন, রাসূলুল্লাহ সাল্লাল্লাহু আলাইহি ওয়াসাল্লাম হাজ্জের (হজ্জ) মৌসুমে নিজেকে লোকেদের সামনে পেশ করতেন।';
const BUKHARI_307 = '৩০৭। আবদুল্লাহ ইবনু ’আবদুল ওয়াহহাব (রহঃ) ..... উম্মে ’আতিয়া (রাঃ) থেকে বর্ণিত, তিনি বলেনঃ কোন মৃত ব্যাক্তির জন্য আমাদের তিন দিনের বেশী শোক পালন করা থেকে নিষেধ করা হত। এই বর্ণনা হিশাম ইবনু হাসসান (রহঃ) হাফসা (রাঃ) থেকে, তিনি উম্মে ’আতিয়্যা (রাঃ) থেকে এবং তিনি নবী সাল্লাল্লাহু আলাইহি ওয়াসাল্লাম থেকে বিবৃত করেছেন।';

test('splits a Bukhari hadis into number, chain, saying and summary', () => {
  const parts = splitHadis(BUKHARI_6628);
  expect(parts.number).toBe('৬৬২৮');
  expect(parts.chain).toBe('আদম ইবনু আবূ ইয়াস (রহঃ) ... হুযায়ফা ইবনুু-ইয়ামান (রাঃ) থেকে বর্ণিত।');
  expect(parts.body.startsWith('তিনি বলেন, বর্তমান যুগের মুনাফিকরা')).toBe(true);
  expect(parts.summary).toBe('আদম ইবনু আবূ ইয়াস (রহঃ) ... হুযায়ফা ইবনুু-ইয়ামান (রাঃ)');
});

test('handles the "বর্ণিত আছে যে," form and a dot after the number (Tirmidhi)', () => {
  const parts = splitHadis(TIRMIDHI_987);
  expect(parts.number).toBe('৯৮৭');
  expect(parts.chain).toBe('কুতায়বা (রহঃ) ...... আনাস (রাঃ) থেকে বর্ণিত আছে যে,');
  expect(parts.body.startsWith('রাসূলুল্লাহ সাল্লাল্লাহু')).toBe(true);
  expect(parts.summary).toBe('কুতায়বা (রহঃ) ... আনাস (রাঃ)');
});

test('handles "হতে বর্ণিত" (Abu Dawud)', () => {
  const parts = splitHadis(DAUD_203);
  expect(parts.number).toBe('২০৩');
  expect(parts.body.startsWith('রাসূলুল্লাহ্ সাল্লাল্লাহু')).toBe(true);
  expect(parts.summary).toBe('হায়ওয়াত শুরায়হ্ ... আলী ইবনু আবূ তালিব (রাঃ)');
});

test('handles a book-and-hadis number like ২৫/২০১ and a single narrator (Ibn Majah)', () => {
  const parts = splitHadis(MAJAH_201);
  expect(parts.number).toBe('২৫/২০১');
  expect(parts.summary).toBe('জাবির ইবনু আবদুল্লাহ (রাঃ)');
  expect(parts.body.startsWith('তিনি বলেন, রাসূলুল্লাহ')).toBe(true);
});

test('only the first "থেকে বর্ণিত" ends the chain; later mentions stay in the saying', () => {
  const parts = splitHadis(BUKHARI_307);
  expect(parts.chain.endsWith('থেকে বর্ণিত,')).toBe(true);
  expect(parts.body).toContain('হাফসা (রাঃ) থেকে, তিনি');
});

test('no chain and no number: the full text is the body, nothing is lost (Review Focus 3)', () => {
  const text = 'রাসূলুল্লাহ সাল্লাল্লাহু আলাইহি ওয়াসাল্লাম বলেছেন, সত্য কথা বলো।';
  expect(splitHadis(text)).toEqual({ number: '', chain: '', body: text, summary: '' });
  expect(splitHadis('')).toEqual({ number: '', chain: '', body: '', summary: '' });
});

test('a chain marker far into a long text is not treated as a chain', () => {
  const far = 'শব্দ '.repeat(120) + 'আনাস (রাঃ) থেকে বর্ণিত। পরের কথা।';
  expect(splitHadis(far).chain).toBe('');
});

test('words are counted by spaces', () => {
  expect(wordCount('এক দুই  তিন')).toBe(3);
  expect(wordCount('')).toBe(0);
});

test('reading time is half a minute for short hadis and whole minutes for long ones', () => {
  expect(readingTime(30)).toBe('আধা মিনিটেরও কম');
  expect(readingTime(44)).toBe('আধা মিনিটেরও কম');
  expect(readingTime(45)).toBe('প্রায় ১ মিনিট');
  expect(readingTime(300)).toBe('প্রায় ২ মিনিট');
  expect(readingTime(301)).toBe('প্রায় ৩ মিনিট');
});

test('on the real data, most hadis have a recognisable chain and no text is ever lost (Review Focus 3)', () => {
  const root = path.resolve(process.cwd(), 'public/json/hadis');
  let total = 0;
  let withChain = 0;
  for (const folder of readdirSync(root)) {
    const dirs = readdirSync(path.join(root, folder)).filter((d) => /^\d+$/.test(d)).sort();
    for (let i = 0; i < dirs.length; i += 10) {
      const text = JSON.parse(readFileSync(path.join(root, folder, dirs[i], 'text.txt'), 'utf8'));
      const parts = splitHadis(text);
      total++;
      if (parts.chain) withChain++;
      // nothing lost: the same characters in the same order, ignoring all whitespace
      const rejoined = `${parts.chain}${parts.body}`.replace(/\s+/g, '');
      const original = text.replace(/^\s*(?:[০-৯0-9]+\s*\/\s*)?[০-৯0-9]+(?:\s*[।.,]\s*|\s+(?=[^০-৯0-9\s]))/, '').replace(/\s+/g, '');
      expect(rejoined).toBe(original);
    }
  }
  console.info(`chain recognised in ${withChain} of ${total} sampled hadis (${Math.round((100 * withChain) / total)}%)`);
  expect(withChain / total).toBeGreaterThan(0.7);
});

test('a long stretch before "থেকে বর্ণিত" that contains a sentence end is saying, not a chain', () => {
  const text = 'ইবরাহীম তায়মী বলেন, আমরা নামায পড়তাম। এরপর তিনি আরও বললেন যে এটি সুন্নত। ইবনু আবূ মুলায়কা (রহঃ) থেকে বর্ণিত। পরে তিনি বললেন।';
  const parts = splitHadis(text);
  expect(parts.chain).toBe('');
  expect(parts.body).toBe(text);
});

test('an over-long stretch before the marker is not a chain', () => {
  const text = `${'শব্দ '.repeat(45)}(রাঃ) থেকে বর্ণিত। তিনি বলেন, ভালো কথা।`;
  expect(splitHadis(text).chain).toBe('');
  expect(splitHadis(text).body).toBe(text.trim());
});

test('when the chain would leave nothing to read, the whole text is the saying', () => {
  const parts = splitHadis('১০২। আবূ দাঊদ (রহঃ) ... আনাস (রাঃ) থেকে বর্ণিত।');
  expect(parts.chain).toBe('');
  expect(parts.body).toBe('আবূ দাঊদ (রহঃ) ... আনাস (রাঃ) থেকে বর্ণিত।');
});
