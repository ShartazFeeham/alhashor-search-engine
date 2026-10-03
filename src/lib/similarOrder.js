// The order of the similar hadis: the most matched words first, and among hadis with the same number of
// matched words the shortest first (the quickest to read). Full ties keep the order they came in (the
// search order). Entries are { tag, matched, text, words? }: `words` is the word count when it is known,
// else the character length of `text` is used. A hadis with no text (it did not load) has nothing to
// measure, so it goes after the others. Which hadis are listed is not decided here.
const lengthOf = (entry) => {
  if (typeof entry.words === 'number') return entry.words;
  return typeof entry.text === 'string' ? entry.text.length : Infinity;
};

export function orderSimilar(entries) {
  return entries
    .map((entry, position) => ({ entry, position, length: lengthOf(entry) }))
    .sort((a, b) => b.entry.matched - a.entry.matched || (a.length === b.length ? 0 : a.length < b.length ? -1 : 1) || a.position - b.position)
    .map(({ entry }) => entry);
}
