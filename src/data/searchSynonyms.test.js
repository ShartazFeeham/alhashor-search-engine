import { readFileSync } from 'node:fs';
import path from 'node:path';
import { normalizeBengali } from '../Helpers/bengali';
import { SYNONYM_GROUPS } from './searchSynonyms';

// How many hadis the data files list for a word (own word only). The files are named by the
// first two characters, in either spelling of য়, ড়, ো.
function hitsFor(word) {
  const normalized = normalizeBengali(word);
  const total = new Set();
  for (const form of ['NFC', 'NFD']) {
    const prefix = normalized.normalize(form).substring(0, 2);
    try {
      const data = JSON.parse(readFileSync(path.resolve(process.cwd(), 'public/json/tags', `${prefix}.json`), 'utf8'));
      for (const [key, tags] of Object.entries(data)) {
        if (normalizeBengali(key) === normalized) tags.forEach((tag) => total.add(tag));
      }
    } catch {
      // no file for this spelling
    }
  }
  return total.size;
}

describe('search synonyms', () => {
  test('every group has at least two words, spelled in the form the search uses', () => {
    for (const group of SYNONYM_GROUPS) {
      expect(group.length).toBeGreaterThanOrEqual(2);
      for (const word of group) expect(word).toBe(normalizeBengali(word));
    }
  });

  test('no word is in two groups', () => {
    const all = SYNONYM_GROUPS.flat();
    expect(new Set(all).size).toBe(all.length);
  });

  test('the common pairs are there', () => {
    const together = (a, b) => SYNONYM_GROUPS.some((group) => group.includes(a) && group.includes(b));
    expect(together('নামায', 'নামাজ')).toBe(true);
    expect(together('নামায', 'সালাত')).toBe(true);
    expect(together('রোযা', 'রোজা')).toBe(true);
    expect(together('রোযা', 'সিয়াম')).toBe(true);
    expect(together('যাকাত', 'জাকাত')).toBe(true);
    expect(together('হজ্জ', 'হজ')).toBe(true);
    expect(together('দোয়া', 'দুআ')).toBe(true);
    expect(together('ঈমান', 'ইমান')).toBe(true);
    expect(together('জান্নাত', 'বেহেশত')).toBe(true);
    expect(together('জাহান্নাম', 'দোযখ')).toBe(true);
  });

  test('every group has a word that really appears in the hadis (so a suggestion can be verified)', () => {
    for (const group of SYNONYM_GROUPS) {
      const real = group.filter((word) => hitsFor(word) > 0);
      expect(real.length, group.join(' / ')).toBeGreaterThanOrEqual(1);
    }
  });
});
