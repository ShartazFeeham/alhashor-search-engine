import { render, screen } from '@testing-library/react';
import Highlight from './Highlight';

test('shows a word that contains a searched word in bold', () => {
  render(<Highlight word="fasting" mark={['fast']} />);
  expect(screen.getByText('fasting').tagName).toBe('B');
});

test('shows other words as plain text in a valid element', () => {
  const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
  render(<Highlight word="prayer" mark={['fast']} />);
  const messages = errors.mock.calls.map((call) => String(call[0]));
  errors.mockRestore();

  expect(screen.getByText('prayer').tagName).toBe('SPAN');
  expect(messages).toEqual([]);
});

test('highlights a word even when it is spelled with a different form of the same letter', () => {
  render(<Highlight word={'ম\u09af\u09bcলা'} mark={['ম\u09dfলা']} />);
  expect(screen.getByText('ময়লা').tagName).toBe('B');
});
