import { fireEvent, render, screen } from '@testing-library/react';
import { SettingsProvider } from '../settings/SettingsProvider';
import { getUrl } from '../test/nextNavigation';
import PrevNext from './PrevNext';

const show = (ui) => render(<SettingsProvider>{ui}</SettingsProvider>);

test('links to the neighbouring hadis of the same book, skipping gaps', () => {
  show(<PrevNext bookId="bukhari" number={64} />);
  expect(screen.getByRole('link', { name: /আগের/ })).toHaveAttribute('href', '/hadis/bukhari/62');
  expect(screen.getByRole('link', { name: /পরের/ })).toHaveAttribute('href', '/hadis/bukhari/65');
});

test('the first hadis has no previous link and the last has no next link', () => {
  const { unmount } = show(<PrevNext bookId="muslim" number={1} />);
  expect(screen.queryByRole('link', { name: /আগের/ })).not.toBeInTheDocument();
  unmount();
  show(<PrevNext bookId="muslim" number={7281} />);
  expect(screen.queryByRole('link', { name: /পরের/ })).not.toBeInTheDocument();
});

test('the arrow keys move to the previous and next hadis', () => {
  show(<PrevNext bookId="bukhari" number={10} />);
  fireEvent.keyDown(window, { key: 'ArrowRight' });
  expect(getUrl().pathname).toBe('/hadis/bukhari/11');
  fireEvent.keyDown(window, { key: 'ArrowLeft' });
  expect(getUrl().pathname).toBe('/hadis/bukhari/9');
});

test('arrow keys are ignored while typing in a field', () => {
  show(
    <div>
      <input aria-label="box" />
      <PrevNext bookId="bukhari" number={10} />
    </div>
  );
  fireEvent.keyDown(screen.getByLabelText('box'), { key: 'ArrowRight' });
  expect(getUrl().pathname).toBe('/');
});

test('a horizontal swipe on the article area moves between hadis', () => {
  show(<PrevNext bookId="bukhari" number={10} swipeTarget="page" />);
  const area = document.body;
  fireEvent.touchStart(area, { touches: [{ clientX: 300, clientY: 200 }] });
  fireEvent.touchEnd(area, { changedTouches: [{ clientX: 120, clientY: 210 }] });
  expect(getUrl().pathname).toBe('/hadis/bukhari/11');
});

test('a mostly vertical swipe (scrolling) does nothing', () => {
  show(<PrevNext bookId="bukhari" number={10} swipeTarget="page" />);
  fireEvent.touchStart(document.body, { touches: [{ clientX: 200, clientY: 100 }] });
  fireEvent.touchEnd(document.body, { changedTouches: [{ clientX: 150, clientY: 400 }] });
  expect(getUrl().pathname).toBe('/');
});

test('a pinch (two fingers) never changes the hadis', () => {
  show(<PrevNext bookId="bukhari" number={10} swipeTarget="page" />);
  fireEvent.touchStart(document.body, { touches: [{ clientX: 150, clientY: 200 }] });
  fireEvent.touchStart(document.body, { touches: [{ clientX: 150, clientY: 200 }, { clientX: 250, clientY: 200 }] });
  fireEvent.touchEnd(document.body, { changedTouches: [{ clientX: 330, clientY: 205 }] });
  expect(getUrl().pathname).toBe('/');
});

test('a cancelled touch does not leave a swipe half-started', () => {
  show(<PrevNext bookId="bukhari" number={10} swipeTarget="page" />);
  fireEvent.touchStart(document.body, { touches: [{ clientX: 300, clientY: 200 }] });
  fireEvent.touchCancel(document.body);
  fireEvent.touchEnd(document.body, { changedTouches: [{ clientX: 100, clientY: 200 }] });
  expect(getUrl().pathname).toBe('/');
});

test('a swipe while zoomed in (panning the page) does nothing', () => {
  Object.defineProperty(window, 'visualViewport', { configurable: true, value: { scale: 2 } });
  try {
    show(<PrevNext bookId="bukhari" number={10} swipeTarget="page" />);
    fireEvent.touchStart(document.body, { touches: [{ clientX: 300, clientY: 200 }] });
    fireEvent.touchEnd(document.body, { changedTouches: [{ clientX: 100, clientY: 200 }] });
    expect(getUrl().pathname).toBe('/');
  } finally {
    delete window.visualViewport;
  }
});
