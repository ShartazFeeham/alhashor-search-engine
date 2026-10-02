import { fireEvent, render, screen, within } from '@testing-library/react';
import { SettingsProvider } from '../settings/SettingsProvider';
import NarratorPager from './NarratorPager';

const show = (props) =>
  render(
    <SettingsProvider>
      <NarratorPager id="abu-hurayrah" book="all" {...props} />
    </SettingsProvider>
  );

const pager = () => screen.getByRole('navigation', { name: 'পাতা' });
const href = (link) => decodeURIComponent(link.getAttribute('href'));

test('links to the neighbouring pages, numbered from 1 in the address', () => {
  show({ page: 2, lastPage: 5 });
  expect(href(within(pager()).getByRole('link', { name: /আগের/ }))).toBe('/narrators?name=abu-hurayrah&page=2');
  expect(href(within(pager()).getByRole('link', { name: /পরের/ }))).toBe('/narrators?name=abu-hurayrah&page=4');
});

test('the first page has no "page" in its address', () => {
  show({ page: 1, lastPage: 5 });
  expect(href(within(pager()).getByRole('link', { name: /আগের/ }))).toBe('/narrators?name=abu-hurayrah');
});

test('keeps the chosen book in both links', () => {
  show({ page: 2, lastPage: 5, book: 'muslim' });
  expect(href(within(pager()).getByRole('link', { name: /আগের/ }))).toBe('/narrators?name=abu-hurayrah&page=2&book=muslim');
  expect(href(within(pager()).getByRole('link', { name: /পরের/ }))).toBe('/narrators?name=abu-hurayrah&page=4&book=muslim');
});

test('shows "page n / m" in the visitor\'s digits', () => {
  show({ page: 2, lastPage: 5 });
  expect(pager()).toHaveTextContent('পাতা ৩ / ৬');
});

test('shows English digits when the visitor chose them', () => {
  localStorage.setItem('boikotha.settings', JSON.stringify({ digits: 'en' }));
  show({ page: 2, lastPage: 5 });
  expect(pager()).toHaveTextContent('পাতা 3 / 6');
});

test('on the first page "আগের" is dimmed and cannot be followed', () => {
  show({ page: 0, lastPage: 5 });
  expect(within(pager()).queryByRole('link', { name: /আগের/ })).not.toBeInTheDocument();
  expect(within(pager()).getByText(/আগের/)).toHaveAttribute('aria-disabled', 'true');
  expect(within(pager()).queryByRole('button')).not.toBeInTheDocument();
  expect(within(pager()).getByRole('link', { name: /পরের/ })).toBeInTheDocument();
});

test('on the last page "পরের" is dimmed and cannot be followed', () => {
  show({ page: 5, lastPage: 5 });
  expect(within(pager()).queryByRole('link', { name: /পরের/ })).not.toBeInTheDocument();
  expect(within(pager()).getByText(/পরের/)).toHaveAttribute('aria-disabled', 'true');
});

test('leaves scrolling to the page, and goes to the top by itself', () => {
  show({ page: 1, lastPage: 5 });
  const next = within(pager()).getByRole('link', { name: /পরের/ });
  expect(next).toHaveAttribute('data-scroll', 'false');
  document.documentElement.scrollTop = 500;
  fireEvent.click(next);
  expect(document.documentElement.scrollTop).toBe(0);
});
