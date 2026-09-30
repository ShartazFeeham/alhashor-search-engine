import { act, fireEvent, render, screen } from '@testing-library/react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { getHistory, getUrl, setUrl } from './nextNavigation';

function Probe() {
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  return (
    <div>
      <span data-testid="where">{pathname + '?' + params.toString()}</span>
      <button onClick={() => router.push('/books?x=1')}>push</button>
      <button onClick={() => router.replace('/topics?y=2')}>replace</button>
      <Link href="/search?q=a">link</Link>
    </div>
  );
}

test('readers see the current address', () => {
  setUrl('/search?q=abc');
  render(<Probe />);
  expect(screen.getByTestId('where')).toHaveTextContent('/search?q=abc');
});

test('router.push changes the address, re-renders readers and records history', () => {
  render(<Probe />);
  fireEvent.click(screen.getByText('push'));
  expect(screen.getByTestId('where')).toHaveTextContent('/books?x=1');
  expect(getHistory()).toHaveLength(1);
});

test('router.replace changes the address without adding history', () => {
  render(<Probe />);
  fireEvent.click(screen.getByText('replace'));
  expect(screen.getByTestId('where')).toHaveTextContent('/topics?y=2');
  expect(getHistory()).toHaveLength(0);
});

test('a Link click navigates without a page load', () => {
  render(<Probe />);
  fireEvent.click(screen.getByText('link'));
  expect(getUrl().pathname + getUrl().search).toBe('/search?q=a');
  expect(screen.getByTestId('where')).toHaveTextContent('/search?q=a');
});

test('the address is reset to / before each test', () => {
  expect(getUrl().pathname).toBe('/');
  expect(getHistory()).toHaveLength(0);
});

test('setUrl outside React is seen by a mounted reader', () => {
  render(<Probe />);
  act(() => setUrl('/books'));
  expect(screen.getByTestId('where')).toHaveTextContent('/books');
});
