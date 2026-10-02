// Looks hadis up in the static data files under /json:
//   tags/<first two characters>.json       word -> hadis tags containing it
//   substring/<first two characters>.json  word -> longer words that contain it
//
// The files spell some Bengali letters two ways (য় as one character or as য + ়, ো as one
// character or as ে + া, ...), and a word is filed under the first two characters of whichever
// spelling was used. So a lookup compares words by their normalized spelling, and checks the
// file of every raw spelling of the word's start.

import { BASE_PATH } from "../Helpers/basePath";
import { normalizeBengali } from "../Helpers/bengali";
import { candidatesFor, hasBengali, rankSuggestions } from "../lib/didYouMean";

export { normalizeBengali };

const PUNCTUATION = /[&/#^+()$~%.'":*?<>{}!@,;।]/g;
// A query of fewer than this many words looks inside longer words for every word. In a longer
// query (often a pasted sentence) that is skipped for very common words, which would only pull in
// thousands of hadis and many data files.
const SHORT_QUERY_WORDS = 8;
const COMMON_WORD_HADIS = 500;
// "Did you mean" (see suggest below): a search with fewer results than this, or a word with fewer
// hadis than this, is worth a suggestion; the spellings it tries may open at most this many data
// files the search has not already loaded.
const FEW_RESULTS = 3;
const MAX_EXTRA_FILES = 6;
const MAX_WEAK_WORDS = 3;

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
        const url = `${BASE_PATH}/json/${kind}/${prefix}.json`;
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
    // `isCancelled` (optional) is asked between the steps; a stale search stops early with nothing.
    async function tagsForWord(word, shortQuery, isCancelled = () => false) {
        const ownTags = lookup("tags", word);
        const longerWords = shortQuery
            ? lookup("substring", word)
            : ownTags.then((own) => (new Set(own).size > COMMON_WORD_HADIS ? [] : lookup("substring", word)));
        const [own, longer] = await Promise.all([ownTags, longerWords]);
        if (isCancelled()) return new Map();

        const found = new Map();
        own.forEach((tag) => found.set(tag, true));
        const longerTags = await Promise.all([...new Set(longer)].map((longerWord) => lookup("tags", longerWord)));
        longerTags.forEach((list) => list.forEach((tag) => {
            if (!found.has(tag)) found.set(tag, false);
        }));
        return found;
    }

    // Hadis tags, best matches first: the most of the searched words, then the most of them exactly.
    async function searchTags(words, { requireAll = false, isCancelled = () => false } = {}) {
        const shortQuery = words.length < SHORT_QUERY_WORDS;
        const foundPerWord = await Promise.all(words.map((word) => tagsForWord(word, shortQuery, isCancelled)));
        if (isCancelled()) return [];

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

    // How many hadis a word returns, counted exactly only when it could matter: a word with at
    // least `enough` hadis of its own is reported by that count alone.
    async function wordHits(word, enough) {
        const own = new Set(await lookup("tags", word)).size;
        if (own >= enough) return own;
        if ((await lookup("substring", word)).length === 0) return own;
        return (await tagsForWord(word, true)).size;
    }

    // The words of the data file(s) a word is filed in, with how many hadis each has.
    async function vocabularyOf(word) {
        const indexes = await Promise.all(rawPrefixes(normalizeBengali(word)).map((prefix) => loadFile("tags", prefix)));
        const vocabulary = new Map();
        for (const index of indexes) {
            for (const [key, entries] of index) vocabulary.set(key, (vocabulary.get(key) || 0) + entries.length);
        }
        return vocabulary;
    }

    // Candidates with the number of hadis each really returns. A spelling whose data file is not
    // loaded yet costs a download, so only a few such files are opened (best candidates first).
    async function checkCandidates(candidates, vocabulary) {
        let opened = 0;
        const chosen = [];
        for (const candidate of candidates) {
            // a word already in a loaded file costs nothing; a missing file counts as a download
            const fresh = vocabulary.has(candidate.word) ? 0 : rawPrefixes(normalizeBengali(candidate.word))
                .filter((prefix) => !files.has(`${BASE_PATH}/json/tags/${prefix}.json`)).length;
            if (opened + fresh > MAX_EXTRA_FILES) continue;
            opened += fresh;
            chosen.push(candidate);
        }
        return Promise.all(chosen.map(async (candidate) => ({
            ...candidate,
            hits: new Set(await lookup("tags", candidate.word)).size,
        })));
    }

    // "Did you mean": corrected queries for a search that found little. A word is weak when it
    // returns fewer hadis than FEW_RESULTS (or none at all when the search found plenty). Each weak
    // word's spellings (hand-made synonyms, commonly confused letters, a close word in its own data
    // file) are checked against the data, and only ones that return more hadis are kept.
    // Returns up to three { query, changed: [{ from, to }], kind, hits }, the best first; every
    // weak word that has a better spelling is corrected in each, the first weak word in the ways listed.
    async function suggest(words, { resultCount = 0, isCancelled = () => false } = {}) {
        const enough = resultCount < FEW_RESULTS ? FEW_RESULTS : 1;
        const checkable = words.map((word, position) => ({ word, position })).filter(({ word }) => hasBengali(word));
        const hits = await Promise.all(checkable.map(({ word }) => wordHits(word, enough)));
        if (isCancelled()) return [];

        const weak = checkable
            .map((entry, i) => ({ ...entry, hits: hits[i] }))
            .filter((entry) => entry.hits < enough)
            .slice(0, MAX_WEAK_WORDS);
        const options = [];
        for (const entry of weak) {
            const vocabulary = await vocabularyOf(entry.word);
            const candidates = candidatesFor(entry.word, vocabulary);
            if (isCancelled()) return [];
            const ranked = rankSuggestions(entry.hits, await checkCandidates(candidates, vocabulary));
            if (isCancelled()) return [];
            if (ranked.length > 0) options.push({ ...entry, ranked });
        }
        if (options.length === 0) return [];

        const [first, ...others] = options;
        return first.ranked.map((choice) => {
            const corrected = [...words];
            const changed = [{ position: first.position, from: first.word, to: choice.word }];
            others.forEach((other) => changed.push({ position: other.position, from: other.word, to: other.ranked[0].word }));
            changed.sort((a, b) => a.position - b.position);
            changed.forEach(({ position, to }) => { corrected[position] = to; });
            return {
                query: corrected.join(" "),
                changed: changed.map(({ from, to }) => ({ from, to })),
                kind: choice.kind,
                hits: choice.hits,
            };
        });
    }

    return { searchTags, suggest };
}

export const { searchTags, suggest } = createSearchIndex();
