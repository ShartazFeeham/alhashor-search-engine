// How the word index files are named. The index folders (public/json/tags, tags3) hold one JSON
// file per start of a word: the first n characters (code points) of the word as the data spells it.
// The generator (scripts/build-index-3.mjs) and the search lookup both build the names with the
// functions here, so they cannot disagree. Pure: nothing here reads a file or fetches anything.

// A word with fewer than n code points has no n-character start, so it is filed under the whole
// word plus this mark. Without it, the word হয় (2 code points) and the start of হয়েছে (হ য ়)
// would be one name on a file system that does not tell the two spellings of য় (or ো) apart, such
// as macOS or Windows, and one file would overwrite the other. No word contains the mark.
export const SHORT_MARK = '_';

// The file name (without .json) a word is filed under, spelled exactly as the word is.
export function shardName(word, n) {
  const letters = Array.from(word);
  return letters.length < n ? `${word}${SHORT_MARK}` : letters.slice(0, n).join('');
}

// Names that are safe to use as a file name and as part of a web address: not empty, not '.' or
// '..', and without path separators, characters a web address reads differently (? # %) or control
// characters.
export function isSafeShardName(name) {
  return typeof name === 'string'
    && name !== '' && name !== '.' && name !== '..'
    && !/[/\\?#%\u0000-\u001f\u007f]/.test(name); // eslint-disable-line no-control-regex
}

// [the spelling the search uses (NFC), the other spelling the data has]
const SPELLINGS = [
  ['য়', 'য়'], // য় as য + ় or as one character
  ['ড়', 'ড়'], // ড় likewise
  ['ঢ়', 'ঢ়'], // ঢ় likewise
  ['ো', 'ো'], // ো as one character or ে + া
  ['ৌ', 'ৌ'], // ৌ as one character or ে + ৗ
];

// A few characters can be written in more than one canonically equivalent way besides the five
// above (Arabic: alef + madda or one letter; shadda and a vowel mark in either order). The data
// has them in whichever way the text was typed, the search always in NFC.
const MAX_PERMUTED_MARKS = 4;

function permutations(items) {
  if (items.length <= 1) return [items];
  return items.flatMap((item, i) => permutations([...items.slice(0, i), ...items.slice(i + 1)]).map((rest) => [item, ...rest]));
}

// The text, then the same text with each run of combining marks in every other order that
// composes to the same text.
function markOrders(text) {
  const parts = text.split(/(\p{M}{2,})/u);
  let orders = [''];
  parts.forEach((part, i) => {
    let options = [part];
    if (i % 2 === 1 && Array.from(part).length <= MAX_PERMUTED_MARKS) {
      const same = permutations(Array.from(part)).map((order) => order.join('')).filter((order) => order.normalize('NFC') === part);
      options = [part, ...same.filter((order) => order !== part)];
    }
    orders = orders.flatMap((before) => options.map((option) => before + option));
  });
  return orders;
}

// The shard names a word (in the search's NFC spelling) could be filed under: the data spells some
// letters two ways, and a word is filed under the start of whichever spelling it used. Each
// spelling of each of those letters in the start is tried, and the start is then cut to n code
// points (a two-character spelling takes up two of them, which moves where the cut falls). The
// spelling the search uses comes first. Invisible joiners inside the start are not covered.
export function candidateShards(word, n) {
  if (word === '') return [];
  // n code points need at most 2n characters of the search's spelling: a letter written as two
  // characters there is a single code point in the other spelling
  const start = Array.from(word).slice(0, 2 * n).join('');
  const starts = [...new Set([start, start.normalize('NFD')].flatMap(markOrders))];
  const names = new Set();
  for (const text of starts) {
    let spellings = [''];
    for (let i = 0; i < text.length;) {
      const spelling = SPELLINGS.find(([normalized]) => text.startsWith(normalized, i));
      const options = spelling || [String.fromCodePoint(text.codePointAt(i))];
      spellings = spellings.flatMap((so) => options.map((option) => so + option));
      i += spelling ? spelling[0].length : options[0].length;
    }
    for (const spelling of spellings) {
      const name = shardName(spelling, n);
      if (isSafeShardName(name)) names.add(name);
    }
  }
  return [...names];
}
