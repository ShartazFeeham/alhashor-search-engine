import { fireEvent, render, screen } from '@testing-library/react';
import { SettingsProvider } from './SettingsProvider';
import SettingsPage from './SettingsPage';

const show = () => render(<SettingsProvider><SettingsPage /></SettingsProvider>);

beforeEach(() => {
  document.documentElement.removeAttribute('data-theme');
  document.documentElement.style.removeProperty('--rs');
});

test('is titled and lists the four themes, with auto pressed at first', () => {
  show();
  expect(document.title).toBe('পড়ার সেটিংস - BoiKotha');
  expect(screen.getByRole('button', { name: 'স্বয়ংক্রিয়' })).toHaveAttribute('aria-pressed', 'true');
  for (const name of ['হালকা', 'গাঢ়', 'সেপিয়া']) {
    expect(screen.getByRole('button', { name })).toHaveAttribute('aria-pressed', 'false');
  }
});

test('choosing a theme applies and saves it', () => {
  show();
  fireEvent.click(screen.getByRole('button', { name: 'গাঢ়' }));
  expect(screen.getByRole('button', { name: 'গাঢ়' })).toHaveAttribute('aria-pressed', 'true');
  expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  expect(JSON.parse(localStorage.getItem('boikotha.settings')).theme).toBe('dark');
});

test('the text size steps up and down within its limits', () => {
  show();
  fireEvent.click(screen.getByRole('button', { name: 'লেখা বড় করুন' }));
  expect(document.documentElement.style.getPropertyValue('--rs')).toBe('20px');
  fireEvent.click(screen.getByRole('button', { name: 'লেখা ছোট করুন' }));
  fireEvent.click(screen.getByRole('button', { name: 'লেখা ছোট করুন' }));
  expect(document.documentElement.style.getPropertyValue('--rs')).toBe('16px');
  for (let i = 0; i < 20; i++) fireEvent.click(screen.getByRole('button', { name: 'লেখা ছোট করুন' }));
  expect(document.documentElement.style.getPropertyValue('--rs')).toBe('14px');
});

test('the digit style can be switched and shows in the page', () => {
  show();
  expect(screen.getByText(/১৮/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'English' }));
  expect(screen.getByText(/18/)).toBeInTheDocument();
  expect(JSON.parse(localStorage.getItem('boikotha.settings')).digits).toBe('en');
});

test('the preview uses the real reading text', () => {
  show();
  expect(screen.getByText(/ইয়াহুদী ও নাসারাদের প্রতি আল্লাহর অভিশাপ/)).toBeInTheDocument();
});

test('reset goes back to the defaults', () => {
  show();
  fireEvent.click(screen.getByRole('button', { name: 'গাঢ়' }));
  fireEvent.click(screen.getByRole('button', { name: 'লেখা বড় করুন' }));
  fireEvent.click(screen.getByRole('button', { name: 'আগের মতো করুন' }));
  expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
  expect(document.documentElement.style.getPropertyValue('--rs')).toBe('18px');
});
