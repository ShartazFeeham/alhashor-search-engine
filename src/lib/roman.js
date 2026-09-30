const CURATED = {
  namaz: ['নামায', 'নামাজ', 'সালাত'],
  salat: ['সালাত', 'নামায'],
  roja: ['রোজা', 'রোযা'],
  roza: ['রোজা', 'রোযা'],
  hajj: ['হজ্জ', 'হাজ্জ'],
  hoj: ['হজ্জ'],
  zakat: ['যাকাত'],
  jannat: ['জান্নাত'],
  jahannam: ['জাহান্নাম'],
  iman: ['ঈমান'],
  dua: ['দোয়া'],
  sabr: ['ধৈর্য', 'সবর'],
  munafik: ['মুনাফিক'],
  kabor: ['কবর'],
  gosol: ['গোসল'],
  ujur: ['উযূ'],
  ozu: ['উযূ'],
  abuhurairah: ['আবূ হুরায়রা'],
  abuhurayra: ['আবূ হুরায়রা'],
};

export function isRoman(text) {
  return /^[a-z0-9\s'.-]+$/i.test(text) && /[a-z]/i.test(text);
}

export function curatedSuggestions(text) {
  return CURATED[text.trim().toLowerCase()] || [];
}

export async function romanSuggestions(text) {
  const value = text.trim();
  if (!isRoman(value)) return [];
  const suggestions = [...curatedSuggestions(value)];
  const { toBangla } = await import('@subhesadek/avro-phonetic'); // loaded only when someone types Roman letters
  const converted = toBangla(value);
  if (converted && !suggestions.includes(converted)) suggestions.push(converted);
  return suggestions;
}
