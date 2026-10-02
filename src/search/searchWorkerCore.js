// The worker's side of the search protocol, kept apart from the Worker itself so it can be tested.
//
//   page -> worker  { id, type: 'search', words, tagsPrefix, substringPrefix, containingCap }
//                   { id, type: 'suggest', words, resultCount, tagsPrefix, substringPrefix, containingCap }
//                   { id, type: 'cancel' }
//   worker -> page  { id, type: 'result', value }
//                   { id, type: 'error', message }
//
// tagsPrefix and substringPrefix (2 or 3) are the page's choice of word-file folders and
// containingCap (0 to 500) its cap on the containing words (searchConfig.js); the worker cannot read
// the page's address, so it is told. Left out or not valid: the index decides.
//
// A cancelled request is told to stop at its next step (searchIndex asks `isCancelled` between
// steps) and posts nothing.
export function createWorkerHandler(index, post) {
  const running = new Set();
  const cancelled = new Set();

  return async function handle(message) {
    if (!message || typeof message !== 'object') return;
    const { id, type } = message;
    if (type === 'cancel') {
      if (running.has(id)) cancelled.add(id);
      return;
    }
    if (type !== 'search' && type !== 'suggest') return;

    running.add(id);
    const isCancelled = () => cancelled.has(id);
    const { tagsPrefix, substringPrefix, containingCap } = message;
    try {
      const value = type === 'search'
        ? await index.searchTags(message.words, { isCancelled, tagsPrefix, substringPrefix, containingCap })
        : await index.suggest(message.words, { resultCount: message.resultCount, isCancelled, tagsPrefix, substringPrefix, containingCap });
      if (!isCancelled()) post({ id, type: 'result', value });
    } catch (error) {
      if (!isCancelled()) post({ id, type: 'error', message: String(error?.message || error) });
    } finally {
      running.delete(id);
      cancelled.delete(id);
    }
  };
}
