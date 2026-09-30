import { render, screen } from '@testing-library/react';
import App from './App';
import getNum, { getBook } from './Helpers/EngToBng';

test('renders the navigation links', () => {
  render(<App />);
  expect(screen.getByText('সার্চ')).toBeInTheDocument();
  expect(screen.getByText('হাদীস বই')).toBeInTheDocument();
});

test('converts English digits to Bengali digits', () => {
  expect(getNum('124')).toBe('১২৪');
  expect(getNum('7053')).toBe('৭০৫৩');
});

test('maps a hadis tag to its book name', () => {
  expect(getBook('BUK-124')).toBe('বুখারি শরীফ - হাদীস নং ');
  expect(getBook('MAJ-1')).toBe('সুনানু ইবনে মাজাহ - হাদীস নং ');
});
