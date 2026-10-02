import { readFileSync } from 'node:fs';
import path from 'node:path';
import { NARRATORS, WORD_SPELLINGS } from '../data/narratorVariants';
import { realHadisText } from '../test/publicJson';
import { splitHadis } from './hadisText';
import { cleanName, foldKey, hashId, lastNarratorRaw, listedNarrator, narratorOfChain } from './narratorName';

// Names are compared the way the data stores them (য় as য + nukta).
const nfc = (text) => text.normalize('NFC');
// The primary narrator of a real hadis, as the index builder finds it.
const primary = (folder, number) => narratorOfChain(splitHadis(realHadisText(folder, number)).chain);
const listed = (folder, number) => {
  const found = primary(folder, number);
  return found && listedNarrator(found.key);
};

describe('lastNarratorRaw (real chains)', () => {
  test('is the last name before "থেকে বর্ণিত", after the last gap', () => {
    // Bukhari 13: "আবূল ইয়ামান (রহঃ) ... আবূ হুরায়রা (রাঃ) থেকে বর্ণিত,"
    expect(lastNarratorRaw(splitHadis(realHadisText('Bukhari', 13)).chain)).toBe(nfc('আবূ হুরায়রা (রাঃ)'));
  });

  test('a book with a bare chain (Ibn Majah 1) gives the one name in it', () => {
    expect(lastNarratorRaw(splitHadis(realHadisText('Majah', 1)).chain)).toBe(nfc('আবূ হুরায়রা (রাঃ)'));
  });

  test('works with "হতে বর্ণিত" (Abu Dawud 61: আলী)', () => {
    expect(lastNarratorRaw(splitHadis(realHadisText('Daud', 61)).chain)).toBe('আলী (রাঃ)');
  });

  test('reads the name before "থেকে" when the chain ends "A থেকে B ও C সূত্রে বর্ণিত" (Muslim 294)', () => {
    const chain = splitHadis(realHadisText('Muslim', 294)).chain;
    expect(lastNarratorRaw(chain)).toBe(nfc('আবূ হুরায়রা (রাঃ)'));
  });

  test('an empty chain (no chain found in the text) gives an empty name', () => {
    expect(lastNarratorRaw('')).toBe('');
    expect(lastNarratorRaw(undefined)).toBe('');
  });
});

describe('cleanName', () => {
  test('drops the honorific in brackets', () => {
    expect(cleanName('আবূ হুরায়রা (রাঃ)')).toBe('আবূ হুরায়রা');
    expect(cleanName('কাতাদা (রহঃ)')).toBe('কাতাদা');
    expect(cleanName('আনাস (রা.)')).toBe('আনাস');
  });

  test('drops "রাদিয়াল্লাহু আনহু" and "আনহা" (Tirmidhi 6 and 377)', () => {
    expect(cleanName(lastNarratorRaw(splitHadis(realHadisText('Tirmiji', 6)).chain))).toBe(nfc('আনাস ইবনু মালিক'));
    expect(cleanName(lastNarratorRaw(splitHadis(realHadisText('Tirmiji', 377)).chain))).toBe(nfc('আয়িশা'));
  });

  test('drops apostrophes and invisible joiners (Bukhari 3279 and 33)', () => {
    expect(cleanName(lastNarratorRaw(splitHadis(realHadisText('Bukhari', 3279)).chain))).toBe(nfc('আয়িশা'));
    expect(cleanName(lastNarratorRaw(splitHadis(realHadisText('Bukhari', 33)).chain))).toBe(nfc('আবদুল্লাহ ইবনু আমর'));
  });

  test('drops "সূত্রে নবী ..." after the name (Muslim 1680)', () => {
    expect(cleanName(lastNarratorRaw(splitHadis(realHadisText('Muslim', 1680)).chain))).toBe(nfc('আবু হুরায়রা'));
  });

  test('reads a wife of the Prophet from "নবী ... এর স্ত্রী আয়েশা" (Nasa\'i 3451, Muslim 578)', () => {
    expect(cleanName(lastNarratorRaw(splitHadis(realHadisText('Nasae', 3451)).chain))).toBe(nfc('আয়েশা'));
    expect(cleanName(lastNarratorRaw(splitHadis(realHadisText('Muslim', 578)).chain))).toBe(nfc('আয়িশা'));
  });

  test('collapses whitespace', () => {
    expect(cleanName('  আনাস   ইবনু \n মালিক  (রাঃ) ')).toBe('আনাস ইবনু মালিক');
  });

  test.each([
    ['empty', ''],
    ['only a note', '(রাঃ)'],
    ['a sentence with a danda', 'তিনি বলেন। আমি শুনেছি'],
    ['an Arabic quotation', 'قال رسول الله'],
    ['two narrators', 'আবূ হুরায়রা (রাঃ) ও আবদুল্লাহ ইবনু উমর (রাঃ)'],
    ['a list with commas (Tirmidhi 1439)', 'আবূ হুরায়রা, যায়দ ইবনু খালিদ ও শিবল রাদিয়াল্লাহু আনহুম'],
    ['the Prophet', 'নবী সাল্লাল্লাহু আলাইহি ওয়াসাল্লাম'],
    ['too long', 'আবূ বকর ইবনু আবূ শায়বা ইবনু আমর ইবনু উসমান ইবনু খাওয়াস্তী আল-আবসী আল-কূফী'],
    ['with a number', 'আবূ হুরায়রা ১২'],
  ])('is not a plausible name: %s', (_what, text) => {
    expect(cleanName(text)).toBe('');
  });
});

describe('foldKey: spellings of one name give one key', () => {
  test('the common spellings of ibn: ইবনু, ইবনে, ইবন, বিন', () => {
    const keys = ['ইবনু আব্বাস', 'ইবনে আব্বাস', 'ইবন আব্বাস', 'বিন আব্বাস'].map(foldKey);
    expect(new Set(keys).size).toBe(1);
  });

  test('আবূ, আবু and a doubled vowel sign (Bukhari 13, Muslim 1680)', () => {
    expect(foldKey('আবূ বকরা')).toBe(foldKey('আবু বকরা'));
    expect(foldKey('আবুু বকরা')).toBe(foldKey('আবূ বকরা'));
  });

  test('হুরায়রা and হুরাইরা (Bukhari 13 and Bukhari 838)', () => {
    expect(foldKey(cleanName(lastNarratorRaw(splitHadis(realHadisText('Bukhari', 13)).chain)))).toBe(
      foldKey(cleanName(lastNarratorRaw(splitHadis(realHadisText('Bukhari', 838)).chain)))
    );
  });

  test('a final "হ" after "া" and a final hasanta go (আয়িশাহ্ in Ibn Majah 1221 is আয়িশা)', () => {
    expect(foldKey(cleanName(lastNarratorRaw(splitHadis(realHadisText('Majah', 1221)).chain)))).toBe(foldKey('আয়িশা'));
  });

  test('but আবদুল্লাহ keeps its own হ', () => {
    expect(foldKey('আবদুল্লাহ')).toBe('আবদুল্লাহ');
    expect(foldKey('আব্দুল্লাহ')).toBe('আবদুল্লাহ');
  });

  test('"আল" and the hyphen after it are dropped: আবূ সাঈদ আল-খুদরী is আবূ সাঈদ খুদরী', () => {
    expect(foldKey('আবূ সাঈদ আল-খুদরী')).toBe(foldKey('আবূ সাঈদ খুদরী'));
  });

  test('different people stay different (a first name alone is not guessed)', () => {
    expect(foldKey('আবদুল্লাহ')).not.toBe(foldKey('আবদুল্লাহ ইবনু উমর'));
    expect(foldKey('জাবির ইবনু সামুরা')).not.toBe(foldKey('জাবির ইবনু আবদুল্লাহ'));
    expect(foldKey('আবূ বকর')).not.toBe(foldKey('আবূ বকরা'));
  });
});

describe('listed narrators (the variants table) on real chains', () => {
  test.each([
    ['Bukhari', 13, 'abu-hurayrah'],
    ['Bukhari', 838, 'abu-hurayrah'], // হুরাইরা
    ['Bukhari', 2566, 'abu-hurayrah'], // no honorific at all
    ['Majah', 94, 'abu-hurayrah'], // "আবূ হুরায়রা(রাঃ)": no space before the bracket
    ['Muslim', 1680, 'abu-hurayrah'], // "আবু", and "সুত্রে নবী ..."
    ['Tirmiji', 377, 'aisha'],
    ['Bukhari', 3279, 'aisha'],
    ['Majah', 1221, 'aisha'],
    ['Nasae', 3451, 'aisha'], // wife of the Prophet, আয়েশা
    ['Tirmiji', 6, 'anas-ibn-malik'],
    ['Bukhari', 12, 'anas-ibn-malik'], // "আনাস" alone
    ['Nasae', 6, 'anas-ibn-malik'],
    ['Majah', 1439, 'ibn-abbas'],
    ['Daud', 876, 'ibn-abbas'], // ইবনে আব্বাস
    ['Muslim', 709, 'ibn-umar'],
    ['Daud', 61, 'ali-ibn-abi-talib'],
    ['Bukhari', 33, 'abdullah-ibn-amr'],
    ['Bukhari', 411, 'sahl-ibn-sad'],
    ['Tirmiji', 4, 'jabir-ibn-abdullah'],
  ])('%s %i is %s', (folder, number, id) => {
    expect(listed(folder, number)?.id).toBe(id);
  });

  test('the table\'s own names are listed under their own id', () => {
    for (const { id, name } of NARRATORS) expect(listedNarrator(foldKey(cleanName(name)))?.id).toBe(id);
  });

  test('every id is URL safe and unique, and no two entries claim the same spelling', () => {
    const ids = NARRATORS.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.every((id) => /^[a-z][a-z0-9-]*$/.test(id))).toBe(true);
    const owner = new Map();
    for (const { id, name, aliases } of NARRATORS) {
      for (const form of [name, ...aliases]) {
        const key = foldKey(cleanName(form));
        expect(owner.get(key) ?? id).toBe(id);
        owner.set(key, id);
      }
    }
  });

  test('the table file says in its header that it is a first draft for the owner to extend', () => {
    const source = readFileSync(path.resolve(process.cwd(), 'src/data/narratorVariants.js'), 'utf8');
    expect(source.split('\n')[0]).toMatch(/FIRST DRAFT FOR THE OWNER TO EXTEND/);
  });

  test('the table is a draft of 20 to 30 narrators', () => {
    expect(NARRATORS.length).toBeGreaterThanOrEqual(20);
    expect(NARRATORS.length).toBeLessThanOrEqual(30);
  });

  test('the word table keeps both sides in a form the key can use', () => {
    for (const [from, to] of Object.entries(WORD_SPELLINGS)) expect(foldKey(from)).toBe(foldKey(to));
  });

  test('a narrator who is not listed has no entry', () => {
    expect(listed('Bukhari', 411)?.id).not.toBe('abu-hurayrah');
    expect(listedNarrator(foldKey('মুগীরা ইবনু শুবা'))).toBeNull();
  });
});

describe('narratorOfChain', () => {
  test('gives the name and the key', () => {
    const found = narratorOfChain(splitHadis(realHadisText('Bukhari', 13)).chain);
    expect(found).toEqual({ name: nfc('আবূ হুরায়রা'), key: foldKey(nfc('আবূ হুরায়রা')) });
  });

  test.each([
    ['Tirmiji', 1439], // a list of three narrators
    ['Bukhari', 400], // "A (রাঃ) ও B (রাঃ) থেকে"
    ['Tirmiji', 1926], // "... তার পিতা তার পিতামহ"
  ])('gives null for a chain with several narrators or no name of its own: %s %i', (folder, number) => {
    expect(primary(folder, number)).toBeNull();
  });

  test('gives null when there is no chain', () => {
    expect(narratorOfChain('')).toBeNull();
  });
});

describe('hashId', () => {
  test('is URL safe, starts with a letter and is the same every time', () => {
    const id = hashId(foldKey('মুগীরা ইবনু শুবা'));
    expect(id).toMatch(/^n[0-9a-z]+$/);
    expect(hashId(foldKey('মুগীরা ইবনু শুবা'))).toBe(id);
  });

  test('differs for different names', () => {
    expect(hashId('আতা')).not.toBe(hashId('কাতাদা'));
  });
});
