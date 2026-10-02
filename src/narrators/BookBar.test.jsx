import { render, screen } from '@testing-library/react';
import BookBar from './BookBar';

const none = { bukhari: 0, muslim: 0, tirmidhi: 0, abudawud: 0, ibnmajah: 0, nasai: 0 };
const segments = (bar) => bar.innerHTML.match(/<i /g) ?? [];

test('has a segment for each book that has hadis, and none for a book without', () => {
  render(<BookBar perBook={{ ...none, bukhari: 30, nasai: 10 }} />);
  expect(segments(screen.getByTestId('narrator-bar'))).toHaveLength(2);
});

test('the segments are as wide as the counts and use the books\' own colours', () => {
  render(<BookBar perBook={{ ...none, bukhari: 30, nasai: 10 }} />);
  const html = screen.getByTestId('narrator-bar').innerHTML;
  expect(html).toContain('flex-grow: 30');
  expect(html).toContain('flex-grow: 10');
  expect(html).toContain('var(--bk-bukhari)');
  expect(html).toContain('var(--bk-nasai)');
});

test('is decoration only: screen readers skip it', () => {
  render(<BookBar perBook={{ ...none, muslim: 5 }} />);
  expect(screen.getByTestId('narrator-bar')).toHaveAttribute('aria-hidden', 'true');
});
