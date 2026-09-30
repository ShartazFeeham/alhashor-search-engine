import { fireEvent, render, screen } from '@testing-library/react';
import { SettingsProvider } from '../settings/SettingsProvider';
import { getUrl, setUrl } from '../test/nextNavigation';
import Footer from './Footer';
import TabBar from './TabBar';
import TopNav from './TopNav';

const show = (ui) => render(<SettingsProvider>{ui}</SettingsProvider>);

test.each([
  ['/', 'হোম'],
  ['/search', 'সার্চ'],
  ['/books', 'হাদীস বই'],
  ['/topics', 'বিষয়ভিত্তিক হাদীস'],
])('on %s the top navigation marks %s as the current page', (path, label) => {
  setUrl(path);
  show(<TopNav />);
  expect(screen.getByRole('link', { name: label })).toHaveAttribute('aria-current', 'page');
  expect(screen.getAllByRole('link').filter((a) => a.getAttribute('aria-current') === 'page')).toHaveLength(1);
});

test('a hadis page keeps the books link current', () => {
  setUrl('/hadis/bukhari/124');
  show(<TopNav />);
  expect(screen.getByRole('link', { name: 'হাদীস বই' })).toHaveAttribute('aria-current', 'page');
});

test('a search with a query still marks search as current', () => {
  setUrl('/search?q=abc');
  show(<TopNav />);
  expect(screen.getByRole('link', { name: 'সার্চ' })).toHaveAttribute('aria-current', 'page');
});

test('the brand links home and a settings link exists', () => {
  show(<TopNav />);
  expect(screen.getByRole('link', { name: /BoiKotha/ })).toHaveAttribute('href', '/');
  expect(screen.getByRole('link', { name: 'পড়ার সেটিংস' })).toHaveAttribute('href', '/settings');
});

test('the tab bar has four links and a more button, and navigates without reloading', () => {
  show(<TabBar />);
  expect(screen.getAllByRole('link')).toHaveLength(4);
  expect(screen.getByRole('button', { name: 'আরও' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('link', { name: 'সার্চ' }));
  expect(getUrl().pathname).toBe('/search');
});

test('the tab bar marks the current page too', () => {
  setUrl('/topics');
  show(<TabBar />);
  expect(screen.getByRole('link', { name: 'বিষয়' })).toHaveAttribute('aria-current', 'page');
});

test('the tab bar "more" button opens and closes a menu with the settings link', () => {
  show(<TabBar />);
  const more = screen.getByRole('button', { name: 'আরও' });
  expect(more).toHaveAttribute('aria-expanded', 'false');
  expect(screen.queryByRole('link', { name: 'পড়ার সেটিংস' })).not.toBeInTheDocument();
  fireEvent.click(more);
  expect(more).toHaveAttribute('aria-expanded', 'true');
  expect(screen.getByRole('link', { name: 'পড়ার সেটিংস' })).toBeInTheDocument();
  fireEvent.click(more);
  expect(screen.queryByRole('link', { name: 'পড়ার সেটিংস' })).not.toBeInTheDocument();
});

test('the footer names the site, counts the hadis and links the main pages', () => {
  show(<Footer />);
  expect(screen.getByText(/৩২,৮৮৬/)).toBeInTheDocument();
  expect(screen.getByText('BoiKotha')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'বিষয়ভিত্তিক হাদীস' })).toHaveAttribute('href', '/topics');
});
