/* These tests check the attribute the provider sets on the <html> element itself, which Testing
   Library has no query for. */
/* eslint-disable testing-library/no-node-access */
import { act, render, screen } from '@testing-library/react';
import { SettingsProvider, useSettings } from './SettingsProvider';

function Probe() {
  const { settings, update, reset } = useSettings();
  return (
    <div>
      <span data-testid="theme">{settings.theme}</span>
      <button onClick={() => update({ theme: 'dark' })}>dark</button>
      <button onClick={reset}>reset</button>
    </div>
  );
}

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
});

test('starts from the saved settings and applies them to the page', () => {
  localStorage.setItem('boikotha.settings', JSON.stringify({ theme: 'sepia' }));
  render(<SettingsProvider><Probe /></SettingsProvider>);
  expect(screen.getByTestId('theme')).toHaveTextContent('sepia');
  expect(document.documentElement.getAttribute('data-theme')).toBe('sepia');
});

test('an update is applied, saved and shared with every reader', () => {
  render(<SettingsProvider><Probe /></SettingsProvider>);
  act(() => screen.getByText('dark').click());
  expect(screen.getByTestId('theme')).toHaveTextContent('dark');
  expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  expect(JSON.parse(localStorage.getItem('boikotha.settings')).theme).toBe('dark');
});

test('reset goes back to the defaults', () => {
  render(<SettingsProvider><Probe /></SettingsProvider>);
  act(() => screen.getByText('dark').click());
  act(() => screen.getByText('reset').click());
  expect(screen.getByTestId('theme')).toHaveTextContent('auto');
  expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
});

test('the inline theme script applies a saved theme before first paint (Review Focus 5)', async () => {
  const { themeScript } = await import('./themeScript');
  localStorage.setItem('boikotha.settings', JSON.stringify({ theme: 'dark' }));
  new Function(themeScript)();
  expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
});

test('useSettings outside the provider explains the mistake', () => {
  const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
  expect(() => render(<Probe />)).toThrow(/inside SettingsProvider/);
  errors.mockRestore();
});

test('the first render uses the defaults, so the server and the browser agree (hydration)', () => {
  localStorage.setItem('boikotha.settings', JSON.stringify({ digits: 'en' }));
  const seen = [];
  function Spy() {
    seen.push(useSettings().settings.digits);
    return null;
  }
  render(<SettingsProvider><Spy /></SettingsProvider>);
  expect(seen[0]).toBe('bn');
  expect(seen[seen.length - 1]).toBe('en');
});
