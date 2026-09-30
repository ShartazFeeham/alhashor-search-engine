import { fireEvent, render, screen } from '@testing-library/react';
import BackToTop from './BackToTop';

test('is a labelled button', () => {
  render(<BackToTop />);
  expect(screen.getByRole('button', { name: 'Back to top' })).toBeInTheDocument();
});

test('scrolls to the top on click and on Enter', () => {
  render(<BackToTop />);
  const button = screen.getByRole('button', { name: 'Back to top' });

  document.documentElement.scrollTop = 500;
  fireEvent.click(button);
  expect(document.documentElement.scrollTop).toBe(0);

  document.documentElement.scrollTop = 500;
  fireEvent.keyDown(button, { key: 'Enter' });
  expect(document.documentElement.scrollTop).toBe(0);
});
