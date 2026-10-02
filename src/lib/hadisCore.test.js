import { stripChain, MIN_CORE_LENGTH } from './hadisCore';
import { realShortList, realText } from '../test/hadisFixtures';

describe('stripChain', () => {
  test('drops the number, the chain up to "থেকে বর্ণিত" and a bare "তিনি বলেন," lead-in', () => {
    const text = '১২। উবায়দুল্লাহ (রহঃ) ... আনাস (রাঃ) থেকে বর্ণিত। তিনি বলেন, সৎকাজ করো এবং অসৎকাজ থেকে বিরত থাকো।';
    expect(stripChain(text)).toMatchObject({ core: 'সৎকাজ করো এবং অসৎকাজ থেকে বিরত থাকো।', hadChain: true, fellBack: false });
  });

  test('"তিনি বলেছেন:" and "তিনি বলতেন," are bare lead-ins too', () => {
    expect(stripChain('৫। আবূ হুরায়রা (রাঃ) থেকে বর্ণিত। তিনি বলেছেন: দয়া ঈমানের অংশ, সবার প্রতি দয়া করো।').core).toBe('দয়া ঈমানের অংশ, সবার প্রতি দয়া করো।');
    expect(stripChain('৫। আবূ হুরায়রা (রাঃ) থেকে বর্ণিত। তিনি বলতেন, হে আল্লাহ, আমাকে সঠিক পথ দেখান।').core).toBe('হে আল্লাহ, আমাকে সঠিক পথ দেখান।');
  });

  test('keeps a sentence that names who spoke: "রাসূলুল্লাহ (সাঃ) বলেছেন, ..." carries the meaning', () => {
    const text = '৭। আনাস (রাঃ) থেকে বর্ণিত। রাসূলুল্লাহ (সাঃ) বলেছেন, তোমাদের কেউ মুমিন হবে না যতক্ষণ না নিজের জন্য যা পছন্দ করে ভাইয়ের জন্যও তা পছন্দ করে।';
    expect(stripChain(text).core).toMatch(/^রাসূলুল্লাহ \(সাঃ\) বলেছেন, তোমাদের কেউ মুমিন/);
  });

  test('a text with no chain is shown as it is (after its number)', () => {
    expect(stripChain('৯। সবচেয়ে ভালো মানুষ সে, যে অন্যের উপকার করে।')).toMatchObject({ core: 'সবচেয়ে ভালো মানুষ সে, যে অন্যের উপকার করে।', hadChain: false, fellBack: false });
  });

  test('a text that starts with the saying directly is not touched', () => {
    const text = 'নিশ্চয় সকল কাজ নিয়তের উপর নির্ভরশীল এবং প্রত্যেক ব্যক্তি তার নিয়ত অনুযায়ী ফল পাবে।';
    expect(stripChain(text).core).toBe(text);
  });

  test('a "তিনি বলেন" that is not at the start stays', () => {
    expect(stripChain('৩। আয়িশা (রাঃ) থেকে বর্ণিত। নবী (সাঃ) যখন ঘরে আসতেন তিনি বলেন, আমি ফিরে এসেছি।').core).toMatch(/^নবী \(সাঃ\) যখন/);
  });

  test('chains with abbreviations (...) and several names are recognised', () => {
    const text = '১০৪। আব্দুল্লাহ ইবনু ইউসুফ (রহঃ) ... মালিক ... আবূ হুরায়রা (রাঃ) থেকে বর্ণিত যে, রাসূলুল্লাহ (সাঃ) বলেছেন, তোমরা ধৈর্য ধরো, কারণ ধৈর্যের প্রতিদান অনেক বড়।';
    const result = stripChain(text);
    expect(result.hadChain).toBe(true);
    expect(result.core).toMatch(/^রাসূলুল্লাহ \(সাঃ\) বলেছেন/);
    expect(result.core).not.toMatch(/আবূ হুরায়রা/);
  });

  test('a core that would be tiny falls back to the whole text, so nothing is lost', () => {
    const text = '১। আনাস (রাঃ) থেকে বর্ণিত। তিনি বলেন, হ্যাঁ।';
    const result = stripChain(text);
    expect(result.fellBack).toBe(true);
    expect(result.core).toContain('আনাস (রাঃ) থেকে বর্ণিত');
    expect(result.core).toContain('হ্যাঁ।');
    expect(result.core.startsWith('১')).toBe(false); // the number is still left out
  });

  test('the fallback length is one constant', () => {
    expect(MIN_CORE_LENGTH).toBeGreaterThan(0);
    expect(MIN_CORE_LENGTH).toBeLessThanOrEqual(15);
    const exactly = 'ক'.repeat(MIN_CORE_LENGTH);
    expect(stripChain(`২। আনাস (রাঃ) থেকে বর্ণিত। ${exactly}`).fellBack).toBe(false);
    expect(stripChain(`২। আনাস (রাঃ) থেকে বর্ণিত। ${exactly.slice(1)}`).fellBack).toBe(true);
  });

  test('never returns an empty core', () => {
    for (const text of ['', '   ', '৫।', '৫। আনাস (রাঃ) থেকে বর্ণিত।']) expect(stripChain(text).core).toBeDefined();
    expect(stripChain('৫। আনাস (রাঃ) থেকে বর্ণিত।').core.length).toBeGreaterThan(0);
  });

  test('works on real texts: Bukhari 1 loses its chain and starts with the saying', () => {
    const result = stripChain(realText('bukhari', 1));
    expect(result.hadChain).toBe(true);
    expect(result.core).not.toMatch(/থেকে বর্ণিত/);
    expect(result.core.length).toBeGreaterThan(MIN_CORE_LENGTH);
  });

  test('over the whole short list: almost none fall back, none is empty', () => {
    const list = realShortList();
    let total = 0;
    let fallbacks = 0;
    for (const [code, numbers] of Object.entries(list)) {
      const id = { BUK: 'bukhari', MUS: 'muslim', TIR: 'tirmidhi', DAU: 'abudawud', MAJ: 'ibnmajah', NAS: 'nasai' }[code];
      for (const number of numbers.filter((_, index) => index % 40 === 0)) {
        const result = stripChain(realText(id, number));
        total += 1;
        expect(result.core.length, `${id} ${number}`).toBeGreaterThan(0);
        if (result.fellBack) fallbacks += 1;
      }
    }
    expect(total).toBeGreaterThan(100);
    expect(fallbacks / total).toBeLessThan(0.05);
  });
});
