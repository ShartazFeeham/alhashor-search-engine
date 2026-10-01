// Moves to the top of the page. Links to another page of a book turn off Next's own scrolling
// (it stops just below the navigation bar) and call this instead.
export function toTop() {
  document.documentElement.scrollTop = 0;
}
