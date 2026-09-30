import { render, screen, fireEvent } from '@testing-library/react';
import App from './App';
import getNum, { getBook } from './Helpers/EngToBng';

function openAt(path) {
  window.history.pushState({}, '', path);
  return render(<App />);
}

afterEach(() => {
  window.history.pushState({}, '', '/');
});

test('renders the navigation links', () => {
  openAt('/');
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

test.each(['/', '/search', '/books', '/topics'])('page %s renders without React warnings', (path) => {
  const errors = jest.spyOn(console, 'error').mockImplementation(() => {});
  openAt(path);
  const messages = errors.mock.calls.map((call) => String(call[0]));
  errors.mockRestore();
  expect(messages).toEqual([]);
});

test('rendering the app does not add browser history entries', () => {
  window.history.pushState({}, '', '/');
  const before = window.history.length;
  render(<App />);
  expect(window.history.length).toBe(before);
});

test('the home page buttons open their page without errors', () => {
  const onError = jest.fn();
  window.addEventListener('error', onError);
  openAt('/');
  fireEvent.click(screen.getByText('হাদীস সার্চ'));
  window.removeEventListener('error', onError);

  expect(onError).not.toHaveBeenCalled();
  expect(window.location.pathname).toBe('/search');
});

test('the navigation links change the page without reloading', () => {
  openAt('/');
  fireEvent.click(screen.getByText('সার্চ'));
  expect(window.location.pathname).toBe('/search');
  expect(screen.getByRole('textbox')).toBeInTheDocument();

  fireEvent.click(screen.getByText('হাদীস বই'));
  expect(window.location.pathname).toBe('/books');
  expect(screen.getByText('নিচে থেকে যেকোনো একটি বই ক্লিক করুন')).toBeInTheDocument();
});
