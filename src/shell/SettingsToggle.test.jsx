import { act, fireEvent, render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { SettingsProvider } from '../settings/SettingsProvider';
import { getUrl, setUrl } from '../test/nextNavigation';
import { forgetReturn } from './settingsReturn';
import TopNav from './TopNav';

beforeEach(() => forgetReturn());

// The settings button of the top bar: a sliders icon (no "Aa" text) that links to /settings, and
// a cross while the settings page is open; the cross takes the reader back where they were.
const show = () => render(<SettingsProvider><TopNav /></SettingsProvider>);
const ui = readFileSync(path.resolve(process.cwd(), 'src/styles/ui.css'), 'utf8');

test('closed: a link with the sliders icon and no Aa text, named for the settings', () => {
  setUrl('/books');
  show();
  const link = screen.getByRole('link', { name: 'পড়ার সেটিংস' });
  expect(link).toHaveAttribute('href', '/settings');
  expect(link).toHaveClass('shell-iconbtn');
  expect(link).not.toHaveTextContent('Aa');
  expect(screen.getByTestId('icon-sliders')).toHaveAttribute('aria-hidden', 'true');
  expect(screen.queryByTestId('icon-x')).not.toBeInTheDocument();
});

test('open (on /settings): a button with the cross icon, the close label and the same class', () => {
  setUrl('/settings');
  show();
  expect(screen.queryByRole('link', { name: 'পড়ার সেটিংস' })).not.toBeInTheDocument();
  const button = screen.getByRole('button', { name: 'সেটিংস বন্ধ করুন' });
  expect(button).toHaveClass('shell-iconbtn');
  expect(button).toHaveAttribute('aria-expanded', 'true');
  expect(screen.getByTestId('icon-x')).toHaveAttribute('aria-hidden', 'true');
  expect(screen.queryByTestId('icon-sliders')).not.toBeInTheDocument();
});

test('the icon swaps when the visitor opens the settings from another page', () => {
  setUrl('/topics');
  show();
  expect(screen.getByTestId('icon-sliders')).toBeInTheDocument();
  act(() => setUrl('/settings'));
  expect(screen.getByTestId('icon-x')).toBeInTheDocument();
});

test('the cross goes back to the page the reader came from, in the same route', () => {
  setUrl('/narrators?name=abu-hurayrah&page=2');
  show();
  fireEvent.click(screen.getByRole('link', { name: 'পড়ার সেটিংস' }));
  act(() => setUrl('/settings'));
  fireEvent.click(screen.getByRole('button', { name: 'সেটিংস বন্ধ করুন' }));
  expect(getUrl().pathname + getUrl().search).toBe('/narrators?name=abu-hurayrah&page=2');
  expect(screen.getByRole('link', { name: 'পড়ার সেটিংস' })).toHaveFocus();
});

test('Escape closes the settings the same way', () => {
  setUrl('/books');
  show();
  fireEvent.click(screen.getByRole('link', { name: 'পড়ার সেটিংস' }));
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(getUrl().pathname).toBe('/books');
});

test('opened directly (no page before it, nothing stored) the cross goes home', () => {
  setUrl('/settings');
  show();
  fireEvent.click(screen.getByRole('button', { name: 'সেটিংস বন্ধ করুন' }));
  expect(getUrl().pathname).toBe('/');
});

test('opened directly after a reload, the stored page before it is the way back', () => {
  window.sessionStorage.setItem('settings-from', '/topics?page=3');
  setUrl('/settings');
  show();
  fireEvent.click(screen.getByRole('button', { name: 'সেটিংস বন্ধ করুন' }));
  expect(getUrl().pathname + getUrl().search).toBe('/topics?page=3');
});

test('the icon and the cross share one 44px box and a 20px icon, so nothing shifts when they swap', () => {
  setUrl('/settings');
  show();
  const cross = screen.getByTestId('icon-x');
  const sliders = (() => { act(() => setUrl('/books')); return screen.getByTestId('icon-sliders'); })();
  expect(cross.getAttribute('width')).toBe(sliders.getAttribute('width'));
  expect(cross.getAttribute('height')).toBe(sliders.getAttribute('height'));
  expect(ui).toMatch(/\.shell-iconbtn\{[^}]*width:44px;height:44px/);
  expect(ui).toMatch(/button\.shell-iconbtn\{[^}]*border:0/);
});

test('the sliders icon is stroked with currentColor (visible in every theme)', () => {
  show();
  expect(screen.getByTestId('icon-sliders')).toHaveAttribute('stroke', 'currentColor');
});
