import { render, screen, fireEvent } from '@testing-library/react';
import NextPrev from './NextPrev';

test('renders without React warnings', () => {
  const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
  render(<NextPrev page={0} setPage={() => {}} resultCount={45} />);
  const messages = errors.mock.calls.map((call) => String(call[0]));
  errors.mockRestore();
  expect(messages).toEqual([]);
});

test('next asks for the following page and previous for the one before', () => {
  const setPage = vi.fn();
  const { rerender } = render(<NextPrev page={0} setPage={setPage} resultCount={45} />);
  fireEvent.click(screen.getByText(/পরের পৃষ্ঠা/));
  expect(setPage).toHaveBeenLastCalledWith(1);

  rerender(<NextPrev page={1} setPage={setPage} resultCount={45} />);
  fireEvent.click(screen.getByText(/আগের পৃষ্ঠা/));
  expect(setPage).toHaveBeenLastCalledWith(0);
});

test('next does nothing on the last page', () => {
  const setPage = vi.fn();
  render(<NextPrev page={2} setPage={setPage} resultCount={45} />);
  fireEvent.click(screen.getByText(/পরের পৃষ্ঠা/));
  expect(setPage).not.toHaveBeenCalled();
});

test('previous does nothing on the first page', () => {
  const setPage = vi.fn();
  render(<NextPrev page={0} setPage={setPage} resultCount={45} />);
  fireEvent.click(screen.getByText(/আগের পৃষ্ঠা/));
  expect(setPage).not.toHaveBeenCalled();
});
