// The page's way to search: the work happens in a Web Worker (search.worker.js) when the browser
// has one, and on the main thread (the same code, searchIndex.js) when it has not, when the worker
// cannot start, or when it fails part-way. The results are the same either way.
//
// search(words) and suggest(words, { resultCount }) return { promise, cancel }. cancel() resolves
// the promise with null at once, stops the work at its next step and ignores a late answer. Asking
// for a search never throws: a failure gives no results.
//
// The search switches (searchConfig.js) are read from the page's address, which a worker cannot
// see, so each request reads the tags prefix here and carries it, to the worker in its message and
// to the local index in its options.

import { getTagsPrefix } from './searchConfig';
import { searchTags, suggest } from './searchIndex';

export function createSearchClient({ startWorker, index }) {
  let worker = null;
  let started = false;
  let nextId = 1;
  const pending = new Map(); // id -> run it on this thread instead (the worker failed)

  function failWorker() {
    worker?.terminate?.();
    worker = null;
    const waiting = [...pending.values()];
    pending.clear();
    waiting.forEach((runHere) => runHere());
  }

  function onMessage(event) {
    const { id, type, value } = event.data || {};
    const runHere = pending.get(id);
    if (!runHere) return; // cancelled, or answered already
    pending.delete(id);
    if (type === 'result') runHere.resolve(value);
    else runHere();
  }

  function workerOrNull() {
    if (!started) {
      started = true;
      try {
        worker = startWorker ? startWorker() : null;
      } catch {
        worker = null;
      }
      if (worker) {
        worker.onmessage = onMessage;
        worker.onerror = failWorker;
      }
    }
    return worker;
  }

  function request(type, payload) {
    const id = nextId++;
    const tagsPrefix = getTagsPrefix();
    let settle;
    let done = false;
    let cancelled = false;
    const promise = new Promise((resolve) => {
      settle = (value) => {
        if (done) return;
        done = true;
        pending.delete(id);
        resolve(value);
      };
    });

    const runHere = () => {
      const isCancelled = () => cancelled;
      const work = type === 'search'
        ? index.searchTags(payload.words, { isCancelled, tagsPrefix })
        : index.suggest(payload.words, { resultCount: payload.resultCount, isCancelled, tagsPrefix });
      work.then(
        (value) => settle(cancelled ? null : value),
        () => settle(cancelled ? null : [])
      );
    };
    runHere.resolve = (value) => settle(value);

    const target = workerOrNull();
    if (target) {
      pending.set(id, runHere);
      target.postMessage({ id, type, ...payload, tagsPrefix });
    } else {
      runHere();
    }

    const cancel = () => {
      if (done) return;
      cancelled = true;
      if (pending.has(id)) worker?.postMessage({ id, type: 'cancel' });
      settle(null);
    };
    return { promise, cancel };
  }

  return {
    search: (words) => request('search', { words }),
    suggest: (words, { resultCount = 0 } = {}) => request('suggest', { words, resultCount }),
  };
}

// A worker is made only where the browser has one. The URL form is what Next.js looks for to
// bundle the worker file.
function startSearchWorker() {
  if (typeof Worker === 'undefined') return null;
  return new Worker(new URL('./search.worker.js', import.meta.url));
}

export const searchClient = createSearchClient({ startWorker: startSearchWorker, index: { searchTags, suggest } });
