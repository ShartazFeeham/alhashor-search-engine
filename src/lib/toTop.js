import { wantPageFocus } from './pageFocus';

// Moves to the top of the page. Links to another page of a book turn off Next's own scrolling
// (it stops just below the navigation bar) and call this instead. It also asks the page's results
// to take keyboard focus once the new page has loaded (see pageFocus.js).
export function toTop() {
  document.documentElement.scrollTop = 0;
  wantPageFocus();
}
