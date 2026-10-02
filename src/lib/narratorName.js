import { NARRATORS, WORD_SPELLINGS } from '../data/narratorVariants.js';

/*
    Names of narrators, read from the chain of a hadis ("... আবূ হুরায়রা (রাঃ) থেকে বর্ণিত"),
    cleaned and grouped so that the spellings of one Companion become one narrator. Pure and
    deterministic: the same text always gives the same name and the same key. Used by
    scripts/build-narrators.mjs (the index is built once, not in the browser), and by the tests.
    The tables of spellings are in src/data/narratorVariants.js, for the owner to extend.
*/

const JOINERS = /[‌‍]/g;
// "থেকে বর্ণিত", "হতে বর্ণিত", "সূত্রে বর্ণিত" and the typos the chain splitter knows (hadisText.js)
const CHAIN_END = /\s*(?:থেকে|হতে|সূত্রে|সুত্রে|খেকে|থকে)\s+(?:বর্ণিত|বৰ্ণিত).*$/s;
// the gap between narrators: "...", "......", "…"
const GAP = /\s*(?:\.{2,}|…)\s*/;
// "A থেকে B সূত্রে বর্ণিত": A is the one the report comes from
const FROM = /\s(?:থেকে|হতে)\s/;
// "(রাঃ)", "(রহঃ)", "[...]", "{...}" and an opening bracket that was never closed
const NOTE = /\([^)]*\)?|\[[^\]]*\]?|\{[^}]*\}?/g;
// "রাদিয়াল্লাহু আনহু / আনহা / আনহুমা / আনহুম" (and a mistyped "আনহ") and "রা." style abbreviations without brackets
const HONOUR = /রাদি(?:য়া|যা|আ)ল্লাহু(?:\s+তা['’‘]?আলা)?(?:\s+আন\S*)?|রহিমাহুল্লাহ|(?:^|\s)(?:রাঃ|রহঃ|রা\.|রহ\.|সাঃ)(?=\s|$)/g;
// "... সূত্রে নবী সাল্লাল্লাহু ..." after a name
const VIA = /\s+(?:সূত্রে|সুত্রে)(?:\s.*)?$/s;
// apostrophes and the like: ’আয়িশা, সা’দ, সা'দ, ʿআলী
const APOSTROPHES = /['’‘ʼʻʿʾ`´]/g;
// "নবী সাল্লাল্লাহু আলাইহি ওয়াসাল্লাম এর সহধর্মিণী আয়িশা": the words before the name say who she is
const RELATION_PREFIX = /^(?:নবী|রাসূলুল্লাহ|রাসুলুল্লাহ|রসূলুল্লাহ)(?:\s+করীম)?(?:\s+সাল্লাল্লাহু\s+আলাইহি\s+ওয়াসাল্লাম)?(?:\s*-?\s*এর)?\s+(?:সহধর্মিণী|সহধর্মিনী|স্ত্রী|পত্নী|কন্যা|আযাদকৃত\s+(?:গোলাম|দাস)|খাদিম)\s+/;
// "ইবনু উমর (রাঃ) নবী সাল্লাল্লাহু ...": the Prophet named after the narrator is not part of the name
const PROPHET_AFTER = /\s+(?:নবী|রাসূলুল্লাহ|রাসুলুল্লাহ|রসূলুল্লাহ)(?:\s+করীম)?\s+সাল্লাল্লাহু.*$/s;
// two narrators in one place: "আয়েশা (রাঃ) ও উম্মে সালামা (রাঃ)"
const SEVERAL = /\sও\s|\sএবং\s/;
const ARABIC = /[؀-ۿ]/;
// words that mean the text is not a person's name (the Prophet, a statement, a verb)
const NOT_A_NAME = /সাল্লাল্লাহু|ওয়াসাল্লাম|নবী|রাসূল|রসূল|বলেন|বলেছেন|শুনেছি|বর্ণনা|সনদ|হাদীস|হাদিস/;

const MAX_WORDS = 6;
const MAX_LENGTH = 48;

// A word: a vowel sign typed twice (আবুু) once, long vowels written short (ূ ী ঊ ঈ), a final hasanta dropped, a final "হ" after "া" dropped
// ("আয়িশাহ" is "আয়িশা", but "আবদুল্লাহ" keeps its own), "য়" written one way.
function foldChars(word) {
  let w = word.normalize('NFC').replace(JOINERS, '').replace(APOSTROPHES, '');
  w = w.replace(/ূ/g, 'ু').replace(/ী/g, 'ি').replace(/ঊ/g, 'উ').replace(/ঈ/g, 'ই');
  w = w.replace(/([ািীুূৃেৈোৌ])\1+/g, '$1').replace(/্$/, '');
  if (/াহ$/.test(w) && !/ল্লাহ$/.test(w)) w = w.slice(0, -1);
  return w;
}

// The word table of src/data/narratorVariants.js, with both sides spelled the way keys are.
const WORDS = new Map(Object.entries(WORD_SPELLINGS).map(([from, to]) => [foldChars(from), foldChars(to)]));

function foldWord(word) {
  const folded = foldChars(word);
  return WORDS.get(folded) ?? folded;
}

// The comparison form of a cleaned name: words folded, "আল" dropped, hyphens as spaces.
export function foldKey(name) {
  return name
    .replace(/-/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map(foldWord)
    .filter((word) => word !== 'আল')
    .join(' ');
}

// The raw text of the narrator the report comes from: the last name of the chain, before "থেকে
// বর্ণিত". `chain` is what splitHadis returns as `chain` ('' gives ''). A chain such as "A (রাঃ)
// থেকে B (রাঃ) ও C (রাঃ) সূত্রে বর্ণিত" gives A.
export function lastNarratorRaw(chain) {
  if (!chain) return '';
  let names = chain.normalize('NFC').replace(CHAIN_END, '');
  const from = FROM.exec(names);
  if (from) names = names.slice(0, from.index);
  const parts = names.split(GAP).map((part) => part.trim()).filter(Boolean);
  return parts.length > 0 ? parts[parts.length - 1] : '';
}

// A name without honorifics, brackets, apostrophes and stray marks, in one line. '' when what is
// left is not plausibly a person: empty, too long, a sentence, a list, an Arabic quotation.
export function cleanName(raw) {
  if (!raw) return '';
  if (/[।:;?!]/.test(raw) || ARABIC.test(raw)) return '';
  let name = raw.normalize('NFC').replace(JOINERS, '');
  name = name.replace(NOTE, ' ').replace(VIA, '').replace(HONOUR, ' ').replace(APOSTROPHES, '');
  name = name.replace(/\s+/g, ' ').trim().replace(RELATION_PREFIX, '').replace(PROPHET_AFTER, '');
  name = name.replace(/[,.،]+$/g, '').trim();
  if (name === '' || name.length > MAX_LENGTH || /[,،০-৯0-9]/.test(name) || NOT_A_NAME.test(name) || SEVERAL.test(name)) return '';
  if (name.split(' ').length > MAX_WORDS) return '';
  return name;
}

// The narrator's comparison key and the cleaned name, from a chain; null when there is none.
export function narratorOfChain(chain) {
  const name = cleanName(lastNarratorRaw(chain));
  return name === '' ? null : { name, key: foldKey(name) };
}

// The listed narrator (src/data/narratorVariants.js) a key belongs to, as { id, name }, or null.
const LISTED = new Map();
for (const { id, name, aliases = [] } of NARRATORS) {
  for (const form of [name, ...aliases]) {
    const key = foldKey(cleanName(form) || form);
    if (!LISTED.has(key)) LISTED.set(key, { id, name: name.normalize('NFC') });
  }
}

export function listedNarrator(key) {
  return LISTED.get(key) ?? null;
}

// A URL-safe id for a narrator who is not in the table: "n" and a 32-bit FNV-1a hash of the key
// in base 36. The same key gives the same id on every run.
export function hashId(key) {
  let hash = 0x811c9dc5;
  for (const byte of new TextEncoder().encode(key)) {
    hash ^= byte;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `n${hash.toString(36)}`;
}
