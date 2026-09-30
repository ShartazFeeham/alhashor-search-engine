// Looks hadis up in the static data files under /json:
//   tags/<first two characters>.json       word -> hadis tags containing it
//   substring/<first two characters>.json  word -> longer words that contain it
//
// The files spell some Bengali letters two ways (য় as one character or as য + ়, ো as one
// character or as ে + া, ...), and a word is filed under the first two characters of whichever
// spelling was used. So a lookup compares words by their normalized spelling, and checks the
// file of every raw spelling of the word's start.

import { normalizeBengali } from "../Helpers/bengali";

export { normalizeBengali };

const PUNCTUATION = /[&/#^+()$~%.'":*?<>{}!@,;।]/g;
const MAX_WORDS_FOR_LONGER_WORDS = 8;

// [normalized form, other spelling used in the data]
const SPELLINGS = [
    ["য়", "য়"], // য়
    ["ড়", "ড়"], // ড়
    ["ঢ়", "ঢ়"], // ঢ়
    ["ো", "ো"], // ো
    ["ৌ", "ৌ"], // ৌ
];

export function normalizeQuery(text) {
    if (typeof text !== "string") return [];
    return text.replace(PUNCTUATION, "").split(/\s+/).filter(Boolean);
}

// The file names a normalized word could be stored under: the first two characters of each
// way its start may be spelled. (Invisible joiners inside those two characters are not covered.)
function rawPrefixes(word) {
    const start = word.substring(0, 4);
    let spellings = [""];
    for (let i = 0; i < start.length;) {
        const spelling = SPELLINGS.find(([normalized]) => start.startsWith(normalized, i));
        const options = spelling ? spelling : [start[i]];
        spellings = spellings.flatMap((so) => options.map((option) => so + option));
        i += spelling ? spelling[0].length : 1;
    }
    return [...new Set(spellings.map((spelling) => spelling.substring(0, 2)))];
}

function fetchJson(url) {
    return fetch(url).then((res) => {
        if (!res.ok) throw new Error(`Could not load ${url}`);
        return res.json();
    });
}

// normalized word -> everything filed under it (both spellings merged)
function indexFile(data) {
    const index = new Map();
    if (data === null || typeof data !== "object") return index;
    for (const [word, entries] of Object.entries(data)) {
        if (!Array.isArray(entries)) continue;
        const key = normalizeBengali(word);
        index.set(key, index.has(key) ? index.get(key).concat(entries) : entries);
    }
    return index;
}

export function createSearchIndex(load = fetchJson) {
    const files = new Map(); // url -> Promise of the file's index

    function loadFile(kind, prefix) {
        const url = `${process.env.PUBLIC_URL}/json/${kind}/${prefix}.json`;
        if (!files.has(url)) {
            files.set(
                url,
                load(url)
                    .then(indexFile)
                    .catch(() => {
                        files.delete(url); // try again on the next search
                        return new Map();
                    })
            );
        }
        return files.get(url);
    }

    async function lookup(kind, word) {
        const normalized = normalizeBengali(word);
        const indexes = await Promise.all(rawPrefixes(normalized).map((prefix) => loadFile(kind, prefix)));
        return indexes.flatMap((index) => index.get(normalized) || []);
    }

    async function tagsForWord(word, includeLongerWords) {
        const [ownTags, longerWords] = await Promise.all([
            lookup("tags", word),
            includeLongerWords ? lookup("substring", word) : [],
        ]);
        const tags = new Set(ownTags);
        const longerTags = await Promise.all([...new Set(longerWords)].map((longer) => lookup("tags", longer)));
        longerTags.forEach((list) => list.forEach((tag) => tags.add(tag)));
        return tags;
    }

    // Hadis tags, best matches (most of the words) first.
    async function searchTags(words, { requireAll = false } = {}) {
        const includeLongerWords = words.length < MAX_WORDS_FOR_LONGER_WORDS;
        const tagsPerWord = await Promise.all(words.map((word) => tagsForWord(word, includeLongerWords)));

        const matches = new Map(); // tag -> number of words it matches
        for (const tags of tagsPerWord) {
            for (const tag of tags) matches.set(tag, (matches.get(tag) || 0) + 1);
        }

        let ranked = [...matches.entries()];
        if (requireAll) ranked = ranked.filter(([, count]) => count === words.length);
        return ranked.sort((a, b) => b[1] - a[1]).map(([tag]) => tag);
    }

    return { searchTags };
}

export const { searchTags } = createSearchIndex();
