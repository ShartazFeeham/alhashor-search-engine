import { act, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { bookById } from '../lib/books';
import { shareText } from '../lib/share';
import { SettingsProvider } from '../settings/SettingsProvider';
import { ToastProvider } from '../ui/Toast';
import ShareButton from './ShareButton';
import { useCopy, useShare } from './useShare';

const BUKHARI_6628 = JSON.parse(readFileSync('public/json/hadis/Bukhari/6628/text.txt', 'utf8'));
const bukhari = bookById('bukhari');
const URL = `${window.location.origin}/hadis/bukhari/6628`;

const wrapper = ({ children }) => (
  <SettingsProvider>
    <ToastProvider>{children}</ToastProvider>
  </SettingsProvider>
);

const setShare = (value) => Object.defineProperty(navigator, 'share', { value, configurable: true, writable: true });

beforeEach(() => {
  Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue() } });
});

afterEach(() => {
  delete navigator.share;
});

const hadis = { book: bukhari, number: 6628, text: BUKHARI_6628 };

describe('useShare', () => {
  test('uses the native share sheet with the citation as the title, the text and the link', async () => {
    const native = vi.fn().mockResolvedValue();
    setShare(native);
    const { result } = renderHook(() => useShare(), { wrapper });
    await act(() => result.current(hadis));
    expect(native).toHaveBeenCalledTimes(1);
    expect(native).toHaveBeenCalledWith({
      title: 'সহীহ বুখারী, হাদীস নং ৬,৬২৮',
      text: shareText({ ...hadis }),
      url: URL,
    });
    expect(navigator.clipboard.writeText).not.toHaveBeenCalled();
  });

  test('the text sent to the sheet has no link, so the link is not repeated by the app that receives both', async () => {
    const native = vi.fn().mockResolvedValue();
    setShare(native);
    const { result } = renderHook(() => useShare(), { wrapper });
    await act(() => result.current(hadis));
    expect(native.mock.calls[0][0].text).not.toContain('http');
    expect(native.mock.calls[0][0].text).toContain('সহীহ বুখারী, হাদীস নং ৬,৬২৮');
  });

  test('a cancelled share does nothing: no copy and no message', async () => {
    setShare(vi.fn().mockRejectedValue(new DOMException('cancelled', 'AbortError')));
    const { result } = renderHook(() => useShare(), { wrapper });
    await act(() => result.current(hadis));
    expect(navigator.clipboard.writeText).not.toHaveBeenCalled();
    expect(screen.getByRole('status').textContent).toBe('');
  });

  test('copies the share text and says so when the sheet fails', async () => {
    setShare(vi.fn().mockRejectedValue(new Error('boom')));
    render(<ShareButton {...hadis} />, { wrapper });
    fireEvent.click(screen.getByRole('button', { name: 'শেয়ার' }));
    await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalledWith(shareText({ ...hadis, url: URL })));
    expect(await screen.findByText('শেয়ার টেক্সট কপি করা হয়েছে')).toBeInTheDocument();
  });

  test('copies the share text and says so when the browser has no share sheet', async () => {
    render(<ShareButton {...hadis} />, { wrapper });
    fireEvent.click(screen.getByRole('button', { name: 'শেয়ার' }));
    await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalledWith(shareText({ ...hadis, url: URL })));
    expect(await screen.findByText('শেয়ার টেক্সট কপি করা হয়েছে')).toBeInTheDocument();
  });

  test('says so when even the clipboard is blocked', async () => {
    navigator.clipboard.writeText.mockRejectedValue(new Error('blocked'));
    render(<ShareButton {...hadis} />, { wrapper });
    fireEvent.click(screen.getByRole('button', { name: 'শেয়ার' }));
    expect(await screen.findByText('কপি করা যায়নি')).toBeInTheDocument();
  });

  test('has no clipboard at all: says it could not copy', async () => {
    Object.assign(navigator, { clipboard: undefined });
    render(<ShareButton {...hadis} />, { wrapper });
    fireEvent.click(screen.getByRole('button', { name: 'শেয়ার' }));
    expect(await screen.findByText('কপি করা যায়নি')).toBeInTheDocument();
  });
});

describe('useCopy', () => {
  test('copies a value and confirms it', async () => {
    const { result } = renderHook(() => useCopy(), { wrapper });
    await act(() => result.current('abc'));
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('abc');
    expect(screen.getByRole('status')).toHaveTextContent('কপি করা হয়েছে');
  });

  test('uses its own message when given one', async () => {
    const { result } = renderHook(() => useCopy(), { wrapper });
    await act(() => result.current('abc', 'লিংক কপি করা হয়েছে'));
    expect(screen.getByRole('status')).toHaveTextContent('লিংক কপি করা হয়েছে');
  });
});

describe('useCopy fallback', () => {
  const setExec = (impl) => Object.defineProperty(document, 'execCommand', { value: impl, configurable: true, writable: true });
  afterEach(() => {
    delete document.execCommand;
  });

  test('copies through the textarea when the async clipboard is missing, and confirms', async () => {
    Object.assign(navigator, { clipboard: undefined });
    setExec(vi.fn(() => true));
    const { result } = renderHook(() => useCopy(), { wrapper });
    let copied;
    await act(async () => {
      copied = await result.current('abc');
    });
    expect(copied).toBe(true);
    expect(screen.getByRole('status')).toHaveTextContent('কপি করা হয়েছে');
  });

  test('confirms only on success: a failed copy shows the error and resolves to false', async () => {
    Object.assign(navigator, { clipboard: undefined });
    setExec(vi.fn(() => false));
    const { result } = renderHook(() => useCopy(), { wrapper });
    let copied;
    await act(async () => {
      copied = await result.current('abc', 'লিংক কপি করা হয়েছে');
    });
    expect(copied).toBe(false);
    expect(screen.getByRole('status')).toHaveTextContent('কপি করা যায়নি');
    expect(screen.getByRole('status')).not.toHaveTextContent('করা হয়েছে');
  });
});

describe('ShareButton', () => {
  test('the pill is a real button named "শেয়ার"', () => {
    render(<ShareButton {...hadis} />, { wrapper });
    expect(screen.getByRole('button', { name: 'শেয়ার' })).toBeInTheDocument();
  });

  test('the icon version is a button with the same name and a tooltip', () => {
    render(<ShareButton {...hadis} variant="icon" />, { wrapper });
    const button = screen.getByRole('button', { name: 'শেয়ার' });
    expect(button).toHaveAttribute('title', 'শেয়ার');
    expect(button.textContent).toBe('');
  });

  test('the link version is a plain button with the text "শেয়ার"', () => {
    render(<ShareButton {...hadis} variant="link" />, { wrapper });
    expect(screen.getByRole('button', { name: 'শেয়ার' }).textContent).toBe('শেয়ার');
  });
});
