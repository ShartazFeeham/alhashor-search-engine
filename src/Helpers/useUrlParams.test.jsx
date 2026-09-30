import { fireEvent, render, screen } from '@testing-library/react';
import { getLastPushOptions, getUrl, setUrl } from '../test/nextNavigation';
import { useUrlParams } from './useUrlParams';

function Probe() {
  const [params, setParams] = useUrlParams();
  return (
    <div>
      <span data-testid="q">{params.get('q')}</span>
      <button onClick={() => setParams({ q: 'রোজা', page: '2' })}>go</button>
      <button onClick={() => setParams({})}>clear</button>
    </div>
  );
}

test('reads the current query', () => {
  setUrl('/search?q=abc');
  render(<Probe />);
  expect(screen.getByTestId('q')).toHaveTextContent('abc');
});

test('setParams goes to the same page with the new query', () => {
  setUrl('/search?q=abc');
  render(<Probe />);
  fireEvent.click(screen.getByText('go'));
  expect(getUrl().pathname).toBe('/search');
  expect(getUrl().searchParams.get('q')).toBe('রোজা');
  expect(getUrl().searchParams.get('page')).toBe('2');
});

test('an empty query goes to the bare path', () => {
  setUrl('/search?q=abc');
  render(<Probe />);
  fireEvent.click(screen.getByText('clear'));
  expect(getUrl().pathname + getUrl().search).toBe('/search');
});

test('navigating does not scroll: Next would otherwise leave the page scrolled below the navigation bar', () => {
  setUrl('/search?q=abc');
  render(<Probe />);
  fireEvent.click(screen.getByText('go'));
  expect(getLastPushOptions()).toEqual({ scroll: false });
});
