import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { usePathname, useSearchParams } from 'next/navigation';
import { setUrl } from '../test/nextNavigation';
import Topics from './Topics';

const prefix = (word) => word.substring(0, 2);
const NO_HADIS = /এই বিষয়ে কোনো হাদীস পাওয়া যায়নি/;

function Where() {
  const pathname = usePathname();
  const query = useSearchParams().toString();
  return <div data-testid="where">{decodeURIComponent(pathname + (query ? '?' + query : ''))}</div>;
}

function renderTopics(url = '/topics') {
  setUrl(url);
  return render(
    <>
      <Topics />
      <Where />
    </>
  );
}

const where = () => screen.getByTestId('where');

function reply(body) {
  return Promise.resolve({ ok: body !== undefined, json: () => Promise.resolve(body) });
}

// `word` matches `count` hadis (BUK-1 ... BUK-count); hadis n has the text "t<n>".
function servePaged(word, count) {
  global.fetch = vi.fn((url) => {
    if (url === `/json/tags/${prefix(word)}.json`) {
      return reply({ [word]: Array.from({ length: count }, (_, i) => `BUK-${i + 1}`) });
    }
    const hadis = url.match(/\/json\/hadis\/Bukhari\/(\d+)\/text\.txt/);
    if (hadis) return reply(`t${parseInt(hadis[1], 10)}`);
    return reply(undefined);
  });
}

afterEach(() => {
  delete global.fetch;
});

test('shows the hadis for the chosen topic', async () => {
  global.fetch = vi.fn((url) => {
    if (url === `/json/tags/${prefix('ঈমান')}.json`) return reply({ ঈমান: ['BUK-1'] });
    if (url === '/json/hadis/Bukhari/0001/text.txt') return reply('imaan hadis text');
    return reply(undefined);
  });
  renderTopics();
  fireEvent.click(screen.getByText('ঈমান'));
  expect(await screen.findByText('imaan')).toBeInTheDocument();
});

test('a topic of several words shows only hadis that contain all of them', async () => {
  global.fetch = vi.fn((url) => {
    if (url === `/json/tags/${prefix('জ্ঞান')}.json`) return reply({ জ্ঞান: ['BUK-1', 'BUK-2'] });
    if (url === `/json/tags/${prefix('অর্জন')}.json`) return reply({ অর্জন: ['BUK-2'] });
    if (url === '/json/hadis/Bukhari/0001/text.txt') return reply('only-first');
    if (url === '/json/hadis/Bukhari/0002/text.txt') return reply('both-words');
    return reply(undefined);
  });
  renderTopics();
  fireEvent.click(screen.getByText('জ্ঞান অর্জন'));
  expect(await screen.findByText('both-words')).toBeInTheDocument();
  expect(screen.queryByText('only-first')).not.toBeInTheDocument();
});

test('a topic with no hadis says so instead of loading forever', async () => {
  global.fetch = vi.fn(() => reply(undefined));
  renderTopics();
  fireEvent.click(screen.getByText('কৃপণতা'));
  expect(await screen.findByText(NO_HADIS)).toBeInTheDocument();
  expect(screen.queryByAltText('loading...')).not.toBeInTheDocument();
});

test('a slow earlier topic cannot overwrite the topic chosen after it', async () => {
  let releaseSlow;
  global.fetch = vi.fn((url) => {
    if (url === `/json/tags/${prefix('সুদ')}.json`) {
      return new Promise((resolve) => {
        releaseSlow = () => resolve({ ok: true, json: () => Promise.resolve({ সুদ: ['BUK-7'] }) });
      });
    }
    if (url === `/json/tags/${prefix('ঘুষ')}.json`) return reply({ ঘুষ: ['BUK-1'] });
    if (url === '/json/hadis/Bukhari/0001/text.txt') return reply('ghush result');
    return reply(undefined);
  });
  renderTopics();
  fireEvent.click(screen.getByText('সুদ'));
  await waitFor(() => expect(releaseSlow).toBeDefined());
  fireEvent.click(screen.getByText('ঘুষ'));
  expect(await screen.findByText('result')).toBeInTheDocument();

  await act(async () => {
    releaseSlow();
    await new Promise((resolve) => setTimeout(resolve, 20));
  });

  expect(screen.getByText('result')).toBeInTheDocument();
  expect(screen.queryByText(/লোড করা যায়নি/)).not.toBeInTheDocument();
});

describe('the address bar', () => {
  test('choosing a topic writes it to the address', async () => {
    servePaged('ঈমান', 1);
    renderTopics();
    fireEvent.click(screen.getByText('ঈমান'));
    await screen.findByText('t1');
    expect(where()).toHaveTextContent(/^\/topics\?topic=ঈমান$/);
  });

  test('opening a topic link shows that topic', async () => {
    servePaged('alphatopic', 2);
    renderTopics('/topics?topic=alphatopic');
    expect(await screen.findByText('t1')).toBeInTheDocument();
    expect(await screen.findByText('t2')).toBeInTheDocument();
  });

  test('shows the page named in the address', async () => {
    servePaged('bravotopic', 45);
    renderTopics('/topics?topic=bravotopic&page=2');
    expect(await screen.findByText('t21')).toBeInTheDocument();
    expect(screen.queryByText('t1')).not.toBeInTheDocument();
    expect(screen.queryByText('t41')).not.toBeInTheDocument();
  });

  test('next writes the page to the address and shows it', async () => {
    servePaged('charlietopic', 45);
    renderTopics('/topics?topic=charlietopic');
    await screen.findByText('t1');

    fireEvent.click(screen.getByText(/পরের পৃষ্ঠা/));

    expect(await screen.findByText('t21')).toBeInTheDocument();
    expect(where()).toHaveTextContent(/^\/topics\?topic=charlietopic&page=2$/);
  });

  test('a page number past the end shows the last page', async () => {
    servePaged('deltatopic', 45);
    renderTopics('/topics?topic=deltatopic&page=99');
    expect(await screen.findByText('t45')).toBeInTheDocument();
    expect(screen.queryByText('t40')).not.toBeInTheDocument();
  });
});
