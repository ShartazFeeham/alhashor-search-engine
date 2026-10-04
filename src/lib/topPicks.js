import { PLANS } from '../data/readingPlans';
import set01 from '../data/topPicks/set-01.json';
import set02 from '../data/topPicks/set-02.json';
import set03 from '../data/topPicks/set-03.json';
import set04 from '../data/topPicks/set-04.json';
import set05 from '../data/topPicks/set-05.json';
import set06 from '../data/topPicks/set-06.json';
import set07 from '../data/topPicks/set-07.json';
import set08 from '../data/topPicks/set-08.json';
import set09 from '../data/topPicks/set-09.json';
import set10 from '../data/topPicks/set-10.json';
import set11 from '../data/topPicks/set-11.json';
import set12 from '../data/topPicks/set-12.json';
import { bookById, hasHadis } from './books';
import { FEATURED_SET_NUMBERS } from './featuredSets';

// টপ লিস্ট/হাদীস: the owner's hand-picked hadis in themed sets.
//
// Each src/data/topPicks/set-NN.json is { id, number, title, description, items, missing }; an item
// is { line, book, number, note, grade } (book is a book id from books.js). The sets are shaped
// like the reading plans the checklist page already shows ({ id, title, description, days }), so
// that page, its progress and its storage key work for them unchanged. The three older plans
// (রমযান, ছোট হাদীস, উত্তম চরিত্র) follow the twelve sets.

const SETS = [set01, set02, set03, set04, set05, set06, set07, set08, set09, set10, set11, set12];

// An item with a book we do not know or a number that has no hadis is skipped, never shown.
const isValidItem = (item) => {
  const book = item && bookById(item.book);
  return Boolean(book) && hasHadis(book, item.number);
};

export function setFromFile(file) {
  const days = (file.items ?? []).filter(isValidItem).map((item) => ({
    book: item.book,
    number: item.number,
    line: item.line || null,
    note: item.note || null,
    grade: item.grade ?? null,
  }));
  return {
    id: file.id,
    number: file.number,
    title: file.title,
    description: file.description ?? '',
    days,
    missing: file.missing ?? [],
  };
}

// Every set file, empty or not (the picks for the home page and the daily hadis read from these).
export const ALL_SETS = SETS.map(setFromFile);

// What the pages show: a set with no valid hadis is not listed, has no page, and is never offered.
// The sets chosen for the home page and the daily hadis are FEATURED_SET_NUMBERS (featuredSets.js).
export { FEATURED_SET_NUMBERS };

// The featured sets that have hadis, in the order of FEATURED_SET_NUMBERS.
export const featuredSets = (sets = ALL_SETS) =>
  FEATURED_SET_NUMBERS.map((number) => sets.find((set) => set.number === number)).filter((set) => set && set.days.length > 0);

// `count` different sets chosen at random from `sets` (a partial shuffle; `random` is Math.random).
export function randomSets(sets, count, random = Math.random) {
  const pool = [...sets];
  const chosen = [];
  while (chosen.length < count && pool.length > 0) chosen.push(pool.splice(Math.floor(random() * pool.length), 1)[0]);
  return chosen;
}

// The order the sets are listed in on the জনপ্রিয় হাদীস page, by set number (the owner's choice; the sets
// keep their numbers, ids and titles, which the home page, the daily hadis, the colours and the saved
// progress rely on). The three older plans follow.
export const ORDER = [5, 1, 3, 4, 6, 9, 2, 7, 8, 10, 11, 12];

const ordered = ORDER.map((number) => ALL_SETS.find((set) => set.number === number)).filter(Boolean);

export const TOP_PICKS = [...ordered, ...PLANS].filter((set) => set.days.length > 0);

// The one line under the page heading, on the home card and in the page's meta description.
export const TOP_PICKS_TAGLINE = 'সবথেকে জনপ্রিয় হাদীসের সংগ্রহ';

// The address of the sets list, or of one set.
export const topPicksHref = (id) => (id ? `/top-picks/${encodeURIComponent(id)}` : '/top-picks');
