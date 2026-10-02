// The worker's side of the search protocol, kept apart from the Worker itself so it can be tested.
//
//   page -> worker  { id, type: 'search', words }
//                   { id, type: 'suggest', words, resultCount }
//                   { id, type: 'cancel' }
//   worker -> page  { id, type: 'result', value }
//                   { id, type: 'error', message }
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
    try {
      const value = type === 'search'
        ? await index.searchTags(message.words, { isCancelled })
        : await index.suggest(message.words, { resultCount: message.resultCount, isCancelled });
      if (!isCancelled()) post({ id, type: 'result', value });
    } catch (error) {
      if (!isCancelled()) post({ id, type: 'error', message: String(error?.message || error) });
    } finally {
      running.delete(id);
      cancelled.delete(id);
    }
  };
}
