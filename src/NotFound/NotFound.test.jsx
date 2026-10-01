import { render, screen } from '@testing-library/react';
import NotFound from './NotFound';

test('says the page was not found and links home', () => {
  render(<NotFound />);
  expect(screen.getByText('পৃষ্ঠাটি পাওয়া যায়নি')).toBeInTheDocument();
  expect(screen.getByText('হোম পেজে ফিরে যান').getAttribute('href')).toBe('/');
});

test('sets its own page title', () => {
  render(<NotFound />);
  expect(document.title).toBe('পৃষ্ঠাটি পাওয়া যায়নি - BoiKotha');
});

test('is a page of its own: a main area with a heading and a button-styled link home', () => {
  render(<NotFound />);
  expect(screen.getByRole('main')).toBeInTheDocument();
  expect(screen.getByRole('heading', { level: 1, name: 'পৃষ্ঠাটি পাওয়া যায়নি' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'হোম পেজে ফিরে যান' })).toHaveClass('ui-btn', 'primary');
});

test('does not use Bootstrap classes', () => {
  render(<NotFound />);
  const parts = [screen.getByRole('main'), screen.getByRole('heading'), screen.getByRole('link')];
  for (const part of parts) expect(part.className).not.toMatch(/\b(container|text-center|mt-\d)\b/);
});
