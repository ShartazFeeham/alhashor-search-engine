// Hand-made groups of words that mean the same thing in the hadis translations, so a search that
// finds little under one spelling can offer the others ("did you mean"). Every word is in the form
// the search uses (see normalizeBengali); a word may have no hadis of its own under that spelling
// (জাকাত, ছালাত): it is still listed so a visitor who types it is pointed to the spellings that do.
// A suggestion is only shown after its word is checked to return hadis, so a stale entry is harmless.
// Add a group by writing its spellings in one array; a word belongs to one group only.
export const SYNONYM_GROUPS = [
  ['নামায', 'নামাজ', 'সালাত', 'ছালাত'],
  ['রোযা', 'রোজা', 'সিয়াম'],
  ['যাকাত', 'জাকাত'],
  ['হজ্জ', 'হজ', 'হাজ্জ'],
  ['দোয়া', 'দুআ', 'দুয়া', 'দু‘আ', 'দু’আ'],
  ['ঈমান', 'ইমান'],
  ['জান্নাত', 'বেহেশত'],
  ['জাহান্নাম', 'দোযখ', 'দোজখ'],
  ['উযূ', 'ওযু', 'ওযূ', 'অজু', 'ওজু', 'উযু'],
  ['কুরবানী', 'কোরবানী', 'কুরবানি', 'কোরবানি'],
  ['মুনাফিক', 'মুনাফেক'],
  ['সাহাবী', 'সাহাবি', 'ছাহাবী'],
  ['রাসূল', 'রসূল', 'রাসুল'],
  ['তাওবা', 'তওবা', 'তাওবাহ'],
  ['সাদাকা', 'সদকা', 'সাদাকাহ', 'ছদকা'],
  ['শহীদ', 'শহিদ'],
  ['কিয়ামত', 'কেয়ামত', 'ক্বিয়ামত', 'কিয়ামাত'],
  ['সাওয়াব', 'সওয়াব', 'ছওয়াব'],
  ['রমযান', 'রমজান', 'রমাযান', 'রমাদান'],
  ['কুরআন', 'কোরআন', 'কুরান'],
  ['ইশা', 'এশা'],
  ['ঈদ', 'ইদ'],
];
