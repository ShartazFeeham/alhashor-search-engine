// The six books, in display order. `total` is the highest hadis number that has a file under
// public/json/hadis/<folder>; `missing` lists the numbers up to `total` that have no file, as
// [first, last] ranges. `legacyName` is the spelling the old Books page uses (removed with it).

const BUKHARI_MISSING = [
    [63, 63], [448, 449], [574, 574], [581, 581], [595, 595], [625, 625], [633, 633],
    [637, 637], [690, 690], [752, 752], [781, 781], [878, 878], [958, 958], [1011, 1011],
    [1040, 1040], [1132, 1132], [1161, 1161], [1199, 1199], [1208, 1208], [1228, 1228],
    [1232, 1232], [1243, 1243], [1369, 1369], [1390, 1390], [1397, 1397], [1433, 1433],
    [1447, 1447], [1545, 1545], [1774, 1774], [1781, 1781], [1802, 1802], [1866, 1866],
    [1919, 1921], [1923, 2119], [2214, 2214], [2239, 2240], [2244, 2245], [2257, 2257],
    [2365, 2366], [2374, 2374], [2379, 2379], [2437, 2437], [2629, 2629], [2797, 2797],
    [2913, 2915], [2984, 2984], [3060, 3060], [3087, 3087], [3208, 3208], [3218, 3219],
    [3287, 3287], [3372, 3372], [3383, 3383], [3461, 3461], [3516, 3516], [3551, 3551],
    [3606, 3606], [3739, 3739], [3756, 3756], [3788, 3788], [3812, 3812], [3885, 3885],
    [4131, 4131], [4280, 4280], [4305, 4305], [4320, 4320], [4324, 4324], [4330, 4330],
    [4367, 4367], [4408, 4408], [4439, 4439], [4441, 4441], [4452, 4452], [4456, 4456],
    [4458, 4458], [4467, 4467], [4476, 4476], [4489, 4489], [4493, 4493], [4554, 4554],
    [4568, 4568], [4580, 4580], [4583, 4584], [4685, 4685], [4701, 4701], [4709, 4709],
    [4711, 4711], [4734, 4734], [4750, 4750], [4765, 4765], [4818, 4818], [4871, 4874],
    [4890, 4890], [4931, 4931], [4946, 4946], [5037, 5037], [5087, 5087], [5124, 5124],
    [5257, 5257], [5283, 5284], [5317, 5317], [5441, 5441], [5470, 5470], [5652, 5652],
    [5754, 5754], [5790, 5790], [5857, 5857], [5866, 5866], [5919, 5919], [5944, 5944],
    [5954, 5954], [6006, 6006], [6167, 6167], [6309, 6309], [6330, 6330], [6495, 6495],
    [6536, 6536], [6661, 6661], [6718, 6718], [6721, 6721], [6792, 6792], [6895, 6895],
    [6908, 6908], [7042, 7042],
];

const NASAI_MISSING = [
    [877, 878], [982, 982], [3087, 3087], [4664, 4664],
];

export const BOOKS = [
  { id: 'bukhari', slug: 'bukhari', code: 'BUK', folder: 'Bukhari', name: 'বুখারী', full: 'বুখারী শরীফ', cite: 'সহীহ বুখারী', badge: 'বু', legacyName: 'বুখারি শরীফ', colorVar: '--bk-bukhari', total: 7053, missing: BUKHARI_MISSING },
  { id: 'muslim', slug: 'muslim', code: 'MUS', folder: 'Muslim', name: 'মুসলিম', full: 'মুসলিম শরীফ', cite: 'সহীহ মুসলিম', badge: 'মু', legacyName: 'মুসলিম শরীফ', colorVar: '--bk-muslim', total: 7281, missing: [] },
  { id: 'tirmidhi', slug: 'tirmidhi', code: 'TIR', folder: 'Tirmiji', name: 'তিরমিযী', full: 'তিরমিযী শরীফ', cite: 'জামে‘ তিরমিযী', badge: 'তি', legacyName: 'তিরমিজি শরীফ', colorVar: '--bk-tirmidhi', total: 3608, missing: [] },
  { id: 'abudawud', slug: 'abudawud', code: 'DAU', folder: 'Daud', name: 'আবু দাউদ', full: 'আবু দাউদ শরীফ', cite: 'সুনান আবু দাউদ', badge: 'আ', legacyName: 'আবু দাউদ শরীফ', colorVar: '--bk-abudawud', total: 5184, missing: [] },
  { id: 'ibnmajah', slug: 'ibnmajah', code: 'MAJ', folder: 'Majah', name: 'ইবনে মাজাহ', full: 'ইবনে মাজাহ শরীফ', cite: 'সুনান ইবনে মাজাহ', badge: 'ই', legacyName: 'সুনানু ইবনে মাজাহ', colorVar: '--bk-ibnmajah', total: 4341, missing: [] },
  { id: 'nasai', slug: 'nasai', code: 'NAS', folder: 'Nasae', name: 'নাসাঈ', full: 'নাসাঈ শরীফ', cite: 'সুনান নাসাঈ', badge: 'না', legacyName: 'সুনানু নাসাঈ শরীফ', colorVar: '--bk-nasai', total: 5758, missing: NASAI_MISSING },
];

export const bookById = (id) => BOOKS.find((book) => book.id === id);
export const bookByCode = (code) => BOOKS.find((book) => book.code === code);

export function hasHadis(book, number) {
  if (!Number.isInteger(number) || number < 1 || number > book.total) return false;
  return !book.missing.some(([first, last]) => number >= first && number <= last);
}

export function hadisCount(book) {
  return book.total - book.missing.reduce((sum, [first, last]) => sum + (last - first + 1), 0);
}
