import { copyToClipboard } from './clipboard';

const setClipboard = (value) => Object.defineProperty(navigator, 'clipboard', { value, configurable: true, writable: true });
const setExec = (impl) => Object.defineProperty(document, 'execCommand', { value: impl, configurable: true, writable: true });

afterEach(() => {
  delete navigator.clipboard;
  delete document.execCommand;
});

describe('copyToClipboard', () => {
  test('uses the async clipboard when there is one, and says it worked', async () => {
    const writeText = vi.fn().mockResolvedValue();
    setClipboard({ writeText });
    const exec = vi.fn();
    setExec(exec);
    await expect(copyToClipboard('https://hadis.example/hadis/bukhari/6')).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith('https://hadis.example/hadis/bukhari/6');
    expect(exec).not.toHaveBeenCalled();
  });

  test('without navigator.clipboard (a non-secure page) it copies through a hidden textarea and removes it', async () => {
    setClipboard(undefined);
    let seen;
    setExec(
      vi.fn((command) => {
        const area = document.querySelector('textarea');
        seen = { command, value: area?.value, selected: area?.selectionEnd - area?.selectionStart, readOnly: area?.readOnly, focused: document.activeElement === area };
        return true;
      })
    );
    await expect(copyToClipboard('বুখারী লিংক')).resolves.toBe(true);
    expect(seen.command).toBe('copy');
    expect(seen.value).toBe('বুখারী লিংক');
    expect(seen.selected).toBe('বুখারী লিংক'.length); // all of it is selected (iOS needs setSelectionRange)
    expect(seen.readOnly).toBe(true); // no keyboard pops up on a phone
    expect(document.querySelector('textarea')).toBeNull();
  });

  test('the hidden textarea is out of sight and does not move the page', async () => {
    setClipboard(undefined);
    let style;
    setExec(
      vi.fn(() => {
        const area = document.querySelector('textarea');
        style = { position: area.style.position, top: area.style.top, opacity: area.style.opacity, fontSize: area.style.fontSize };
        return true;
      })
    );
    await copyToClipboard('x');
    expect(style.position).toBe('fixed');
    expect(style.opacity).toBe('0');
    expect(parseInt(style.fontSize, 10)).toBeGreaterThanOrEqual(16); // below 16px iOS zooms in
  });

  test('when the async clipboard refuses (permission, iOS Safari), the textarea way is tried', async () => {
    setClipboard({ writeText: vi.fn().mockRejectedValue(new DOMException('no', 'NotAllowedError')) });
    const exec = vi.fn(() => true);
    setExec(exec);
    await expect(copyToClipboard('abc')).resolves.toBe(true);
    expect(exec).toHaveBeenCalledWith('copy');
  });

  test('when both ways fail it says so (false) and leaves nothing behind', async () => {
    setClipboard({ writeText: vi.fn().mockRejectedValue(new Error('blocked')) });
    setExec(vi.fn(() => false));
    await expect(copyToClipboard('abc')).resolves.toBe(false);
    expect(document.querySelector('textarea')).toBeNull();
  });

  test('a throwing execCommand, or none at all, is a failure and not a crash', async () => {
    setClipboard(undefined);
    setExec(
      vi.fn(() => {
        throw new Error('nope');
      })
    );
    await expect(copyToClipboard('abc')).resolves.toBe(false);
    expect(document.querySelector('textarea')).toBeNull();
    delete document.execCommand;
    await expect(copyToClipboard('abc')).resolves.toBe(false);
  });

  test('puts focus back where it was', async () => {
    setClipboard(undefined);
    setExec(vi.fn(() => true));
    const button = document.createElement('button');
    document.body.append(button);
    button.focus();
    await copyToClipboard('abc');
    expect(document.activeElement).toBe(button);
    button.remove();
  });
});
