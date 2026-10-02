import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createSearchIndex } from './searchIndex';
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

describe('the tags prefix in the message', () => {
  test('is handed to the index for a search and for a suggest', async () => {
    const index = fakeIndex();
    const handle = createWorkerHandler(index, () => {});
    await handle({ id: 1, type: 'search', words: ['রোজা'], tagsPrefix: 3 });
    await handle({ id: 2, type: 'suggest', words: ['রোজা'], resultCount: 0, tagsPrefix: 2 });
    expect(index.calls[0][2]).toMatchObject({ tagsPrefix: 3 });
    expect(index.calls[1][2]).toMatchObject({ tagsPrefix: 2 });
  });

  test('a message without one leaves the choice to the index', async () => {
    const index = fakeIndex();
    const handle = createWorkerHandler(index, () => {});
    await handle({ id: 1, type: 'search', words: ['রোজা'] });
    expect(index.calls[0][2].tagsPrefix).toBeUndefined();
  });

  test('with the real index: the worker reads the folder the message names, whatever its own configuration says', async () => {
    const asked = [];
    const posted = [];
    const load = async (url) => {
      asked.push(url);
      return url.includes('/json/tags') ? { 'নামায': ['BUK-1'] } : {};
    };
    const handle = createWorkerHandler(createSearchIndex(load), (message) => posted.push(message));
    await handle({ id: 1, type: 'search', words: ['নামায'], tagsPrefix: 3 }); // setupTests pins the page to 2
    expect(asked.filter((url) => url.includes('/json/tags'))).toEqual(['/json/tags3/নাম.json']);
    await handle({ id: 2, type: 'search', words: ['নামায'], tagsPrefix: 2 });
    expect(asked.filter((url) => url.includes('/json/tags'))).toEqual(['/json/tags3/নাম.json', '/json/tags/না.json']);
    expect(posted).toEqual([{ id: 1, type: 'result', value: ['BUK-1'] }, { id: 2, type: 'result', value: ['BUK-1'] }]);
  });

  test('a value that is not a layout is not trusted: the index falls back to its configuration', async () => {
    const asked = [];
    const handle = createWorkerHandler(createSearchIndex(async (url) => { asked.push(url); return {}; }), () => {});
    await handle({ id: 1, type: 'search', words: ['নামায'], tagsPrefix: 9 });
    expect(asked).toContain('/json/tags/না.json'); // 2: what setupTests pins
  });
});

describe('the substring prefix and the cap in the message', () => {
  test('are handed to the index for a search and for a suggest', async () => {
    const index = fakeIndex();
    const handle = createWorkerHandler(index, () => {});
    await handle({ id: 1, type: 'search', words: ['রোজা'], substringPrefix: 3, containingCap: 50 });
    await handle({ id: 2, type: 'suggest', words: ['রোজা'], resultCount: 0, substringPrefix: 2, containingCap: 0 });
    expect(index.calls[0][2]).toMatchObject({ substringPrefix: 3, containingCap: 50 });
    expect(index.calls[1][2]).toMatchObject({ substringPrefix: 2, containingCap: 0 });
  });

  test('a message without them leaves the choice to the index', async () => {
    const index = fakeIndex();
    await createWorkerHandler(index, () => {})({ id: 1, type: 'search', words: ['রোজা'] });
    expect(index.calls[0][2].substringPrefix).toBeUndefined();
    expect(index.calls[0][2].containingCap).toBeUndefined();
  });

  test('with the real index: the worker reads the folder and the cap the message names, whatever its own configuration says', async () => {
    const asked = [];
    const posted = [];
    const files = {
      '/json/substring3/নাম.json': { নামায: ['নামাযা', 'নামাযে'] },
      '/json/substring/না.json': { নামায: ['নামাযা', 'নামাযে'] },
      '/json/tags/না.json': { নামায: ['BUK-1'], নামাযা: ['BUK-2'], নামাযে: ['BUK-3'] },
    };
    const load = async (url) => {
      asked.push(url);
      if (url in files) return files[url];
      throw Object.assign(new Error('404'), { status: 404 });
    };
    const handle = createWorkerHandler(createSearchIndex(load), (message) => posted.push(message));
    // setupTests pins the page to 2-letter files and the cap off
    await handle({ id: 1, type: 'search', words: ['নামায'], substringPrefix: 3, containingCap: 1 });
    expect(asked.filter((url) => url.includes('/json/substring'))).toEqual(['/json/substring3/নাম.json']);
    expect(posted[0].value).toEqual(['BUK-1', 'BUK-2']); // one containing word only
    await handle({ id: 2, type: 'search', words: ['নামায'], substringPrefix: 2, containingCap: 1 });
    expect(asked.filter((url) => url.includes('/json/substring'))).toEqual(['/json/substring3/নাম.json', '/json/substring/না.json']);
    expect(posted[1].value).toEqual(['BUK-1', 'BUK-2', 'BUK-3']); // 2-letter lists: the cap is ignored
  });

  test('values that are not valid are not trusted: the index falls back to its configuration', async () => {
    const asked = [];
    const handle = createWorkerHandler(createSearchIndex(async (url) => { asked.push(url); return {}; }), () => {});
    await handle({ id: 1, type: 'search', words: ['নামায'], substringPrefix: 9, containingCap: 'many' });
    expect(asked).toContain('/json/substring/না.json'); // 2: what setupTests pins
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
