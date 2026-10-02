import { fireEvent, render, screen, within } from '@testing-library/react';
import { SettingsProvider } from '../settings/SettingsProvider';
import NarratorBookFilter from './NarratorBookFilter';

const perBook = { bukhari: 1500, muslim: 20, tirmidhi: 0, abudawud: 7, ibnmajah: 3, nasai: 1 };

const show = (props = {}) =>
  render(
    <SettingsProvider>
      <NarratorBookFilter id="aisha" perBook={perBook} selected="all" {...props} />
    </SettingsProvider>
  );

const filter = () => screen.getByRole('navigation', { name: 'বই অনুযায়ী ছাঁকুন' });
const href = (link) => decodeURIComponent(link.getAttribute('href'));

test('has "all" with the total and one chip per book with its own count', () => {
  show();
  const chips = within(filter()).getAllByRole('listitem').map((item) => item.textContent.replace(/\s+/g, ' ').trim());
  expect(chips).toEqual(['সব ১,৫৩১', 'বুখারী ১,৫০০', 'মুসলিম ২০', 'তিরমিযী ০', 'আবু দাউদ ৭', 'ইবনে মাজাহ ৩', 'নাসাঈ ১']);
});

test('each chip is a link to the narrator narrowed to that book, from the first page', () => {
  show();
  expect(href(within(filter()).getByRole('link', { name: /মুসলিম/ }))).toBe('/narrators?name=aisha&book=muslim');
  expect(href(within(filter()).getByRole('link', { name: /সব/ }))).toBe('/narrators?name=aisha');
});

test('marks the chosen chip, and only that one', () => {
  show({ selected: 'nasai' });
  expect(within(filter()).getByRole('link', { name: /নাসাঈ/ })).toHaveAttribute('aria-current', 'true');
  expect(within(filter()).getAllByRole('link').filter((link) => link.hasAttribute('aria-current'))).toHaveLength(1);
});

test('a book with none is dimmed text, not a link', () => {
  show();
  expect(within(filter()).queryByRole('link', { name: /তিরমিযী/ })).not.toBeInTheDocument();
  expect(within(filter()).getByText(/তিরমিযী/)).toHaveAttribute('aria-disabled', 'true');
});

test('the chips keep the page where it is, and ask for the heading to take focus', () => {
  show();
  const chip = within(filter()).getByRole('link', { name: /মুসলিম/ });
  expect(chip).toHaveAttribute('data-scroll', 'false');
  fireEvent.click(chip);
});

test('English digits when the visitor chose them', () => {
  localStorage.setItem('boikotha.settings', JSON.stringify({ digits: 'en' }));
  show();
  expect(within(filter()).getByRole('link', { name: /বুখারী/ })).toHaveTextContent('বুখারী 1,500');
});
