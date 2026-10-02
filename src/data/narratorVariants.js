// FIRST DRAFT FOR THE OWNER TO EXTEND. Two small tables that the narrator index
// (scripts/build-narrators.mjs, src/lib/narratorName.js) uses to decide that two spellings are
// the same person. Nothing here is checked against a scholarly source: it is a list of the most
// common Companions as they are spelled in these six books, found by reading the real chains.
// Add a line, run `node scripts/build-narrators.mjs` again, and the counts follow.
//
// How a name becomes a group, in order:
//  1. the name is cleaned: "(রাঃ)", "রাদিয়াল্লাহু আনহু", apostrophes, a trailing "সূত্রে ..." go;
//  2. every word is spelled one way (WORD_SPELLINGS below, plus long vowels written short:
//     ূ ী ঊ ঈ become ু ি উ ই, "আল-" is dropped, a final "াহ" loses its "হ");
//  3. the result is looked up in NARRATORS (the name and each alias are spelled the same way, so
//     they only need to differ in the letters that step 2 cannot fix);
//  4. a name that is not in NARRATORS still gets a group of its own (all its spellings that
//     step 2 makes equal), and is shown in the spelling the books use most.
//
// A narrator that is written with a first name only ("আবদুল্লাহ", "জাবির") is NOT guessed:
// "আবদুল্লাহ" alone can be ibn Umar, ibn Mas'ud or ibn Amr, so it stays a group of its own.
// "আনাস", "জাবির", "আয়িশা" and a few others are always one person in these books and are listed
// as aliases below.

// Word to word. The right side is the spelling the key uses (it is never shown on the page).
export const WORD_SPELLINGS = {
  // "son of"
  ইবনে: 'ইবনু',
  ইবন: 'ইবনু',
  ইবনি: 'ইবনু',
  ইবনিল: 'ইবনুল',
  বিন: 'ইবনু',
  ইব্ন: 'ইবনু',
  বিনতে: 'বিনত',
  // mother of
  উম্মে: 'উম্মু',
  // names that are written in more than one way
  উমার: 'উমর',
  মালেক: 'মালিক',
  হুরাইরা: 'হুরায়রা',
  আয়েশা: 'আয়িশা',
  রাফে: 'রাফি',
  নাফে: 'নাফি',
  আইশা: 'আয়িশা',
  আয়শা: 'আয়িশা',
  আব্দুল্লাহ: 'আবদুল্লাহ',
  আব্দুর: 'আবদুর',
  রাহমান: 'রহমান',
  আবদিল্লাহ: 'আবদুল্লাহ',
  যর: 'যার',
  হুযাইফা: 'হুযায়ফা',
  যাবির: 'জাবির',
  ছাওবান: 'সাওবান',
  উছমান: 'উসমান',
  আউফ: 'আওফ',
};

// The Companions that have the most hadis. `id` is the address (/narrators?name=<id>), `name` is
// shown, `aliases` are other forms of the name (spelled any way: step 2 above is applied to them).
export const NARRATORS = [
  { id: 'abu-hurayrah', name: 'আবূ হুরায়রা', aliases: [] },
  { id: 'aisha', name: 'আয়িশা', aliases: ['উম্মুল মুমিনীন আয়িশা', 'আয়িশা সিদ্দীকা'] },
  { id: 'anas-ibn-malik', name: 'আনাস ইবনু মালিক', aliases: ['আনাস'] },
  { id: 'ibn-abbas', name: 'ইবনু আব্বাস', aliases: ['আবদুল্লাহ ইবনু আব্বাস', 'আবদুল্লাহ ইবনুল আব্বাস'] },
  { id: 'ibn-umar', name: 'ইবনু উমর', aliases: ['আবদুল্লাহ ইবনু উমর', 'আবদুল্লাহ ইবনু উমার'] },
  { id: 'jabir-ibn-abdullah', name: 'জাবির ইবনু আবদুল্লাহ', aliases: ['জাবির', 'জাবির ইবনু আবদিল্লাহ'] },
  { id: 'abu-said-al-khudri', name: 'আবূ সাঈদ খুদরী', aliases: ['আবূ সাঈদ', 'আবূ সাঈদ আল-খুদরী', 'আবূ সাঈদ আল খুদরী'] },
  { id: 'ali-ibn-abi-talib', name: 'আলী ইবনু আবূ তালিব', aliases: ['আলী', 'আলী ইবনু আবী তালিব'] },
  { id: 'ibn-masud', name: 'ইবনু মাসউদ', aliases: ['আবদুল্লাহ ইবনু মাসউদ'] },
  { id: 'umar-ibn-al-khattab', name: 'উমর ইবনুল খাত্তাব', aliases: ['উমর', 'উমর ইবনু খাত্তাব', 'উমর ইবনুল খাত্তাব'] },
  { id: 'abdullah-ibn-amr', name: 'আবদুল্লাহ ইবনু আমর', aliases: ['ইবনু আমর', 'আবদুল্লাহ ইবনুল আস', 'আবদুল্লাহ ইবনু আমর ইবনিল আস', 'আবদুল্লাহ ইবনু আমর ইবনু আস', 'আবদুল্লাহ ইবনু আমর ইবনুল আস'] },
  { id: 'abu-musa-al-ashari', name: 'আবূ মূসা আশআরী', aliases: ['আবূ মূসা', 'আবূ মূসা আল-আশআরী', 'আবূ মূসা আল আশআরী'] },
  { id: 'jarir-ibn-abdullah', name: 'জারীর ইবনু আবদুল্লাহ', aliases: ['জারীর', 'জারির', 'জারীর ইবনু আবদিল্লাহ'] },
  { id: 'abu-dharr', name: 'আবূ যার', aliases: ['আবূ যার গিফারী', 'আবূ যর'] },
  { id: 'abu-qatadah', name: 'আবূ কাতাদা', aliases: ['আবূ কাতাদাহ', 'আবূ কাতাদা আনসারী'] },
  { id: 'sahl-ibn-sad', name: 'সাহল ইবনু সা’দ', aliases: ['সাহল ইবনু সাদ', 'সাহল ইবনু সা’দ সাইদী'] },
  { id: 'umm-salamah', name: 'উম্মু সালামা', aliases: ['উম্মে সালামা', 'উম্মু সালামাহ', 'উম্মুল মুমিনীন উম্মু সালামা'] },
  { id: 'al-bara-ibn-azib', name: 'বারা ইবনু আযিব', aliases: ['বারা', 'বারাআ', 'বারা ইবনু আযেব'] },
  { id: 'abu-bakrah', name: 'আবূ বকরা', aliases: ['আবূ বাকরা', 'আবূ বাকরাহ'] },
  { id: 'abu-bakr', name: 'আবূ বকর', aliases: ['আবূ বকর সিদ্দীক', 'আবূ বকর সিদ্দিক', 'আবূ বকর ইবনু আবূ কুহাফা'] },
  { id: 'uthman', name: 'উসমান ইবনু আফফান', aliases: ['উসমান', 'উসমান ইবনু আফ্ফান', 'উসমান গনী'] },
  { id: 'hudhayfah', name: 'হুযায়ফা', aliases: ['হুযায়ফা ইবনুল ইয়ামান', 'হুযায়ফা ইবনু ইয়ামান', 'হুযাইফা ইবনুল ইয়ামান'] },
  { id: 'imran-ibn-husayn', name: 'ইমরান ইবনু হুসায়ন', aliases: ['ইমরান ইবনু হুসাইন', 'ইমরান', 'ইমরান ইবনু হুসেন'] },
  { id: 'jabir-ibn-samurah', name: 'জাবির ইবনু সামুরা', aliases: ['জাবির ইবনু সামুরাহ'] },
  { id: 'abu-masud', name: 'আবূ মাসউদ', aliases: ['আবূ মাসউদ আনসারী', 'আবূ মাসউদ আল-আনসারী'] },
  { id: 'abu-darda', name: 'আবূ দারদা', aliases: ['আবূ দারদাহ'] },
  { id: 'abu-umamah', name: 'আবূ উমামা', aliases: ['আবূ উমামাহ', 'আবূ উমামা বাহিলী'] },
  { id: 'abu-ayyub', name: 'আবূ আইয়ূব আনসারী', aliases: ['আবূ আইয়ূব', 'আবূ আইউব'] },
  { id: 'sad-ibn-abi-waqqas', name: 'সা’দ ইবনু আবূ ওয়াক্কাস', aliases: ['সা’দ ইবনু আবী ওয়াক্কাস', 'সা’দ ইবনু ওয়াক্কাস'] },
  { id: 'uqbah-ibn-amir', name: 'উকবা ইবনু আমির', aliases: ['উকবা ইবনু আমের', 'উকবা'] },
];
