import { fireEvent, render, screen } from '@testing-library/react';
import { ToastProvider } from '../ui/Toast';
import { CompareProvider } from './CompareProvider';
import CompareToggle from './CompareToggle';

const show = (ui) =>
  render(
    <ToastProvider>
      <CompareProvider>{ui}</CompareProvider>
    </ToastProvider>
  );

beforeEach(() => {
  sessionStorage.clear();
});

test.each(['pill', 'icon', 'link'])('the %s button toggles a hadis in and out of the comparison', (variant) => {
  show(<CompareToggle bookId="muslim" number={5} variant={variant} />);
  const add = screen.getByRole('button', { name: 'তুলনায় যোগ করুন', pressed: false });
  fireEvent.click(add);
  const remove = screen.getByRole('button', { name: 'তুলনা থেকে সরান', pressed: true });
  expect(screen.getByRole('status')).toHaveTextContent('তুলনায় যোগ হয়েছে');
  fireEvent.click(remove);
  expect(screen.getByRole('button', { name: 'তুলনায় যোগ করুন', pressed: false })).toBeInTheDocument();
  expect(screen.getByRole('status')).toHaveTextContent('তুলনা থেকে সরানো হয়েছে');
});

test('the pill has an icon and a visible label; the icon variant has only the icon', () => {
  const { unmount } = show(<CompareToggle bookId="muslim" number={5} />);
  expect(screen.getByRole('button')).toHaveTextContent('তুলনায় যোগ করুন');
  expect(screen.getByTestId('icon-cols')).toBeInTheDocument();
  unmount();
  show(<CompareToggle bookId="muslim" number={5} variant="icon" />);
  expect(screen.getByRole('button').textContent).toBe('');
  expect(screen.getByTestId('icon-cols')).toBeInTheDocument();
});

test('a fifth hadis is refused with a message and stays unpressed', () => {
  show(
    <>
      <CompareToggle bookId="bukhari" number={1} />
      <CompareToggle bookId="bukhari" number={2} />
      <CompareToggle bookId="bukhari" number={3} />
      <CompareToggle bookId="bukhari" number={4} />
      <CompareToggle bookId="bukhari" number={5} />
    </>
  );
  const buttons = screen.getAllByRole('button');
  buttons.slice(0, 4).forEach((button) => fireEvent.click(button));
  fireEvent.click(buttons[4]);
  expect(screen.getByRole('status')).toHaveTextContent('সর্বোচ্চ ৪টি হাদীস তুলনা করা যায়');
  expect(buttons[4]).toHaveAttribute('aria-pressed', 'false');
});

test('a number that is not a hadis shows nothing', () => {
  show(<CompareToggle bookId="bukhari" number={63} />);
  expect(screen.queryByRole('button')).not.toBeInTheDocument();
});
