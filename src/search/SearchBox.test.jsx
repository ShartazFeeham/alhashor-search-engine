import { useState } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { loadRoman } from '../lib/roman';
import SearchBox from './SearchBox';

const WARNING = 'শুধু বাংলা বা ইংরেজি অক্ষর লিখুন';
const submitted = vi.fn();

function Harness({ query = 'x' }) {
  const [text, setText] = useState('');
  return <SearchBox text={text} onText={setText} query={query} onSubmit={(event) => { event.preventDefault(); submitted(text); }} />;
}

const box = () => screen.getByRole('textbox', { name: 'খোঁজার শব্দ' });

// Sets the value the way the browser does (past React's value tracking), then the caret.
const nativeSet = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
function setValue(input, value, caret) {
  nativeSet.call(input, value);
  input.setSelectionRange(caret, caret);
}

// Types one character the way a browser does: the value changes with the caret after the new text.
function type(ch, at = box().value.length) {
  const input = box();
  const value = input.value.slice(0, at) + ch + input.value.slice(at);
  setValue(input, value, at + ch.length);
  fireEvent.input(input, { inputType: 'insertText', data: ch });
}
function backspace() {
  const input = box();
  const end = input.selectionStart;
  setValue(input, input.value.slice(0, end - 1) + input.value.slice(end), end - 1);
  fireEvent.input(input, { inputType: 'deleteContentBackward' });
}
const typeAll = (text) => [...text].forEach((ch) => type(ch));

beforeAll(loadRoman);
beforeEach(() => submitted.mockClear());

test('Bangla goes in as typed', () => {
  render(<Harness />);
  typeAll('রোজা ১২৩।');
  expect(box()).toHaveValue('রোজা ১২৩।');
  expect(screen.getByRole('status')).toBeEmptyDOMElement();
});

test('English letters become Bengali as you type, the whole word being converted each time', () => {
  render(<Harness />);
  typeAll('n');
  expect(box()).toHaveValue('ন');
  typeAll('amaz');
  expect(box()).toHaveValue('নামায');
  expect(box().selectionStart).toBe('নামায'.length);
});

test('a space commits the word and the next word starts fresh', () => {
  render(<Harness />);
  typeAll('namaz roja');
  expect(box()).toHaveValue('নামায রোজা');
});

test('Backspace removes the last English letter and converts again', () => {
  render(<Harness />);
  typeAll('namaz');
  backspace();
  expect(box()).toHaveValue('নামা');
  backspace();
  backspace();
  backspace();
  backspace();
  expect(box()).toHaveValue('');
});

test('Backspace with no word being typed deletes normally', () => {
  render(<Harness />);
  typeAll('কখগ');
  backspace();
  expect(box()).toHaveValue('কখ');
});

test('after a committed word Backspace deletes the character before the caret as usual', () => {
  render(<Harness />);
  typeAll('namaz ');
  backspace();
  expect(box()).toHaveValue('নামায');
});

test('English digits become Bengali digits', () => {
  render(<Harness />);
  typeAll('1234');
  expect(box()).toHaveValue('১২৩৪');
});

test('typing away from the end of the word being typed commits it and starts another', () => {
  render(<Harness />);
  typeAll('ka');
  type('b', 0);
  expect(box().value.startsWith('ব')).toBe(true);
  expect(box().value.endsWith('কা')).toBe(true);
});

test.each(['@', '#', '$', '%', '.', ',', '-', "'", 'ش', '😀'])('%s is not inserted and the warning shows', (ch) => {
  render(<Harness />);
  typeAll('কখ');
  type(ch);
  expect(box()).toHaveValue('কখ');
  expect(screen.getByRole('status')).toHaveTextContent(WARNING);
  expect(box().selectionStart).toBe(2);
});

test('the warning line is a polite live region that is always there', () => {
  render(<Harness />);
  const status = screen.getByRole('status');
  expect(status).toHaveAttribute('aria-live', 'polite');
  expect(status).toHaveClass('search-warn');
  expect(status).toBeEmptyDOMElement();
});

test('the warning goes away on the next valid key', () => {
  render(<Harness />);
  type('@');
  expect(screen.getByRole('status')).toHaveTextContent(WARNING);
  type('ক');
  expect(screen.getByRole('status')).toBeEmptyDOMElement();
});

test('the warning goes away by itself after about three seconds', () => {
  vi.useFakeTimers();
  try {
    render(<Harness />);
    type('@');
    expect(screen.getByRole('status')).toHaveTextContent(WARNING);
    act(() => { vi.advanceTimersByTime(2500); });
    expect(screen.getByRole('status')).toHaveTextContent(WARNING);
    act(() => { vi.advanceTimersByTime(700); });
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
  } finally {
    vi.useRealTimers();
  }
});

test('a rejected character keeps the word being typed', () => {
  render(<Harness />);
  typeAll('nama');
  type('@');
  typeAll('z');
  expect(box()).toHaveValue('নামায');
});

test('paste: English words are converted, other characters dropped, and the warning shows', () => {
  render(<Harness />);
  fireEvent.change(box(), { target: { value: 'roja, namaz@#' } });
  expect(box().value).toContain('রোজা');
  expect(box().value).toContain('নামায');
  expect(box().value).not.toMatch(/[a-z@#,]/);
  expect(screen.getByRole('status')).toHaveTextContent(WARNING);
});

test('paste of Bangla with no foreign characters has no warning', () => {
  render(<Harness />);
  fireEvent.change(box(), { target: { value: 'রোজা ও নামায' } });
  expect(box()).toHaveValue('রোজা ও নামায');
  expect(screen.getByRole('status')).toBeEmptyDOMElement();
});

test('nothing is changed while an input method is composing; the rules apply when it ends', () => {
  render(<Harness />);
  fireEvent.compositionStart(box());
  fireEvent.change(box(), { target: { value: 'ক@' } });
  expect(box()).toHaveValue('ক@');
  expect(screen.getByRole('status')).toBeEmptyDOMElement();
  fireEvent.compositionEnd(box());
  expect(box()).toHaveValue('ক');
  expect(screen.getByRole('status')).toHaveTextContent(WARNING);
});

test('submit sends the Bengali text', () => {
  render(<Harness />);
  typeAll('namaz');
  fireEvent.click(screen.getByRole('button', { name: 'খুঁজুন' }));
  expect(submitted).toHaveBeenCalledWith('নামায');
});

test('there is no suggestion list; the examples stay before the first search', () => {
  render(<Harness query="" />);
  typeAll('namaz');
  expect(screen.queryByRole('group', { name: 'বাংলা প্রস্তাব' })).not.toBeInTheDocument();
  expect(screen.getByRole('group', { name: 'উদাহরণ' })).toBeInTheDocument();
});

test('an example chip fills the box and starts no word', () => {
  render(<Harness query="" />);
  fireEvent.click(screen.getByRole('button', { name: 'রোজা' }));
  expect(box()).toHaveValue('রোজা');
  backspace();
  expect(box()).toHaveValue('রোজ');
});
