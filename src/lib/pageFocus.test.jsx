import { act, render, screen } from '@testing-library/react';
import { StrictMode, useRef } from 'react';
import { toTop } from './toTop';
import { usePageFocus } from './pageFocus';

function List({ page }) {
  const ref = useRef(null);
  usePageFocus(page, ref);
  return <ol ref={ref} tabIndex={-1} aria-label="results"><li>page {page}</li></ol>;
}

afterEach(() => vi.useRealTimers());

test('nothing is focused when the page first shows', () => {
  render(<StrictMode><List page={0} /></StrictMode>);
  expect(screen.getByRole('list')).not.toHaveFocus();
});

test('a change of page that a paging link asked for moves focus to the list', () => {
  const { rerender } = render(<List page={0} />);
  toTop();
  rerender(<List page={1} />);
  expect(screen.getByRole('list')).toHaveFocus();
});

test('a change nobody asked for (a new search, back and forward) leaves focus alone', () => {
  const { rerender } = render(<><input aria-label="box" /><List page={0} /></>);
  screen.getByLabelText('box').focus();
  rerender(<><input aria-label="box" /><List page={1} /></>);
  expect(screen.getByLabelText('box')).toHaveFocus();
});

test('one request moves focus once', () => {
  const { rerender } = render(<List page={0} />);
  toTop();
  rerender(<List page={1} />);
  screen.getByRole('list').blur();
  rerender(<List page={2} />);
  expect(screen.getByRole('list')).not.toHaveFocus();
});

test('a request that nothing answered does not move focus much later', () => {
  vi.useFakeTimers();
  const { rerender } = render(<List page={0} />);
  toTop();
  act(() => vi.advanceTimersByTime(10000));
  rerender(<List page={1} />);
  expect(screen.getByRole('list')).not.toHaveFocus();
});

test('focusing does not scroll the page again', () => {
  const { rerender } = render(<List page={0} />);
  const focus = vi.spyOn(HTMLElement.prototype, 'focus');
  toTop();
  rerender(<List page={1} />);
  expect(focus).toHaveBeenCalledWith({ preventScroll: true });
});
