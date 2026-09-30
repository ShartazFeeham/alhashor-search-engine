import { act, fireEvent, render, screen } from '@testing-library/react';
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

test('appears only after the page has been scrolled down', () => {
  render(<BackToTop />);
  const button = screen.getByRole('button', { name: 'Back to top' });
  expect(button.className).not.toContain('show');
  act(() => {
    window.scrollY = 600;
    window.dispatchEvent(new Event('scroll'));
  });
  expect(button.className).toContain('show');
  act(() => {
    window.scrollY = 0;
    window.dispatchEvent(new Event('scroll'));
  });
  expect(button.className).not.toContain('show');
});
