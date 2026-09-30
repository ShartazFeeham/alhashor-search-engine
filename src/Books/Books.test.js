import { render, screen, fireEvent } from '@testing-library/react';
import Books from './Books';

// Every hadis file "contains" its own URL, so a card shows which file it loaded.
beforeEach(() => {
  global.fetch = jest.fn((url) => Promise.resolve({ ok: true, json: () => Promise.resolve(url) }));
});

afterEach(() => {
  delete global.fetch;
});

const file = (folder, number) => `/json/hadis/${folder}/${String(number).padStart(4, '0')}/text.txt`;

test('asks you to choose a book before showing any hadis', () => {
  render(<Books />);
  expect(screen.getByText('নিচে থেকে যেকোনো একটি বই ক্লিক করুন')).toBeInTheDocument();
  expect(global.fetch).not.toHaveBeenCalled();
});

test.each([
  ['বুখারি শরীফ', 'Bukhari'],
  ['মুসলিম শরীফ', 'Muslim'],
  ['তিরমিজি শরীফ', 'Tirmiji'],
  ['আবু দাউদ শরীফ', 'Daud'],
  ['সুনানু ইবনে মাজাহ', 'Majah'],
  ['সুনানু নাসাঈ শরীফ', 'Nasae'],
])('the %s button opens that book', async (name, folder) => {
  render(<Books />);
  fireEvent.click(screen.getByText(name));
  expect(await screen.findByText(file(folder, 1))).toBeInTheDocument();
  // the button plus the page title
  expect(screen.getAllByText(name)).toHaveLength(2);
});

test('clicking the open book again stays on that book', async () => {
  render(<Books />);
  fireEvent.click(screen.getByText('মুসলিম শরীফ'));
  await screen.findByText(file('Muslim', 1));

  fireEvent.click(screen.getAllByText('মুসলিম শরীফ')[0]);

  expect(await screen.findByText(file('Muslim', 1))).toBeInTheDocument();
  expect(screen.queryByText(file('Bukhari', 1))).not.toBeInTheDocument();
});

test('next and previous move by one page of 20 hadis', async () => {
  render(<Books />);
  fireEvent.click(screen.getByText('বুখারি শরীফ'));
  await screen.findByText(file('Bukhari', 1));
  expect(screen.getByText('১-২০/৭০৫৩')).toBeInTheDocument();

  fireEvent.click(screen.getByText('Next »'));
  expect(await screen.findByText(file('Bukhari', 21))).toBeInTheDocument();
  expect(screen.queryByText(file('Bukhari', 1))).not.toBeInTheDocument();
  expect(screen.getByText('২১-৪০/৭০৫৩')).toBeInTheDocument();

  fireEvent.click(screen.getByText('« Prev'));
  expect(await screen.findByText(file('Bukhari', 1))).toBeInTheDocument();
});

test('previous does nothing on the first page', async () => {
  render(<Books />);
  fireEvent.click(screen.getByText('বুখারি শরীফ'));
  await screen.findByText(file('Bukhari', 1));

  fireEvent.click(screen.getByText('« Prev'));
  fireEvent.click(screen.getByText('-10'));

  expect(screen.getByText('১-২০/৭০৫৩')).toBeInTheDocument();
  expect(screen.getByText(file('Bukhari', 1))).toBeInTheDocument();
});

test('+10 jumps ten pages ahead', async () => {
  render(<Books />);
  fireEvent.click(screen.getByText('বুখারি শরীফ'));
  await screen.findByText(file('Bukhari', 1));

  fireEvent.click(screen.getByText('+10'));

  expect(await screen.findByText(file('Bukhari', 201))).toBeInTheDocument();
  expect(screen.getByText('২০১-২২০/৭০৫৩')).toBeInTheDocument();
});

test('paging stops at the last page and never goes past the last hadis', async () => {
  render(<Books />);
  fireEvent.click(screen.getByText('তিরমিজি শরীফ'));
  await screen.findByText(file('Tirmiji', 1));

  for (let i = 0; i < 20; i++) fireEvent.click(screen.getByText('+10'));

  expect(await screen.findByText(file('Tirmiji', 3601))).toBeInTheDocument();
  expect(screen.getByText('৩৬০১-৩৬০৮/৩৬০৮')).toBeInTheDocument();
  expect(screen.getByText(file('Tirmiji', 3608))).toBeInTheDocument();
  expect(screen.queryByText(file('Tirmiji', 3609))).not.toBeInTheDocument();

  fireEvent.click(screen.getByText('Next »'));
  expect(screen.getByText('৩৬০১-৩৬০৮/৩৬০৮')).toBeInTheDocument();
});
