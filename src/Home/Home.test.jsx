import { fireEvent, render, screen } from '@testing-library/react';
import { getUrl } from '../test/nextNavigation';
import Home from './Home';

test('the home buttons open their page without errors', () => {
  const onError = vi.fn();
  window.addEventListener('error', onError);
  render(<Home />);
  fireEvent.click(screen.getByText('হাদীস সার্চ'));
  window.removeEventListener('error', onError);

  expect(onError).not.toHaveBeenCalled();
  expect(getUrl().pathname).toBe('/search');
});

test.each([
  ['বিষয়ভিত্তিক হাদীস', '/topics'],
  ['হাদীসের বই', '/books'],
])('the %s card goes to %s', (label, path) => {
  render(<Home />);
  fireEvent.click(screen.getByText(label));
  expect(getUrl().pathname).toBe(path);
});

test('sets the home page title', () => {
  render(<Home />);
  expect(document.title).toBe('BoiKotha - হাদীস সম্ভার');
});
