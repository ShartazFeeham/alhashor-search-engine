import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createWorkerHandler } from './searchWorkerCore';

function fakeIndex({ delay = 0 } = {}) {
  const calls = [];
  const wait = () => new Promise((resolve) => setTimeout(resolve, delay));
  return {
    calls,
    searchTags: async (words, options) => {
      calls.push(['search', words, options]);
      await wait();
      return words.map((word) => `BUK-${word.length}`);
    },
    suggest: async (words, options) => {
      calls.push(['suggest', words, options]);
      await wait();
      return [{ query: words.join(' ') }];
    },
  };
}

describe('the worker side of the search protocol', () => {
  test('answers a search with its result, under the same id', async () => {
    const posted = [];
    const handle = createWorkerHandler(fakeIndex(), (message) => posted.push(message));
    await handle({ id: 7, type: 'search', words: ['রোজা', 'নামায'] });
    expect(posted).toEqual([{ id: 7, type: 'result', value: ['BUK-4', 'BUK-5'] }]);
  });

  test('answers a suggest request, passing the result count on', async () => {
    const index = fakeIndex();
    const posted = [];
    const handle = createWorkerHandler(index, (message) => posted.push(message));
    await handle({ id: 2, type: 'suggest', words: ['জাকাত'], resultCount: 1 });
    expect(posted).toEqual([{ id: 2, type: 'result', value: [{ query: 'জাকাত' }] }]);
    expect(index.calls[0][2]).toMatchObject({ resultCount: 1 });
  });

  test('a search that is cancelled while it runs posts nothing and is told to stop', async () => {
    const index = fakeIndex({ delay: 10 });
    const posted = [];
    const handle = createWorkerHandler(index, (message) => posted.push(message));
    const running = handle({ id: 1, type: 'search', words: ['রোজা'] });
    handle({ id: 1, type: 'cancel' });
    expect(index.calls[0][2].isCancelled()).toBe(true);
    await running;
    expect(posted).toEqual([]);
  });

  test('cancelling one search leaves another running', async () => {
    const posted = [];
    const handle = createWorkerHandler(fakeIndex({ delay: 5 }), (message) => posted.push(message));
    const first = handle({ id: 1, type: 'search', words: ['রোজা'] });
    const second = handle({ id: 2, type: 'search', words: ['নামায'] });
    handle({ id: 1, type: 'cancel' });
    await Promise.all([first, second]);
    expect(posted.map((message) => message.id)).toEqual([2]);
  });

  test('cancelling an id that is not running (already answered) is harmless and does not cancel a later one', async () => {
    const posted = [];
    const handle = createWorkerHandler(fakeIndex(), (message) => posted.push(message));
    await handle({ id: 1, type: 'search', words: ['রোজা'] });
    handle({ id: 1, type: 'cancel' });
    await handle({ id: 1, type: 'search', words: ['রোজা'] });
    expect(posted).toHaveLength(2);
  });

  test('a failing search is reported as an error under its id', async () => {
    const posted = [];
    const index = { searchTags: async () => { throw new Error('boom'); }, suggest: async () => [] };
    const handle = createWorkerHandler(index, (message) => posted.push(message));
    await handle({ id: 3, type: 'search', words: ['রোজা'] });
    expect(posted).toEqual([{ id: 3, type: 'error', message: 'boom' }]);
  });

  test('ignores messages it does not know', async () => {
    const posted = [];
    const handle = createWorkerHandler(fakeIndex(), (message) => posted.push(message));
    await handle({ id: 1, type: 'launch' });
    await handle(undefined);
    expect(posted).toEqual([]);
  });
});

describe('the worker file', () => {
  const source = readFileSync(path.resolve(process.cwd(), 'src/search/search.worker.js'), 'utf8');

  test('is wired to the protocol: reads messages, posts answers', () => {
    expect(source).toMatch(/createWorkerHandler/);
    expect(source).toMatch(/onmessage/);
    expect(source).toMatch(/postMessage/);
  });

  test('is self-contained: imports only from this app and names no other address', () => {
    const imports = [...source.matchAll(/from\s+['"]([^'"]+)['"]/g)].map((match) => match[1]);
    expect(imports.length).toBeGreaterThan(0);
    imports.forEach((specifier) => expect(specifier.startsWith('./') || specifier.startsWith('../')).toBe(true));
    expect(source).not.toMatch(/https?:\/\//);
    expect(source).not.toMatch(/importScripts/);
  });
});
