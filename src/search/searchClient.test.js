import { createSearchClient } from './searchClient';
import { setContainingCapForTests, setSubstringPrefixForTests, setTagsPrefixForTests } from './searchConfig';

// A stand-in for the browser's Worker: records what is posted and lets a test answer it.
class FakeWorker {
  static instances = [];

  constructor() {
    this.sent = [];
    this.terminated = false;
    this.onmessage = null;
    this.onerror = null;
    FakeWorker.instances.push(this);
  }

  postMessage(message) {
    this.sent.push(message);
  }

  terminate() {
    this.terminated = true;
  }

  reply(message) {
    this.onmessage?.({ data: message });
  }

  crash() {
    this.onerror?.({ message: 'script failed' });
  }
}

function localIndex() {
  const calls = [];
  return {
    calls,
    searchTags: async (words, options) => {
      calls.push(['search', words, options]);
      return ['LOCAL-1'];
    },
    suggest: async (words, options) => {
      calls.push(['suggest', words, options]);
      return [{ query: 'local' }];
    },
  };
}

function setup(overrides = {}) {
  FakeWorker.instances = [];
  const index = localIndex();
  const client = createSearchClient({ startWorker: () => new FakeWorker(), index, ...overrides });
  return { client, index, worker: () => FakeWorker.instances[0] };
}

describe('search client with a worker', () => {
  test('does not start a worker until the first search', () => {
    setup();
    expect(FakeWorker.instances).toHaveLength(0);
  });

  test('posts the search to the worker and resolves with its answer', async () => {
    const { client, worker } = setup();
    const { promise } = client.search(['রোজা', 'নামায']);
    expect(worker().sent).toEqual([{ id: expect.any(Number), type: 'search', words: ['রোজা', 'নামায'], tagsPrefix: 2, substringPrefix: 2, containingCap: 0 }]);
    worker().reply({ id: worker().sent[0].id, type: 'result', value: ['BUK-1', 'BUK-2'] });
    expect(await promise).toEqual(['BUK-1', 'BUK-2']);
  });

  test('uses one worker for every search', () => {
    const { client } = setup();
    client.search(['ক']);
    client.search(['খ']);
    client.suggest(['গ'], { resultCount: 0 });
    expect(FakeWorker.instances).toHaveLength(1);
  });

  test('posts a suggest request with the result count', async () => {
    const { client, worker } = setup();
    const { promise } = client.suggest(['জাকাত'], { resultCount: 2 });
    const [message] = worker().sent;
    expect(message).toMatchObject({ type: 'suggest', words: ['জাকাত'], resultCount: 2 });
    worker().reply({ id: message.id, type: 'result', value: [{ query: 'যাকাত' }] });
    expect(await promise).toEqual([{ query: 'যাকাত' }]);
  });

  test('matches each answer to its own request, whatever order they arrive in', async () => {
    const { client, worker } = setup();
    const a = client.search(['ক']);
    const b = client.search(['খ']);
    const [first, second] = worker().sent;
    worker().reply({ id: second.id, type: 'result', value: ['B'] });
    worker().reply({ id: first.id, type: 'result', value: ['A'] });
    expect(await a.promise).toEqual(['A']);
    expect(await b.promise).toEqual(['B']);
  });

  test('cancel tells the worker, resolves with null and ignores a late answer', async () => {
    const { client, worker } = setup();
    const { promise, cancel } = client.search(['ক']);
    const [message] = worker().sent;
    cancel();
    expect(worker().sent[1]).toEqual({ id: message.id, type: 'cancel' });
    expect(await promise).toBeNull();
    worker().reply({ id: message.id, type: 'result', value: ['late'] }); // must not throw
  });

  test('cancelling after the answer does nothing', async () => {
    const { client, worker } = setup();
    const { promise, cancel } = client.search(['ক']);
    worker().reply({ id: worker().sent[0].id, type: 'result', value: ['A'] });
    expect(await promise).toEqual(['A']);
    cancel();
    expect(worker().sent).toHaveLength(1);
  });

  test('an error answer for one request runs that request here instead', async () => {
    const { client, worker, index } = setup();
    const { promise } = client.search(['ক']);
    worker().reply({ id: worker().sent[0].id, type: 'error', message: 'boom' });
    expect(await promise).toEqual(['LOCAL-1']);
    expect(index.calls).toHaveLength(1);
    expect(worker().terminated).toBe(false);
  });

  test('if the worker script fails, waiting requests run here and later ones skip the worker', async () => {
    const { client, worker, index } = setup();
    const waiting = client.search(['ক']);
    worker().crash();
    expect(await waiting.promise).toEqual(['LOCAL-1']);
    expect(worker().terminated).toBe(true);

    const later = client.suggest(['খ'], { resultCount: 0 });
    expect(await later.promise).toEqual([{ query: 'local' }]);
    expect(FakeWorker.instances).toHaveLength(1);
    expect(index.calls.map(([kind]) => kind)).toEqual(['search', 'suggest']);
  });
});

describe('search client without a worker (jsdom, old browsers)', () => {
  test('runs the search on the main thread when there is no worker to start', async () => {
    const index = localIndex();
    const client = createSearchClient({ startWorker: null, index });
    expect(await client.search(['রোজা']).promise).toEqual(['LOCAL-1']);
    expect(index.calls[0].slice(0, 2)).toEqual(['search', ['রোজা']]);
  });

  test('and when starting the worker throws', async () => {
    const index = localIndex();
    const client = createSearchClient({ startWorker: () => { throw new Error('blocked'); }, index });
    expect(await client.search(['রোজা']).promise).toEqual(['LOCAL-1']);
    expect(await client.suggest(['রোজা'], { resultCount: 0 }).promise).toEqual([{ query: 'local' }]);
  });

  test('and when it returns nothing', async () => {
    const client = createSearchClient({ startWorker: () => null, index: localIndex() });
    expect(await client.search(['রোজা']).promise).toEqual(['LOCAL-1']);
  });

  test('passes the result count to suggest', async () => {
    const index = localIndex();
    const client = createSearchClient({ startWorker: null, index });
    await client.suggest(['রোজা'], { resultCount: 4 }).promise;
    expect(index.calls[0][2]).toMatchObject({ resultCount: 4 });
  });

  test('cancel resolves with null and tells the running search to stop', async () => {
    const index = localIndex();
    const client = createSearchClient({ startWorker: null, index });
    const { promise, cancel } = client.search(['রোজা']);
    cancel();
    expect(await promise).toBeNull();
    expect(index.calls[0][2].isCancelled()).toBe(true);
  });

  test('a search that throws gives no results rather than hanging', async () => {
    const index = { searchTags: async () => { throw new Error('x'); }, suggest: async () => { throw new Error('y'); } };
    const client = createSearchClient({ startWorker: null, index });
    expect(await client.search(['ক']).promise).toEqual([]);
    expect(await client.suggest(['ক'], { resultCount: 0 }).promise).toEqual([]);
  });
});

describe('the tags prefix travels with every request', () => {
  test('the page reads the configured prefix and sends it to the worker, with a search and with a suggest', () => {
    const { client, worker } = setup();
    setTagsPrefixForTests(3);
    client.search(['রোজা']);
    client.suggest(['রোজা'], { resultCount: 1 });
    expect(worker().sent.map(({ type, tagsPrefix }) => [type, tagsPrefix])).toEqual([['search', 3], ['suggest', 3]]);
  });

  test('it is read at each request, so a change of the address or switch takes effect on the next search', () => {
    const { client, worker } = setup();
    setTagsPrefixForTests(3);
    client.search(['ক']);
    setTagsPrefixForTests(2);
    client.search(['খ']);
    expect(worker().sent.map((message) => message.tagsPrefix)).toEqual([3, 2]);
  });

  test('the address is read on the page: ?idx=2 reaches the worker', () => {
    setTagsPrefixForTests(null);
    window.history.replaceState(null, '', '/search?q=x&idx=2');
    try {
      const { client, worker } = setup();
      client.search(['ক']);
      expect(worker().sent[0].tagsPrefix).toBe(2);
    } finally {
      window.history.replaceState(null, '', '/');
    }
  });

  test('on the main thread (no worker) the same prefix is handed to the index', async () => {
    const index = localIndex();
    const client = createSearchClient({ startWorker: null, index });
    setTagsPrefixForTests(3);
    await client.search(['রোজা']).promise;
    await client.suggest(['রোজা'], { resultCount: 0 }).promise;
    expect(index.calls.map(([, , options]) => options.tagsPrefix)).toEqual([3, 3]);
  });

  test('when the worker fails part-way, the search runs here with the prefix it was asked with', async () => {
    const { client, worker, index } = setup();
    setTagsPrefixForTests(3);
    const waiting = client.search(['ক']);
    setTagsPrefixForTests(2);
    worker().crash();
    await waiting.promise;
    expect(index.calls[0][2].tagsPrefix).toBe(3);
  });
});

describe('the substring prefix and the cap travel with every request too', () => {
  test('are read on the page and sent to the worker, with a search and with a suggest', () => {
    const { client, worker } = setup();
    setSubstringPrefixForTests(3);
    setContainingCapForTests(50);
    client.search(['রোজা']);
    client.suggest(['রোজা'], { resultCount: 1 });
    expect(worker().sent.map(({ type, substringPrefix, containingCap }) => [type, substringPrefix, containingCap]))
      .toEqual([['search', 3, 50], ['suggest', 3, 50]]);
  });

  test('are read at each request, so a change of the address or switch takes effect on the next search', () => {
    const { client, worker } = setup();
    setSubstringPrefixForTests(3);
    setContainingCapForTests(50);
    client.search(['ক']);
    setSubstringPrefixForTests(2);
    setContainingCapForTests(0);
    client.search(['খ']);
    expect(worker().sent.map(({ substringPrefix, containingCap }) => [substringPrefix, containingCap])).toEqual([[3, 50], [2, 0]]);
  });

  test('the address is read on the page: ?sub=2&cap=20 reaches the worker, an invalid value does not', () => {
    setSubstringPrefixForTests(null);
    setContainingCapForTests(null);
    try {
      window.history.replaceState(null, '', '/search?q=x&sub=2&cap=20');
      const first = setup();
      first.client.search(['ক']);
      expect(first.worker().sent[0]).toMatchObject({ substringPrefix: 2, containingCap: 20 });
      window.history.replaceState(null, '', '/search?q=x&sub=7&cap=9000');
      const second = setup();
      second.client.search(['ক']);
      expect(second.worker().sent[0]).toMatchObject({ substringPrefix: 3, containingCap: 50 });
      window.history.replaceState(null, '', '/search?q=x&cap=0');
      const third = setup();
      third.client.search(['ক']);
      expect(third.worker().sent[0]).toMatchObject({ substringPrefix: 3, containingCap: 0 });
    } finally {
      window.history.replaceState(null, '', '/');
    }
  });

  test('on the main thread (no worker) the same values are handed to the index', async () => {
    const index = localIndex();
    const client = createSearchClient({ startWorker: null, index });
    setSubstringPrefixForTests(3);
    setContainingCapForTests(20);
    await client.search(['রোজা']).promise;
    await client.suggest(['রোজা'], { resultCount: 0 }).promise;
    expect(index.calls.map(([, , options]) => [options.substringPrefix, options.containingCap])).toEqual([[3, 20], [3, 20]]);
  });

  test('when the worker fails part-way, the search runs here with the values it was asked with', async () => {
    const { client, worker, index } = setup();
    setSubstringPrefixForTests(3);
    setContainingCapForTests(30);
    const waiting = client.search(['ক']);
    setSubstringPrefixForTests(2);
    setContainingCapForTests(0);
    worker().crash();
    await waiting.promise;
    expect(index.calls[0][2]).toMatchObject({ substringPrefix: 3, containingCap: 30 });
  });
});
