import { render, screen, fireEvent } from '@testing-library/react';
import NextPrev from './NextPrev';

const tags = Array.from({ length: 45 }, (_, i) => `BUK-${i + 1}`);

test('renders without React warnings', () => {
  const errors = jest.spyOn(console, 'error').mockImplementation(() => {});
  render(<NextPrev page={0} setPage={() => {}} allResults={tags} setDisplayHadis={() => {}} resultCount={45} />);
  const messages = errors.mock.calls.map((call) => String(call[0]));
  errors.mockRestore();
  expect(messages).toEqual([]);
});

test('next shows the following 20 results and previous goes back', () => {
  const setPage = jest.fn();
  const setDisplayHadis = jest.fn();
  const { rerender } = render(
    <NextPrev page={0} setPage={setPage} allResults={tags} setDisplayHadis={setDisplayHadis} resultCount={45} />
  );
  fireEvent.click(screen.getByText(/পরের পৃষ্ঠা/));
  expect(setPage).toHaveBeenLastCalledWith(1);
  expect(setDisplayHadis).toHaveBeenLastCalledWith(tags.slice(20, 40));

  rerender(<NextPrev page={1} setPage={setPage} allResults={tags} setDisplayHadis={setDisplayHadis} resultCount={45} />);
  fireEvent.click(screen.getByText(/আগের পৃষ্ঠা/));
  expect(setPage).toHaveBeenLastCalledWith(0);
  expect(setDisplayHadis).toHaveBeenLastCalledWith(tags.slice(0, 20));
});

test('next does nothing on the last page', () => {
  const setPage = jest.fn();
  render(<NextPrev page={2} setPage={setPage} allResults={tags} setDisplayHadis={() => {}} resultCount={45} />);
  fireEvent.click(screen.getByText(/পরের পৃষ্ঠা/));
  expect(setPage).not.toHaveBeenCalled();
});
