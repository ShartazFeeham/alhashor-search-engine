import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import Topics from './Topics';

const prefix = (word) => word.substring(0, 2);
const NO_HADIS = /এই বিষয়ে কোনো হাদীস পাওয়া যায়নি/;

function reply(body) {
  return Promise.resolve({ ok: body !== undefined, json: () => Promise.resolve(body) });
}

afterEach(() => {
  delete global.fetch;
});

test('shows the hadis for the chosen topic', async () => {
  global.fetch = jest.fn((url) => {
    if (url === `/json/tags/${prefix('ঈমান')}.json`) return reply({ ঈমান: ['BUK-1'] });
    if (url === '/json/hadis/Bukhari/0001/text.txt') return reply('imaan hadis text');
    return reply(undefined);
  });
  render(<Topics />);
  fireEvent.click(screen.getByText('ঈমান'));
  expect(await screen.findByText('imaan')).toBeInTheDocument();
});

test('a topic of several words shows only hadis that contain all of them', async () => {
  global.fetch = jest.fn((url) => {
    if (url === `/json/tags/${prefix('জ্ঞান')}.json`) return reply({ জ্ঞান: ['BUK-1', 'BUK-2'] });
    if (url === `/json/tags/${prefix('অর্জন')}.json`) return reply({ অর্জন: ['BUK-2'] });
    if (url === '/json/hadis/Bukhari/0001/text.txt') return reply('only-first');
    if (url === '/json/hadis/Bukhari/0002/text.txt') return reply('both-words');
    return reply(undefined);
  });
  render(<Topics />);
  fireEvent.click(screen.getByText('জ্ঞান অর্জন'));
  expect(await screen.findByText('both-words')).toBeInTheDocument();
  expect(screen.queryByText('only-first')).not.toBeInTheDocument();
});

test('a topic with no hadis says so instead of loading forever', async () => {
  global.fetch = jest.fn(() => reply(undefined));
  render(<Topics />);
  fireEvent.click(screen.getByText('কৃপণতা'));
  expect(await screen.findByText(NO_HADIS)).toBeInTheDocument();
  expect(screen.queryByAltText('loading...')).not.toBeInTheDocument();
});

test('a slow earlier topic cannot overwrite the topic chosen after it', async () => {
  let releaseSlow;
  global.fetch = jest.fn((url) => {
    if (url === `/json/tags/${prefix('সুদ')}.json`) {
      return new Promise((resolve) => {
        releaseSlow = () => resolve({ ok: true, json: () => Promise.resolve({ সুদ: ['BUK-7'] }) });
      });
    }
    if (url === `/json/tags/${prefix('ঘুষ')}.json`) return reply({ ঘুষ: ['BUK-1'] });
    if (url === '/json/hadis/Bukhari/0001/text.txt') return reply('ghush result');
    return reply(undefined);
  });
  render(<Topics />);
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
