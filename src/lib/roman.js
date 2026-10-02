// The Roman-letter (Avro phonetic) engine behind the search box. banglaInput.js decides what to
// do with each keystroke; this file only turns the Roman letters of one word into Bengali.
let toBanglaFn = null;
let loading = null;

// The spelling the hadis use for common words, where the phonetic library spells it another way.
// Only the first (most used) spelling of each is kept: it replaces the converter's answer when the
// whole word typed so far is exactly one of these.
const CURATED = {
  namaz: 'নামায',
  salat: 'সালাত',
  roja: 'রোজা',
  roza: 'রোজা',
  hajj: 'হজ্জ',
  hoj: 'হজ্জ',
  zakat: 'যাকাত',
  jannat: 'জান্নাত',
  jahannam: 'জাহান্নাম',
  iman: 'ঈমান',
  dua: 'দোয়া',
  sabr: 'ধৈর্য',
  munafik: 'মুনাফিক',
  kabor: 'কবর',
  gosol: 'গোসল',
  ujur: 'উযূ',
  ozu: 'উযূ',
  abuhurairah: 'আবূ হুরায়রা',
  abuhurayra: 'আবূ হুরায়রা',
};

// Starts loading the library (once). The search box calls it when it appears so typing is instant.
export function loadRoman() {
  if (!loading) {
    loading = import('@subhesadek/avro-phonetic').then((library) => {
      toBanglaFn = library.toBangla;
    });
  }
  return loading;
}

export function romanReady() {
  return toBanglaFn !== null;
}

// The Bengali for the Roman letters (and digits) of one word. Before the library is ready the
// letters come back as typed.
export function romanToBangla(roman) {
  if (!toBanglaFn) return roman;
  return CURATED[roman.toLowerCase()] || toBanglaFn(roman);
}
