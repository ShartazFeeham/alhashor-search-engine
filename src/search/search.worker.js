// The search worker: the same word-file lookups as the page's own search (searchIndex.js), run off
// the page's thread so loading, parsing and ranking big data files cannot stall typing or scrolling.
// It only reads the site's own /json files; the protocol is in searchWorkerCore.js.
import { createSearchIndex } from './searchIndex';
import { createWorkerHandler } from './searchWorkerCore';

const handle = createWorkerHandler(createSearchIndex(), (message) => self.postMessage(message));
self.onmessage = (event) => handle(event.data);
