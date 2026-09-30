// Looks hadis up in the static data files under /json:
//   tags/<first two letters>.json       word -> hadis tags containing it
//   substring/<first two letters>.json  word -> longer words that contain it

const PUNCTUATION = /[&/#^+()$~%.'":*?<>{}!@,;।]/g;
const MAX_WORDS_FOR_LONGER_WORDS = 8;

export function normalizeQuery(text) {
    if (typeof text !== "string") return [];
    return text.replace(PUNCTUATION, "").split(/\s+/).filter(Boolean);
}

// Own array entries only, so words like "constructor" don't hit Object.prototype.
function entriesFor(shard, word) {
    return Object.prototype.hasOwnProperty.call(shard, word) && Array.isArray(shard[word])
        ? shard[word]
        : [];
}

function fetchJson(url) {
    return fetch(url).then((res) => {
        if (!res.ok) throw new Error(`Could not load ${url}`);
        return res.json();
    });
}

export function createSearchIndex(load = fetchJson) {
    const shards = new Map(); // url -> Promise of the parsed file

    function loadShard(kind, word) {
        const url = `${process.env.PUBLIC_URL}/json/${kind}/${word.substring(0, 2)}.json`;
        if (!shards.has(url)) {
            shards.set(
                url,
                load(url)
                    .then((data) => (data !== null && typeof data === "object" ? data : {}))
                    .catch(() => {
                        shards.delete(url); // try again on the next search
                        return {};
                    })
            );
        }
        return shards.get(url);
    }

    async function tagsForWord(word, includeLongerWords) {
        const [tagShard, substringShard] = await Promise.all([
            loadShard("tags", word),
            includeLongerWords ? loadShard("substring", word) : {},
        ]);
        const tags = new Set(entriesFor(tagShard, word));
        const longerWords = entriesFor(substringShard, word);
        const longerShards = await Promise.all(longerWords.map((longer) => loadShard("tags", longer)));
        longerWords.forEach((longer, i) => {
            entriesFor(longerShards[i], longer).forEach((tag) => tags.add(tag));
        });
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
