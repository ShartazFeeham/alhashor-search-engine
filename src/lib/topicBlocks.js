import { normalizeBengali } from '../Helpers/bengali';

// The letters of the topic menu's blocks: the vowels first, then the consonants, in the order of
// the Bangla alphabet. A name starting with anything else goes in a block after these.
export const LETTER_ORDER = Array.from('অআইঈউঊঋএঐওঔ' + 'কখগঘঙচছজঝঞটঠডঢণতথদধনপফবভমযরলশষসহ');

const collator = typeof Intl !== 'undefined' ? new Intl.Collator('bn') : null;
const compareNames = (a, b) => (collator ? collator.compare(a, b) : 0) || (a < b ? -1 : a > b ? 1 : 0);

// The first letter of a name once normalised (stray spaces and joiners ignored).
export function firstLetter(name) {
  const letters = Array.from(normalizeBengali(name).trim());
  return letters.find((char) => /\p{L}/u.test(char)) ?? letters[0] ?? '';
}

const rank = (letter) => {
  const at = LETTER_ORDER.indexOf(letter);
  return at === -1 ? LETTER_ORDER.length : at;
};

// [{ letter, names }]: the names grouped by first letter, the blocks in alphabet order and the
// names in each block collated. 'desc' reverses both. Letters with no name are not listed.
export function groupTopics(names, sort = 'asc') {
  const byLetter = new Map();
  for (const name of names) {
    const letter = firstLetter(name);
    byLetter.set(letter, [...(byLetter.get(letter) ?? []), name]);
  }
  const blocks = [...byLetter.entries()]
    .sort(([a], [b]) => rank(a) - rank(b) || (a < b ? -1 : a > b ? 1 : 0))
    .map(([letter, list]) => ({ letter, names: list.sort(compareNames) }));
  if (sort !== 'desc') return blocks;
  return blocks.reverse().map((block) => ({ ...block, names: [...block.names].reverse() }));
}
