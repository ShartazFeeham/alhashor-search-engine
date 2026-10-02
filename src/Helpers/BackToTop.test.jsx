import { act, fireEvent, render, screen } from '@testing-library/react';
import BackToTop from './BackToTop';

const NAME = 'উপরে যান';
const scrollTo = (y) =>
  act(() => {
    window.scrollY = y;
    window.dispatchEvent(new Event('scroll'));
  });

afterEach(() => {
  window.scrollY = 0;
});

test('is a real, labelled (Bengali) button', () => {
  render(<BackToTop />);
  const button = screen.getByLabelText(NAME);
  expect(button.tagName).toBe('BUTTON');
  expect(button).toHaveAttribute('type', 'button');
});

test('scrolls to the top on click (Enter and Space click a real button by themselves)', () => {
  render(<BackToTop />);
  scrollTo(600);
  document.documentElement.scrollTop = 500;
  fireEvent.click(screen.getByRole('button', { name: NAME }));
  expect(document.documentElement.scrollTop).toBe(0);
});

test('while hidden it is out of the tab order and the accessibility tree', () => {
  render(<BackToTop />);
  expect(screen.queryByRole('button', { name: NAME })).not.toBeInTheDocument();
  const button = screen.getByLabelText(NAME);
  expect(button).toHaveAttribute('aria-hidden', 'true');
  expect(button).toHaveAttribute('tabindex', '-1');
});

test('appears only after the page has been scrolled down', () => {
  render(<BackToTop />);
  const button = screen.getByLabelText(NAME);
  expect(button.className).not.toContain('show');
  scrollTo(600);
  expect(button.className).toContain('show');
  expect(button).not.toHaveAttribute('aria-hidden');
  expect(button).toHaveAttribute('tabindex', '0');
  scrollTo(0);
  expect(button.className).not.toContain('show');
});
