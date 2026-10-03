// Puts text on the clipboard: navigator.clipboard.writeText where the browser allows it, otherwise
// (a non-secure page, iOS Safari refusing, an old browser) a hidden textarea and
// document.execCommand('copy'). Resolves to true only when one of them worked, so a caller can show
// "copied" on success and an error on failure, never the other way round.
function copyWithTextarea(value) {
  if (typeof document === 'undefined' || typeof document.execCommand !== 'function') return false;
  const before = document.activeElement;
  const area = document.createElement('textarea');
  area.value = value;
  area.readOnly = true; // no keyboard on a phone
  area.setAttribute('aria-hidden', 'true');
  area.tabIndex = -1;
  // Out of sight and out of the layout; 16px or more, or iOS zooms the page when it is focused.
  Object.assign(area.style, { position: 'fixed', top: '0', left: '0', width: '1px', height: '1px', opacity: '0', fontSize: '16px', pointerEvents: 'none' });
  document.body.append(area);
  try {
    area.focus({ preventScroll: true });
    area.select();
    area.setSelectionRange(0, value.length); // iOS ignores select()
    return document.execCommand('copy') === true;
  } catch {
    return false;
  } finally {
    area.remove();
    if (before instanceof HTMLElement) before.focus({ preventScroll: true });
  }
}

export async function copyToClipboard(value) {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.clipboard?.writeText === 'function') {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    // fall through to the textarea way
  }
  return copyWithTextarea(value);
}
