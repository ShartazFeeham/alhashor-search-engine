import { fireEvent, render, screen } from '@testing-library/react';
import { SettingsProvider } from './SettingsProvider';
import SettingsPage from './SettingsPage';

const show = () => render(<SettingsProvider><SettingsPage /></SettingsProvider>);

beforeEach(() => {
  document.documentElement.removeAttribute('data-theme');
  document.documentElement.style.removeProperty('--rs');
  document.documentElement.style.removeProperty('--rlh');
  localStorage.clear();
});

test('is titled and lists the four themes, with light pressed at first', () => {
  show();
  expect(document.title).toBe('পড়ার সেটিংস - Alhashor');
  expect(screen.getByRole('button', { name: 'হালকা' })).toHaveAttribute('aria-pressed', 'true');
  for (const name of ['স্বয়ংক্রিয়', 'গাঢ়', 'সেপিয়া']) {
    expect(screen.getByRole('button', { name })).toHaveAttribute('aria-pressed', 'false');
  }
});

test('light is pressed at first even when the device prefers dark; the device option stays available', () => {
  const original = window.matchMedia;
  window.matchMedia = (query) => ({ matches: query.includes('dark'), media: query, addEventListener() {}, removeEventListener() {} });
  try {
    show();
    expect(screen.getByRole('button', { name: 'হালকা' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'স্বয়ংক্রিয়' }));
    expect(screen.getByRole('button', { name: 'স্বয়ংক্রিয়' })).toHaveAttribute('aria-pressed', 'true');
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
  } finally {
    window.matchMedia = original;
  }
});

test('a saved device choice shows the device option pressed', () => {
  localStorage.setItem('alhashor.settings', JSON.stringify({ theme: 'auto' }));
  show();
  expect(screen.getByRole('button', { name: 'স্বয়ংক্রিয়' })).toHaveAttribute('aria-pressed', 'true');
});

test('choosing a theme applies and saves it', () => {
  show();
  fireEvent.click(screen.getByRole('button', { name: 'গাঢ়' }));
  expect(screen.getByRole('button', { name: 'গাঢ়' })).toHaveAttribute('aria-pressed', 'true');
  expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  expect(JSON.parse(localStorage.getItem('alhashor.settings')).theme).toBe('dark');
});

const sizeSlider = () => screen.getByRole('slider', { name: 'লেখার আকার (পিক্সেল)' });
const gapSlider = () => screen.getByRole('slider', { name: 'লাইনের ফাঁক' });
const rs = () => document.documentElement.style.getPropertyValue('--rs');
const rlh = () => document.documentElement.style.getPropertyValue('--rlh');

test('the text size is a range slider from 3 to 30 in whole steps, starting at the default', () => {
  show();
  const slider = sizeSlider();
  expect(slider).toHaveAttribute('type', 'range');
  expect(slider).toHaveAttribute('min', '3');
  expect(slider).toHaveAttribute('max', '30');
  expect(slider).toHaveAttribute('step', '1');
  expect(slider).toHaveValue('16');
  expect(slider).toHaveAttribute('aria-valuetext', '১৬');
});

test('the line gap is a range slider from 0.5 to 2.5 in steps of 0.1, starting at the default', () => {
  show();
  const slider = gapSlider();
  expect(slider).toHaveAttribute('type', 'range');
  expect(slider).toHaveAttribute('min', '0.5');
  expect(slider).toHaveAttribute('max', '2.5');
  expect(slider).toHaveAttribute('step', '0.1');
  expect(slider).toHaveValue('1.9');
});

test('moving the size slider applies and saves the new size, anywhere from 3 to 30', () => {
  show();
  for (const size of [3, 7, 29, 30]) {
    fireEvent.change(sizeSlider(), { target: { value: String(size) } });
    expect(rs()).toBe(`${size}px`);
    expect(JSON.parse(localStorage.getItem('alhashor.settings')).size).toBe(size);
  }
});

test('moving the line gap slider applies and saves the new gap, anywhere from 0.5 to 2.5', () => {
  show();
  for (const gap of [0.5, 0.7, 2.4, 2.5]) {
    fireEvent.change(gapSlider(), { target: { value: String(gap) } });
    expect(rlh()).toBe(String(gap));
    expect(JSON.parse(localStorage.getItem('alhashor.settings')).lineHeight).toBe(gap);
  }
});

test('the plus and minus buttons move the text size by 1 and stop at 3 and 30', () => {
  show();
  fireEvent.click(screen.getByRole('button', { name: 'লেখা বড় করুন' }));
  expect(rs()).toBe('17px');
  fireEvent.click(screen.getByRole('button', { name: 'লেখা ছোট করুন' }));
  fireEvent.click(screen.getByRole('button', { name: 'লেখা ছোট করুন' }));
  expect(rs()).toBe('15px');
  for (let i = 0; i < 40; i++) fireEvent.click(screen.getByRole('button', { name: 'লেখা ছোট করুন' }));
  expect(rs()).toBe('3px');
  expect(screen.getByRole('button', { name: 'লেখা ছোট করুন' })).toBeDisabled();
  for (let i = 0; i < 40; i++) fireEvent.click(screen.getByRole('button', { name: 'লেখা বড় করুন' }));
  expect(rs()).toBe('30px');
  expect(screen.getByRole('button', { name: 'লেখা বড় করুন' })).toBeDisabled();
});

test('the plus and minus buttons move the line gap by 0.1 and stop at 0.5 and 2.5', () => {
  show();
  fireEvent.click(screen.getByRole('button', { name: 'লাইনের ফাঁক বাড়ান' }));
  expect(rlh()).toBe('2');
  for (let i = 0; i < 40; i++) fireEvent.click(screen.getByRole('button', { name: 'লাইনের ফাঁক কমান' }));
  expect(rlh()).toBe('0.5');
  for (let i = 0; i < 40; i++) fireEvent.click(screen.getByRole('button', { name: 'লাইনের ফাঁক বাড়ান' }));
  expect(rlh()).toBe('2.5');
});

test('there is no text width control', () => {
  show();
  expect(screen.queryByText(/লেখার প্রস্থ/)).not.toBeInTheDocument();
  expect(screen.queryByRole('slider', { name: /প্রস্থ/ })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /প্রস্থ/ })).not.toBeInTheDocument();
  expect(screen.getAllByRole('slider')).toHaveLength(2);
  expect(document.documentElement.style.getPropertyValue('--rw')).toBe('');
});

test('the preview follows the chosen size and gap', () => {
  show();
  fireEvent.change(sizeSlider(), { target: { value: '24' } });
  fireEvent.change(gapSlider(), { target: { value: '1.2' } });
  expect(rs()).toBe('24px');
  expect(rlh()).toBe('1.2');
  expect(screen.getByLabelText('নমুনা')).toHaveClass('settings-preview'); // sized by --rs and --rlh in the stylesheet
});

test('the numbers beside the sliders follow the digit style', () => {
  show();
  fireEvent.change(sizeSlider(), { target: { value: '22' } });
  fireEvent.change(gapSlider(), { target: { value: '1.3' } });
  expect(screen.getByText('২২')).toBeInTheDocument();
  expect(screen.getByText('১.৩')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'English' }));
  expect(screen.getByText('22')).toBeInTheDocument();
  expect(screen.getByText('1.3')).toBeInTheDocument();
  expect(sizeSlider()).toHaveAttribute('aria-valuetext', '22');
});

test('the digit style can be switched and shows in the page', () => {
  show();
  expect(screen.getByText(/১৬/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'English' }));
  expect(screen.getByText(/16/)).toBeInTheDocument();
  expect(JSON.parse(localStorage.getItem('alhashor.settings')).digits).toBe('en');
});

test('the preview uses the real reading text', () => {
  show();
  expect(screen.getByText(/ইয়াহুদী ও নাসারাদের প্রতি আল্লাহর অভিশাপ/)).toBeInTheDocument();
});

test('reset goes back to the defaults', () => {
  show();
  fireEvent.click(screen.getByRole('button', { name: 'গাঢ়' }));
  fireEvent.click(screen.getByRole('button', { name: 'লেখা বড় করুন' }));
  fireEvent.click(screen.getByRole('button', { name: 'লাইনের ফাঁক বাড়ান' }));
  fireEvent.click(screen.getByRole('button', { name: 'আগের মতো করুন' }));
  expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  expect(rs()).toBe('16px');
  expect(rlh()).toBe('1.9');
  expect(sizeSlider()).toHaveValue('16');
});
