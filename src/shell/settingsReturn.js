// The settings are a page (/settings). Opening them remembers the page the reader was on, so the
// cross of the top bar can take them back to it: history back when they got there by a link of the
// app (the browser restores the page and its scroll position), else the remembered address, else
// home.
const KEY = 'settings-from';
let cameByLink = false;

export function rememberReturn() {
  cameByLink = true;
  try {
    window.sessionStorage.setItem(KEY, window.location.pathname + window.location.search);
  } catch { /* storage may be blocked: back or home still work */ }
}

export function forgetReturn() {
  cameByLink = false;
  try {
    window.sessionStorage.removeItem(KEY);
  } catch { /* nothing to forget */ }
}

// Goes back to where the reader was; returns nothing, only navigates.
export function leaveSettings(router) {
  let stored = null;
  try {
    stored = window.sessionStorage.getItem(KEY);
  } catch { /* no storage */ }
  const byLink = cameByLink;
  forgetReturn();
  if (byLink) router.back();
  else router.push(stored && stored.startsWith('/') && !stored.startsWith('/settings') ? stored : '/');
}
