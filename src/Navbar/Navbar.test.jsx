import { fireEvent, render, screen } from '@testing-library/react';
import { getUrl } from '../test/nextNavigation';
import NavBar from './Navbar';

test('shows the four main links', () => {
  render(<NavBar />);
  expect(screen.getByText('হোম')).toBeInTheDocument();
  expect(screen.getByText('সার্চ')).toBeInTheDocument();
  expect(screen.getByText('হাদীস বই')).toBeInTheDocument();
  expect(screen.getByText('বিষয়ভিত্তিক হাদীস')).toBeInTheDocument();
});

test.each([
  ['সার্চ', '/search'],
  ['হাদীস বই', '/books'],
  ['বিষয়ভিত্তিক হাদীস', '/topics'],
])('the %s link goes to %s without reloading', (label, path) => {
  render(<NavBar />);
  fireEvent.click(screen.getByText(label));
  expect(getUrl().pathname).toBe(path);
});

test('the logo links home', () => {
  render(<NavBar />);
  expect(screen.getAllByRole('link')[0].getAttribute('href')).toBe('/');
});
