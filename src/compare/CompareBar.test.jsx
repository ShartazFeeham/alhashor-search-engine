import { fireEvent, render, screen } from '@testing-library/react';
import { SettingsProvider } from '../settings/SettingsProvider';
import { setUrl } from '../test/nextNavigation';
import { ToastProvider } from '../ui/Toast';
import CompareBar from './CompareBar';
import { CompareProvider, useCompare } from './CompareProvider';

function Chooser() {
  const { toggle } = useCompare();
  return (
    <>
      <button onClick={() => toggle('bukhari-1')}>choose bukhari-1</button>
      <button onClick={() => toggle('muslim-5')}>choose muslim-5</button>
    </>
  );
}

const show = () =>
  render(
    <SettingsProvider>
      <ToastProvider>
        <CompareProvider>
          <Chooser />
          <CompareBar />
        </CompareProvider>
      </ToastProvider>
    </SettingsProvider>
  );
const choose = (name) => fireEvent.click(screen.getByRole('button', { name }));

beforeEach(() => {
  sessionStorage.clear();
});

test('nothing is shown until a hadis is chosen', () => {
  show();
  expect(screen.queryByRole('link', { name: /তুলনা/ })).not.toBeInTheDocument();
  expect(screen.queryByRole('region', { name: 'তুলনার তালিকা' })).not.toBeInTheDocument();
});

test('with a choice it links to the compare page with the ids and counts them', () => {
  show();
  choose('choose bukhari-1');
  expect(screen.getByRole('region', { name: 'তুলনার তালিকা' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'তুলনা (১)' })).toHaveAttribute('href', '/compare?ids=bukhari-1');
  choose('choose muslim-5');
  expect(screen.getByRole('link', { name: 'তুলনা (২)' })).toHaveAttribute('href', '/compare?ids=bukhari-1,muslim-5');
});

test('the clear button empties the list and the bar goes away', () => {
  show();
  choose('choose bukhari-1');
  fireEvent.click(screen.getByRole('button', { name: 'তুলনার তালিকা খালি করুন' }));
  expect(screen.queryByRole('region', { name: 'তুলনার তালিকা' })).not.toBeInTheDocument();
});

test('it is not shown on the compare page itself', () => {
  setUrl('/compare?ids=bukhari-1,muslim-5');
  show();
  choose('choose bukhari-1');
  expect(screen.queryByRole('region', { name: 'তুলনার তালিকা' })).not.toBeInTheDocument();
});

test('it comes back from the saved choice after a reload', () => {
  sessionStorage.setItem('alhashor.compare', 'muslim-5,bukhari-1');
  show();
  expect(screen.getByRole('link', { name: 'তুলনা (২)' })).toHaveAttribute('href', '/compare?ids=muslim-5,bukhari-1');
});

describe('room kept for the bar', () => {
  afterEach(() => document.body.classList.remove('has-cmp-bar'));

  test('the body has no has-cmp-bar class until a hadis is chosen', () => {
    show();
    expect(document.body).not.toHaveClass('has-cmp-bar');
  });

  test('the class is on while the bar shows and off after clearing', () => {
    show();
    choose('choose bukhari-1');
    expect(document.body).toHaveClass('has-cmp-bar');
    fireEvent.click(screen.getByRole('button', { name: 'তুলনার তালিকা খালি করুন' }));
    expect(document.body).not.toHaveClass('has-cmp-bar');
  });

  test('there is no class on the compare page (the bar is hidden there)', () => {
    setUrl('/compare?ids=bukhari-1');
    show();
    choose('choose bukhari-1');
    expect(document.body).not.toHaveClass('has-cmp-bar');
  });

  test('the class is removed when the bar unmounts', () => {
    const { unmount } = show();
    choose('choose bukhari-1');
    expect(document.body).toHaveClass('has-cmp-bar');
    unmount();
    expect(document.body).not.toHaveClass('has-cmp-bar');
  });
});
