import { fireEvent, render, screen } from '@testing-library/react';
import { SettingsProvider } from '../settings/SettingsProvider';
import { getUrl } from '../test/nextNavigation';
import Home from './Home';

const renderHome = () => render(<SettingsProvider><Home /></SettingsProvider>);

test('has a clear title and a search entry that opens the search page', () => {
  renderHome();
  expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('link', { name: /হাদীস খুঁজুন/ }));
  expect(getUrl().pathname).toBe('/search');
});

test('offers the three ways in, each a real link', () => {
  renderHome();
  fireEvent.click(screen.getByRole('link', { name: /বিষয়ভিত্তিক হাদীস/ }));
  expect(getUrl().pathname).toBe('/topics');
});

test('shows all six books on a bookshelf with their real hadis counts', () => {
  renderHome();
  for (const [name, count] of [['বুখারী', '৬,৭১৯'], ['মুসলিম', '৭,২৮১'], ['তিরমিযী', '৩,৬০৮'], ['আবু দাউদ', '৫,১৮৪'], ['ইবনে মাজাহ', '৪,৩৪১'], ['নাসাঈ', '৫,৭৫৩']]) {
    const spine = screen.getByRole('link', { name: new RegExp(name) });
    expect(spine).toHaveTextContent(count);
  }
});

test('a book on the shelf opens the books page', () => {
  renderHome();
  fireEvent.click(screen.getByRole('link', { name: /মুসলিম/ }));
  expect(getUrl().pathname).toBe('/books');
});

test('says more is coming', () => {
  renderHome();
  expect(screen.getByText(/শীঘ্রই আসছে/)).toBeInTheDocument();
});

test('sets the home page title', () => {
  renderHome();
  expect(document.title).toBe('BoiKotha - হাদীস সম্ভার');
});

test('counts switch to English digits when chosen', () => {
  localStorage.setItem('boikotha.settings', JSON.stringify({ digits: 'en' }));
  renderHome();
  expect(screen.getByRole('link', { name: /মুসলিম/ })).toHaveTextContent('7,281');
});
