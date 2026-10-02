import { render, screen } from '@testing-library/react';
import { bookById } from './books';
import { clearRelatedCache, loadRelated, parseRelated, relatedUrl, shardKey } from './related';
import { useRelated } from './useRelated';

const bukhari = bookById('bukhari');
const muslim = bookById('muslim');

afterEach(() => {
  clearRelatedCache();
  delete global.fetch;
});

function serve(map) {
  global.fetch = vi.fn((url) =>
    url in map
      ? Promise.resolve({ ok: true, json: () => Promise.resolve(map[url]) })
      : Promise.resolve({ ok: false, status: 404 })
  );
}

describe('shardKey and relatedUrl', () => {
  test('a shard holds 100 numbers: 1 to 100 are shard 0, 101 is shard 1', () => {
    expect(shardKey(bukhari, 1)).toBe('BUK-0');
    expect(shardKey(bukhari, 100)).toBe('BUK-0');
    expect(shardKey(bukhari, 101)).toBe('BUK-1');
    expect(shardKey(muslim, 7281)).toBe('MUS-72');
  });

  test('the address is the shard file under /json/related', () => {
    expect(relatedUrl(bukhari, 6628)).toBe('/json/related/BUK-66.json');
    expect(relatedUrl(bookById('ibnmajah'), 3)).toBe('/json/related/MAJ-0.json');
  });
});

describe('parseRelated', () => {
  test('a shared-words entry becomes the book id, number, reason and the words', () => {
    expect(parseRelated(['MUS', 5300, 'w', 'রোযা ইফতার সাহরী'])).toEqual({
      book: 'muslim',
      number: 5300,
      reason: 'sharedWords',
      words: ['রোযা', 'ইফতার', 'সাহরী'],
    });
  });

  test('a same-report entry has no words', () => {
    expect(parseRelated(['TIR', 12, 's'])).toEqual({ book: 'tirmidhi', number: 12, reason: 'sameReport', words: [] });
  });

  test('an entry that cannot be read is null, so it is skipped rather than shown wrong', () => {
    expect(parseRelated(['XXX', 1, 's'])).toBeNull();
    expect(parseRelated(['BUK', 'x', 's'])).toBeNull();
    expect(parseRelated(['BUK', 1, '?'])).toBeNull();
    expect(parseRelated(null)).toBeNull();
  });
});

describe('loadRelated', () => {
  const shard = {
    '6628': [['MUS', 7066, 's'], ['NAS', 5000, 'w', 'মুনাফিক যুগ']],
  };

  test('reads the entry for the hadis from its shard', async () => {
    serve({ '/json/related/BUK-66.json': shard });
    const result = await loadRelated(bukhari, 6628);
    expect(result.status).toBe('ok');
    expect(result.items).toEqual([
      { book: 'muslim', number: 7066, reason: 'sameReport', words: [] },
      { book: 'nasai', number: 5000, reason: 'sharedWords', words: ['মুনাফিক', 'যুগ'] },
    ]);
  });

  test('a number with no entry in its shard has no related hadis', async () => {
    serve({ '/json/related/BUK-66.json': shard });
    expect(await loadRelated(bukhari, 6629)).toEqual({ status: 'ok', items: [] });
  });

  test('a missing shard (404) means no related hadis, not an error', async () => {
    serve({});
    expect(await loadRelated(bukhari, 6628)).toEqual({ status: 'ok', items: [] });
  });

  test('a network failure is a quiet "error" and is tried again next time', async () => {
    let calls = 0;
    global.fetch = vi.fn(() => {
      calls += 1;
      return calls === 1 ? Promise.reject(new Error('offline')) : Promise.resolve({ ok: true, json: () => Promise.resolve(shard) });
    });
    expect(await loadRelated(bukhari, 6628)).toEqual({ status: 'error', items: [] });
    expect((await loadRelated(bukhari, 6628)).status).toBe('ok');
  });

  test('a shard that is not valid JSON counts as an error', async () => {
    global.fetch = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.reject(new SyntaxError('bad')) }));
    expect(await loadRelated(bukhari, 6628)).toEqual({ status: 'error', items: [] });
  });

  test('a shard is fetched once for all 100 of its hadis', async () => {
    serve({ '/json/related/BUK-66.json': shard });
    await loadRelated(bukhari, 6601);
    await loadRelated(bukhari, 6628);
    await loadRelated(bukhari, 6700);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  test('clearRelatedCache forgets the shards', async () => {
    serve({ '/json/related/BUK-66.json': shard });
    await loadRelated(bukhari, 6628);
    clearRelatedCache();
    await loadRelated(bukhari, 6628);
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });
});

describe('useRelated', () => {
  function Probe({ bookId, number }) {
    const { status, items } = useRelated(bookId, number);
    return <div data-testid="out">{status}:{items.map((i) => `${i.book}-${i.number}`).join(',')}</div>;
  }

  test('is loading first, then gives the items', async () => {
    serve({ '/json/related/BUK-66.json': { '6628': [['MUS', 7066, 's']] } });
    render(<Probe bookId="bukhari" number={6628} />);
    expect(screen.getByTestId('out')).toHaveTextContent('loading:');
    expect(await screen.findByText('ok:muslim-7066')).toBeInTheDocument();
  });

  test('moving to another hadis shows loading, not the previous hadis items', async () => {
    serve({ '/json/related/BUK-66.json': { '6628': [['MUS', 7066, 's']] } });
    const { rerender } = render(<Probe bookId="bukhari" number={6628} />);
    await screen.findByText('ok:muslim-7066');
    rerender(<Probe bookId="bukhari" number={6629} />);
    expect(screen.getByTestId('out')).toHaveTextContent('loading:');
    expect(await screen.findByText('ok:')).toBeInTheDocument();
  });
});
