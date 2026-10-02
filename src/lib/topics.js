import { normalizeBengali } from '../Helpers/bengali';
import { bookById, hasHadis } from './books';

// The topics of the index, curated by what people look for (see docs/topics-review.md). A topic is
// simply a word (or words): its hadis are the ones that contain every word of it, so a good name
// is one people search for AND that returns a meaningful set (about 15 to 6,000 hadis here).
// Where the data spells a word two ways, one spelling is kept: the one with the larger result set.
// Spelling variants the data also uses are NOT listed (search does not merge spellings yet), each
// has its own, smaller, result set: নামাজ (1898), রোজা (403), হজ্জ (896), তওবা (134), সুন্নত (51),
// যিকর/জিকির (61/6), হেদায়াত (27), উযু/ওযু (145/38), জুমা (81), জোহর (47), এশা (123),
// কেয়ামত (4), তাকদির (6), তাওহিদ (1), কুরবানি (11), কোরবানী (82), উমরাহ (56), সদকা (65), মদীনা (419),
// দু'আ/দুআ (260), বিতর (318), তারাবী (39). The spelling kept is the one with the larger result set in the data.
// Names may carry stray spaces here; they are trimmed below.
const TOPIC_NAMES = [
  // ঈমান ও আকীদা
  'ঈমান',
  'ইসলাম',
  'ইহসান',
  'তাওহীদ',
  'রিসালাত',
  'শিরক',
  'কালিমা',
  'নিয়ত',
  'ইখলাস',
  'তাকওয়া',
  'বিশ্বাস',
  'তাকদীর',
  'ফেরেশতা',
  'ওহী',
  'কুরআন',
  'তিলাওয়াত',
  'মুনাফিক',
  'কাফির',
  'বিদআত',
  'সুন্নাত',
  'মুমিন',
  // নামায
  'নামায',
  'সালাত',
  'ওজু',
  'আযান',
  'জুমুআ',
  'তারাবীহ',
  'তাহাজ্জুদ',
  'বিত্র',
  'নফল',
  'সিজদা',
  'খুতবা',
  'ঈদের নামায',
  'জানাযা',
  'কাফন',
  'দাফন',
  'ফজর',
  'যোহর',
  'আসর',
  'মাগরিব',
  'ইশা',
  'কিবলা',
  'মসজিদ',
  'কাবা',
  // রোযা, যাকাত ও হজ্জ
  'রোযা',
  'সিয়াম',
  'সাওম',
  'রমযান',
  'সাহরী',
  'ইফতার',
  'লাইলাতুল কদর',
  'ইতিকাফ',
  'ফিতরা',
  'ফিতর',
  'আযহা',
  'যাকাত',
  'সাদাকা',
  'হজ',
  'উমরা',
  'ইহরাম',
  'তাওয়াফ',
  'যমযম',
  'কুরবানী',
  'আকীকা',
  // পবিত্রতা
  'গোসল',
  'তায়াম্মুম',
  'মিসওয়াক',
  'পবিত্রতা',
  'নাপাক',
  'হায়েয',
  // দোয়া ও যিকর
  'দোয়া',
  'যিকর',
  'ইস্তিগফার',
  'দরূদ',
  'তাওবা',
  // চরিত্র ও আচরণ
  'ধৈর্য',
  'শোকর',
  'অহংকার',
  'হিংসা',
  'লোভ',
  'মিথ্যা',
  'সত্য',
  'আমানত',
  'ওয়াদা',
  'লজ্জা',
  'ক্ষমা',
  'রাগ',
  'কান্না',
  'দয়া',
  'কৃপণ',
  'ঝগড়া',
  'অপবাদ',
  'অভিসম্পাত',
  'ভালোবাসা',
  'বন্ধুত্ব',
  'সন্তুষ্টি',
  'জুলুম',
  'চরিত্র',
  // লেনদেন ও বিচার
  'সুদ',
  'ঘুষ',
  'ঋণ',
  'ব্যবসা',
  'ওজন',
  'সাক্ষ্য',
  'হালাল',
  'হারাম',
  'মদ্যপান',
  'নেশা',
  'গুনাহ',
  'কবীরা',
  'কাফফারা',
  'কসম',
  'মানত',
  'ইনসাফ',
  'বিচার',
  'চুরি',
  'হত্যা',
  'শাসক',
  'নেতৃত্ব',
  'আনুগত্য',
  'উত্তরাধিকার',
  // পরিবার ও সমাজ
  'বিবাহ',
  'তালাক',
  'স্বামী',
  'স্ত্রী',
  'সন্তান',
  'নারী',
  'পর্দা',
  'পিতামাতা',
  'আত্মীয়',
  'প্রতিবেশী',
  'ইয়াতীম',
  'মেহমান',
  'সালাম',
  'দরিদ্র',
  'মুসলিম ভাই',
  // জীবন ও স্বাস্থ্য
  'খাবার',
  'পানি',
  'পোশাক',
  'ঘুম',
  'স্বপ্ন',
  'চিকিৎসা',
  'রোগ',
  'রোগী',
  'ঔষধ',
  'মধু',
  'খেজুর',
  'গোশত',
  'দাড়ি',
  'সুগন্ধি',
  'ছবি',
  'যাদু',
  'গান',
  'সফর',
  'মুসাফির',
  // প্রকৃতি ও প্রাণী
  'চাঁদ',
  'সূর্য',
  'বৃষ্টি',
  'সাপ',
  'কুকুর',
  'ঘোড়া',
  'উট',
  'পশু',
  // মৃত্যু ও আখিরাত
  'মৃত্যু',
  'কবর',
  'কবরের আযাব',
  'কিয়ামত',
  'হাশর',
  'হিসাব',
  'আমলনামা',
  'শাফাআত',
  'জান্নাত',
  'জাহান্নাম',
  'আখিরাত',
  'আরশ',
  'আসমান',
  'দাজ্জাল',
  'ফিতনা',
  'রূহ',
  'আমল',
  'শয়তান',
  'মাহদী',
  'শাস্তি',
  'শান্তি',
  // ইতিহাস ও জিহাদ
  'জিহাদ',
  'যুদ্ধ',
  'শহীদ',
  'শাহাদাত',
  'হিজরত',
  'বদর',
  'উহুদ',
  'মিরাজ',
  'মক্কা বিজয়',
  'মদিনা',
  // জ্ঞান ও দ্বীনের আমল
  'জ্ঞান',
  'ইলম',
  'শিক্ষা',
  'বরকত',
  'রহমত',
  'হিদায়াত',
  'ইবাদত',
  'দাওয়াত',
  'দুনিয়া',
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

// The address of a topic's page (0-based `page`; the first page has no "?page="), /topics?topic=
// &page=&book=&sort=desc. A book filter other than 'all' is kept as "&book=<id>", a descending
// menu sort as "&sort=desc"; the defaults are left out.
export function topicHref(topic, page = 0, sort = 'asc', book = 'all') {
  const params = new URLSearchParams();
  if (topic) params.set('topic', topic);
  if (topic && page > 0) params.set('page', String(page + 1));
  if (topic && book && book !== 'all') params.set('book', book);
  if (sort === 'desc') params.set('sort', 'desc');
  const query = params.toString();
  return query ? `/topics?${query}` : '/topics';
}

// The editor's "start here" entries (switched off by the owner: nothing shows them now) for a topic ([{ book, number, note }], see
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
