import { render, screen } from '@testing-library/react';
import { SettingsProvider } from '../settings/SettingsProvider';
import { useDigits } from './useDigits';

function Probe() {
  const d = useDigits();
  return <span data-testid="out">{d(6628)}</span>;
}

test('uses Bengali digits by default', () => {
  render(<SettingsProvider><Probe /></SettingsProvider>);
  expect(screen.getByTestId('out')).toHaveTextContent('৬,৬২৮');
});

test('uses English digits when the visitor chose them', () => {
  localStorage.setItem('boikotha.settings', JSON.stringify({ digits: 'en' }));
  render(<SettingsProvider><Probe /></SettingsProvider>);
  expect(screen.getByTestId('out')).toHaveTextContent('6,628');
});
