import { act, fireEvent, render, screen } from '@testing-library/react';
import BookBadge from './BookBadge';
import Button from './Button';
import Chip from './Chip';
import Icon from './Icon';
import { ToastProvider, useToast } from './Toast';

test('an icon is hidden from screen readers', () => {
  render(<Icon name="home" />);
  expect(screen.getByTestId('icon-home')).toHaveAttribute('aria-hidden', 'true');
});

test('an unknown icon name renders nothing instead of breaking', () => {
  render(<Icon name="nonsense" />);
  expect(screen.queryByTestId('icon-nonsense')).not.toBeInTheDocument();
});

test('a button forwards clicks and has a primary variant', () => {
  const onClick = vi.fn();
  render(<Button variant="primary" onClick={onClick}>যাই</Button>);
  fireEvent.click(screen.getByRole('button', { name: 'যাই' }));
  expect(onClick).toHaveBeenCalled();
  expect(screen.getByRole('button', { name: 'যাই' }).className).toContain('ui-btn');
  expect(screen.getByRole('button', { name: 'যাই' }).className).toContain('primary');
});

test('a chip is a toggle button', () => {
  render(<Chip pressed>সব</Chip>);
  expect(screen.getByRole('button', { name: 'সব' })).toHaveAttribute('aria-pressed', 'true');
});

test('a chip can show the colour dot of a book', () => {
  render(<Chip pressed={false} dot="var(--bk-muslim)">মুসলিম</Chip>);
  expect(screen.getByRole('button', { name: 'মুসলিম' })).toHaveAttribute('aria-pressed', 'false');
});

test('a book badge shows the book letter and carries the book colour', () => {
  render(<BookBadge bookId="muslim" />);
  const badge = screen.getByText('মু');
  expect(badge.style.getPropertyValue('--bk')).toBe('var(--bk-muslim)');
});

test('a toast is announced politely and goes away by itself', () => {
  vi.useFakeTimers();
  function Probe() {
    const toast = useToast();
    return <button onClick={() => toast('কপি করা হয়েছে')}>go</button>;
  }
  render(<ToastProvider><Probe /></ToastProvider>);
  fireEvent.click(screen.getByText('go'));
  expect(screen.getByRole('status')).toHaveTextContent('কপি করা হয়েছে');
  act(() => vi.advanceTimersByTime(2100));
  expect(screen.getByRole('status')).toBeEmptyDOMElement();
  vi.useRealTimers();
});

test('useToast outside the provider does nothing instead of crashing', () => {
  function Probe() {
    const toast = useToast();
    return <button onClick={() => toast('x')}>go</button>;
  }
  render(<Probe />);
  expect(() => fireEvent.click(screen.getByText('go'))).not.toThrow();
});
