import { createSearchClient } from './searchClient';

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
    expect(worker().sent).toEqual([{ id: expect.any(Number), type: 'search', words: ['রোজা', 'নামায'] }]);
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
