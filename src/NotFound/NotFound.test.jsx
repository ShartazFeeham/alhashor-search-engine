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
