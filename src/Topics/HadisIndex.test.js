import { render, screen, fireEvent } from '@testing-library/react';
import HadisIndex from './HadisIndex';
import { normalizeBengali } from '../Helpers/bengali';

test('lists every topic once, even if it was written in two spellings', () => {
  render(<HadisIndex onSelect={() => {}} />);
  const names = screen.getAllByRole('button').map((item) => normalizeBengali(item.textContent));
  expect(names.length).toBeGreaterThan(100);
  expect(new Set(names).size).toBe(names.length);
});

test('a topic can be chosen with the mouse or the keyboard', () => {
  const onSelect = jest.fn();
  render(<HadisIndex onSelect={onSelect} />);
  fireEvent.click(screen.getByText('ঈমান'));
  expect(onSelect).toHaveBeenLastCalledWith('ঈমান');

  fireEvent.keyDown(screen.getByText('নামায'), { key: 'Enter' });
  expect(onSelect).toHaveBeenLastCalledWith('নামায');
});
