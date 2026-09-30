import { render, screen, fireEvent } from '@testing-library/react';
import Suggestions from './Suggestions';

test('a suggestion can be chosen with the mouse or the keyboard', () => {
  const setBox = jest.fn();
  render(<Suggestions setBox={setBox} />);
  fireEvent.click(screen.getByText('রোজা'));
  expect(setBox).toHaveBeenLastCalledWith('রোজা');

  fireEvent.keyDown(screen.getByText('আবু হুরায়রা'), { key: 'Enter' });
  expect(setBox).toHaveBeenLastCalledWith('আবু হুরায়রা');
});
