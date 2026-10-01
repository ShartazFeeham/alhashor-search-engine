import { render, screen, within } from '@testing-library/react';
import { SettingsProvider } from '../settings/SettingsProvider';
import BooksIndex from './BooksIndex';

const show = () => render(<SettingsProvider><BooksIndex /></SettingsProvider>);

test('is titled as the books page', () => {
  show();
  expect(document.title).toBe('হাদীসের বই - BoiKotha');
  expect(screen.getByRole('heading', { level: 1, name: 'হাদীসের বই' })).toBeInTheDocument();
});

test.each([
  ['বুখারী শরীফ', 'bukhari', '৬,৭১৯'],
  ['মুসলিম শরীফ', 'muslim', '৭,২৮১'],
  ['তিরমিযী শরীফ', 'tirmidhi', '৩,৬০৮'],
  ['আবু দাউদ শরীফ', 'abudawud', '৫,১৮৪'],
  ['ইবনে মাজাহ শরীফ', 'ibnmajah', '৪,৩৪১'],
  ['নাসাঈ শরীফ', 'nasai', '৫,৭৫৩'],
])('%s opens its page and shows its real hadis count', (name, slug, count) => {
  show();
  const card = screen.getByRole('link', { name: new RegExp(name) });
  expect(card).toHaveAttribute('href', `/books/${slug}`);
  expect(within(card).getByText(new RegExp(count))).toBeInTheDocument();
});

test('shows the six books and nothing else to open', () => {
  show();
  const cards = screen.getAllByRole('link').filter((link) => link.getAttribute('href').startsWith('/books/'));
  expect(cards).toHaveLength(6);
});
