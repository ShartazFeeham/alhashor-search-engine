// Looks hadis up in the static data files under /json:
//   tags/<first 2 characters>.json  or  tags3/<first 3 characters>.json   word -> hadis tags containing it
//   substring/<first 2 characters>.json  or  substring3/<first 3 characters>.json
//                                                                         word -> longer words that contain it
// Which of the two folders of each kind is used is a switch (searchConfig.js): the default, ?idx=2|3
// (tags) and ?sub=2|3 (substring) on the page address, or a prefix given with the request (the Web
// Worker gets it that way). substring3 lists are sorted by hadis count, the most first, which is what
// lets `containingCap` (?cap=) load the tags files of only the first N containing words of a word.
//
// The files spell some Bengali letters two ways (য় as one character or as য + ়, ো as one
// character or as ে + া, ...), and a word is filed under the first characters of whichever
// spelling was used. So a lookup compares words by their normalized spelling, and checks the
// file of every raw spelling of the word's start (candidateShards in src/lib/indexShards.js,
// which also builds the file names the generator wrote).

import { BASE_PATH } from "../Helpers/basePath";
import { normalizeBengali } from "../Helpers/bengali";
import { candidatesFor, hasBengali, rankSuggestions } from "../lib/didYouMean";
import { candidateShards } from "../lib/indexShards";
import { capOrDefault, folderFor, prefixOrDefault } from "./searchConfig";

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

export function normalizeQuery(text) {
    if (typeof text !== "string") return [];
    return text.replace(PUNCTUATION, "").split(/\s+/).filter(Boolean);
}

// The switches of one search: { tags, substring, cap }, the prefix lengths of the two folders and the
// cap on the containing words (0: off). A value given with the request wins (and must be a layout
// that exists, or a cap from 0 to 500), then the configured one. The cap only works on the 3-letter
// substring files, whose lists are sorted by hadis count; with the 2-letter ones it is off.
function layoutOf({ tagsPrefix, substringPrefix, containingCap } = {}) {
    const substring = prefixOrDefault("substring", substringPrefix);
    return { tags: prefixOrDefault("tags", tagsPrefix), substring, cap: substring === 3 ? capOrDefault(containingCap) : 0 };
}

function fetchJson(url) {
    return fetch(url).then((res) => {
        if (!res.ok) throw Object.assign(new Error(`Could not load ${url}`), { status: res.status });
        return res.json();
    });
}

// normalized word -> [{ word as the file spells it, its entries }], one per spelling filed under it
function indexFile(data) {
    const index = new Map();
    if (data === null || typeof data !== "object") return index;
    for (const [word, entries] of Object.entries(data)) {
        if (!Array.isArray(entries)) continue;
        const key = normalizeBengali(word);
        if (!index.has(key)) index.set(key, []);
        index.get(key).push({ word, entries });
    }
    return index;
}

// Everything filed under a normalized word in the files given, one { word, entries } per spelling,
// in the order of their raw spelling, so the order does not depend on how the files are cut (2 or 3
// letters) or in what order a file lists its words.
function spellingsOf(indexes, normalized) {
    const spellings = indexes.flatMap((index) => index.get(normalized) || []);
    return spellings.length === 1 ? spellings : spellings.sort((a, b) => (a.word < b.word ? -1 : a.word > b.word ? 1 : 0));
}

// The entries of all the spellings, merged.
function entriesOf(indexes, normalized) {
    const spellings = spellingsOf(indexes, normalized);
    return spellings.length === 1 ? spellings[0].entries : spellings.flatMap(({ entries }) => entries);
}

export function createSearchIndex(load = fetchJson) {
    const files = new Map(); // url -> Promise of the file's index

    const urlOf = (kind, shard, layout) => `${BASE_PATH}/json/${folderFor(kind, layout[kind])}/${shard}.json`;

    // A file that does not exist (404) is an empty file, remembered for the life of the page; any
    // other failure is also empty this time but tried again on the next search.
    function loadFile(kind, shard, layout) {
        const url = urlOf(kind, shard, layout);
        if (!files.has(url)) {
            files.set(
                url,
                load(url)
                    .then(indexFile)
                    .catch((error) => {
                        if (error?.status !== 404) files.delete(url);
                        return new Map();
                    })
            );
        }
        return files.get(url);
    }

    async function lookupSpellings(kind, word, layout) {
        const normalized = normalizeBengali(word);
        const indexes = await Promise.all(candidateShards(normalized, layout[kind]).map((shard) => loadFile(kind, shard, layout)));
        return spellingsOf(indexes, normalized);
    }

    async function lookup(kind, word, layout) {
        const normalized = normalizeBengali(word);
        const indexes = await Promise.all(candidateShards(normalized, layout[kind]).map((shard) => loadFile(kind, shard, layout)));
        return entriesOf(indexes, normalized);
    }

    // The longer words that contain a word, without repeats. With the cap on (layout.cap, 3-letter
    // substring files only) the first `cap` words of each list: those have the most hadis. A word
    // the data spells two ways has a list for each spelling, so each gets its own first `cap`.
    // The words come back sorted: the order of a list differs between the two folders (substring3
    // is by hadis count, substring is in no useful order), and the order the words are read in
    // decides which of two equally good hadis comes first, which must not depend on the folder.
    async function containingWords(word, layout) {
        const spellings = await lookupSpellings("substring", word, layout);
        const lists = spellings.map(({ entries }) => [...new Set(entries)]);
        if (layout.cap > 0) lists.forEach((list, i) => { lists[i] = list.slice(0, layout.cap); });
        return [...new Set(lists.flat())].sort();
    }

    // Map of tag -> true if the word itself is in that hadis, false if only a longer word containing it is.
    // `isCancelled` (optional) is asked between the steps; a stale search stops early with nothing.
    async function tagsForWord(word, shortQuery, layout, isCancelled = () => false) {
        const ownTags = lookup("tags", word, layout);
        const longerWords = shortQuery
            ? containingWords(word, layout)
            : ownTags.then((own) => (new Set(own).size > COMMON_WORD_HADIS ? [] : containingWords(word, layout)));
        const [own, longer] = await Promise.all([ownTags, longerWords]);
        if (isCancelled()) return new Map();

        const found = new Map();
        own.forEach((tag) => found.set(tag, true));
        const longerTags = await Promise.all(longer.map((longerWord) => lookup("tags", longerWord, layout)));
        longerTags.forEach((list) => list.forEach((tag) => {
            if (!found.has(tag)) found.set(tag, false);
        }));
        return found;
    }

    // Hadis tags, best matches first: the most of the searched words, then the most of them exactly.
    // `tagsPrefix` and `substringPrefix` (2 or 3, optional) choose the folders for this search and
    // `containingCap` (0 to 500, optional) the cap on the containing words; see searchConfig.js.
    async function searchTags(words, { requireAll = false, isCancelled = () => false, tagsPrefix, substringPrefix, containingCap } = {}) {
        const layout = layoutOf({ tagsPrefix, substringPrefix, containingCap });
        const shortQuery = words.length < SHORT_QUERY_WORDS;
        const foundPerWord = await Promise.all(words.map((word) => tagsForWord(word, shortQuery, layout, isCancelled)));
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
    async function wordHits(word, enough, layout) {
        const own = new Set(await lookup("tags", word, layout)).size;
        if (own >= enough) return own;
        if ((await containingWords(word, layout)).length === 0) return own;
        return (await tagsForWord(word, true, layout)).size;
    }

    // The words of the data file(s) a word is filed in, with how many hadis each has.
    async function vocabularyOf(word, layout) {
        const indexes = await Promise.all(candidateShards(normalizeBengali(word), layout.tags).map((shard) => loadFile("tags", shard, layout)));
        const vocabulary = new Map();
        for (const index of indexes) {
            for (const [key, spellings] of index) {
                vocabulary.set(key, spellings.reduce((count, { entries }) => count + entries.length, vocabulary.get(key) || 0));
            }
        }
        return vocabulary;
    }

    // Candidates with the number of hadis each really returns. A spelling whose data file is not
    // loaded yet costs a download, so only a few such files are opened (best candidates first).
    async function checkCandidates(candidates, vocabulary, layout) {
        let opened = 0;
        const chosen = [];
        for (const candidate of candidates) {
            // a word already in a loaded file costs nothing; a missing file counts as a download
            const fresh = vocabulary.has(candidate.word) ? 0 : candidateShards(normalizeBengali(candidate.word), layout.tags)
                .filter((shard) => !files.has(urlOf("tags", shard, layout))).length;
            if (opened + fresh > MAX_EXTRA_FILES) continue;
            opened += fresh;
            chosen.push(candidate);
        }
        return Promise.all(chosen.map(async (candidate) => ({
            ...candidate,
            hits: new Set(await lookup("tags", candidate.word, layout)).size,
        })));
    }

    // "Did you mean": corrected queries for a search that found little. A word is weak when it
    // returns fewer hadis than FEW_RESULTS (or none at all when the search found plenty). Each weak
    // word's spellings (hand-made synonyms, commonly confused letters, a close word in its own data
    // file) are checked against the data, and only ones that return more hadis are kept.
    // Returns up to three { query, changed: [{ from, to }], kind, hits }, the best first; every
    // weak word that has a better spelling is corrected in each, the first weak word in the ways listed.
    async function suggest(words, { resultCount = 0, isCancelled = () => false, tagsPrefix, substringPrefix, containingCap } = {}) {
        const layout = layoutOf({ tagsPrefix, substringPrefix, containingCap });
        const enough = resultCount < FEW_RESULTS ? FEW_RESULTS : 1;
        const checkable = words.map((word, position) => ({ word, position })).filter(({ word }) => hasBengali(word));
        const hits = await Promise.all(checkable.map(({ word }) => wordHits(word, enough, layout)));
        if (isCancelled()) return [];

        const weak = checkable
            .map((entry, i) => ({ ...entry, hits: hits[i] }))
            .filter((entry) => entry.hits < enough)
            .slice(0, MAX_WEAK_WORDS);
        const options = [];
        for (const entry of weak) {
            const vocabulary = await vocabularyOf(entry.word, layout);
            const candidates = candidatesFor(entry.word, vocabulary);
            if (isCancelled()) return [];
            const ranked = rankSuggestions(entry.hits, await checkCandidates(candidates, vocabulary, layout));
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
