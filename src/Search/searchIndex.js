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
// A query of fewer than this many words looks inside longer words for every word. In a longer
// query (often a pasted sentence) that is skipped for very common words, which would only pull in
// thousands of hadis and many data files.
const SHORT_QUERY_WORDS = 8;
const COMMON_WORD_HADIS = 500;

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

    // Map of tag -> true if the word itself is in that hadis, false if only a longer word containing it is.
    async function tagsForWord(word, shortQuery) {
        const ownTags = lookup("tags", word);
        const longerWords = shortQuery
            ? lookup("substring", word)
            : ownTags.then((own) => (new Set(own).size > COMMON_WORD_HADIS ? [] : lookup("substring", word)));
        const [own, longer] = await Promise.all([ownTags, longerWords]);

        const found = new Map();
        own.forEach((tag) => found.set(tag, true));
        const longerTags = await Promise.all([...new Set(longer)].map((longerWord) => lookup("tags", longerWord)));
        longerTags.forEach((list) => list.forEach((tag) => {
            if (!found.has(tag)) found.set(tag, false);
        }));
        return found;
    }

    // Hadis tags, best matches first: the most of the searched words, then the most of them exactly.
    async function searchTags(words, { requireAll = false } = {}) {
        const shortQuery = words.length < SHORT_QUERY_WORDS;
        const foundPerWord = await Promise.all(words.map((word) => tagsForWord(word, shortQuery)));

        const matches = new Map(); // tag -> { words matched, words matched exactly }
        for (const found of foundPerWord) {
            for (const [tag, exact] of found) {
                const match = matches.get(tag) || { words: 0, exact: 0 };
                match.words++;
                if (exact) match.exact++;
                matches.set(tag, match);
            }
        }

        let ranked = [...matches.entries()];
        if (requireAll) ranked = ranked.filter(([, match]) => match.words === words.length);
        return ranked
            .sort((a, b) => b[1].words - a[1].words || b[1].exact - a[1].exact)
            .map(([tag]) => tag);
    }

    return { searchTags };
}

export const { searchTags } = createSearchIndex();
