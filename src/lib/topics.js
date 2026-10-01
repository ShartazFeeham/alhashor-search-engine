import { normalizeBengali } from '../Helpers/bengali';
import { normalizeQuery, searchTags } from '../search/searchIndex';
import { bookById, hasHadis } from './books';
import { parseTag } from './hadisRoute';

// The topics of the index. A topic is simply a word (or words): its hadis are the ones that
// contain every word of it. Some are listed in two spellings (কিয়ামত and কেয়ামত); see TOPICS.
// Names may carry stray spaces here; they are trimmed below.
const TOPIC_NAMES = [
  'ঈমান',
  'নামায',
  'হজ্জ ',
  'রোজা',
  'কবর',
  'কিয়ামত ',
  'আখিরাত',
  'জাহান্নাম',
  'সাওম ',
  'পবিত্রতা ',
  'বিশ্বাস',
  'বিতর নামায',
  'কদর',
  'কাউসার',
  ' শাফাআত',
  ' মাকামে মাহমূদ',
  ' হুর',
  ' হিসাব',
  ' আমলনামা',
  ' আমল',
  ' মীযান',
  ' হাশর',
  ' লাওহে মাহফুয',
  ' সিদরাতুল মুনতাহা',
  'বায়তুল মামুর',
  'ইল্লীন',
  ' বারযাখ',
  'নিয়ত',
  'তাওহিদ',
  'রিসালাত',
  'সালাত',
  'যাকাত',
  'সাওম',
  'হজ',
  'শাহাদাত',
  'দাওয়াত',
  'দল',
  'প্রশিক্ষণ',
  'কুরআন',
  'আনুগত্য',
  'তাকওয়া',
  'পর্দা',
  'বাইয়াত',
  'তাওবা',
  'কুরবানি',
  'ত্যাগ',
  'রাষ্ট্র',
  'জান্নাত',
  'আত্মশুদ্ধি',
  'জিহাদ',
  'পানাহার',
  'হারাম',
  'হালাল',
  'খাবার',
  'দোয়া',
  'ক্ষমা',
  'দয়া',
  'দান',
  'মদ',
  'নেশা',
  'আরশ',
  'আসমান',
  'জমিন',
  'কৃপণ',
  'কৃপণতা',
  'ঈদ',
  'ফিতর',
  'ফেতরা',
  'ফিতরা',
  'আযহা',
  'কালিমা',
  'হায়েজ',
  'ঋতু',
  'বীর্য',
  'নাপাক',
  'ফজর',
  'আসর',
  'মাগরিব',
  'ইশা',
  'জোহর',
  'যোহর',
  'জুমা',
  'তাকদীর',
  'অহংকার',
  'লোভ',
  'ভালোবাসা',
  'ঝগড়া',
  'হিংসা',
  'বিবাদ',
  'ওযু',
  'উযু',
  'বিবাহ',
  'গোসল',
  'সুদ',
  'ঘুষ',
  'যুদ্ধ',
  'আজান',
  'নফল',
  'সালাম',
  'তাকদির',
  'শত্রুতা',
  'যাদু',
  'সংযম',
  'গান',
  'সঙ্গীত',
  'ফেরেশতা',
  'ফিতনা',
  'বেদাত',
  'দাজ্জাল',
  'কেয়ামত',
  'কিয়ামত',
  'ধৈর্য',
  'শান্তি',
  'তওবা',
  'ক্রন্দন',
  'শাস্তি',
  'খুতবা',
  'জান্নাতুল ফেরদাউস',
  'জ্ঞান',
  'জ্ঞানী',
  'জ্ঞান অর্জন',
  'শহীদ',
  'পোশাক',
  'স্বামী',
  'স্ত্রী',
  'সন্তান',
  'সুগন্ধী',
  'বন্ধুত্ব',
  'যিকর',
  'জিকির',
  'মসজিদ',
  'রহমত',
  'বরকত',
  'হেদায়াত',
  'হিদায়াত',
  'মাগফিরাত',
  'অভিশাপ',
  'অভিসম্পাত',
  'সুন্নাত',
  'সুন্নত',
];

// Each topic once, even if the list holds it in two spellings of the same letters, sorted.
export const TOPICS = Array.from(
  new Map(
    TOPIC_NAMES.map((name) => name.trim()).reduceRight((entries, name) => [[normalizeBengali(name), name], ...entries], [])
  ).values()
).sort();

// The topics whose name contains the typed text (letters compared by their normalized spelling).
export function filterTopics(topics, text) {
  const wanted = normalizeBengali(text).trim();
  if (wanted === '') return topics;
  return topics.filter((name) => normalizeBengali(name).includes(wanted));
}

// The address of a topic's page (0-based `page`; the first page has no "?page=").
export function topicHref(topic, page = 0) {
  const params = new URLSearchParams();
  if (topic) params.set('topic', topic);
  if (topic && page > 0) params.set('page', String(page + 1));
  const query = params.toString();
  return query ? `/topics?${query}` : '/topics';
}

// ["BUK-12", ...] as [{ bookId, number }, ...], skipping a tag that is not a hadis tag.
export function tagsToHadis(tags) {
  return tags.flatMap((tag) => {
    const parsed = parseTag(tag);
    return parsed ? [{ bookId: parsed.book.id, number: parsed.number }] : [];
  });
}

// Every hadis of a topic, best matches first. A topic of several words needs all of them.
// `search` is injectable for tests.
export async function loadTopicHadis(topic, search = searchTags) {
  const words = normalizeQuery(topic);
  if (words.length === 0) return [];
  return tagsToHadis(await search(words, { requireAll: true }));
}

// The editor's "start here" entries for a topic ([{ book, number, note }], see
// src/data/curatedTopics.js), without any that cannot be shown: an unknown book, or a number
// with no file. The topic is found whichever way its letters were typed.
export function curatedFor(curated, topic) {
  if (!curated || !topic) return [];
  const wanted = normalizeBengali(topic.trim());
  const key = Object.keys(curated).find((name) => normalizeBengali(name.trim()) === wanted);
  if (key === undefined) return [];
  return curated[key].filter((entry) => {
    const book = bookById(entry.book);
    return book !== undefined && hasHadis(book, entry.number);
  });
}
