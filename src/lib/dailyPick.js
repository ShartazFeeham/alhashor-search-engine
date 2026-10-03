const DAY = 86400000;
const GOLDEN = 0.6180339887;

// Days since 1970-01-01 of the *local* calendar date. The clock time and clock changes do not
// matter, so the whole day (in the visitor's own time zone) has one number.
export function dayNumber(date) {
  return Math.round(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / DAY);
}

function gcd(a, b) {
  return b === 0 ? a : gcd(b, a % b);
}

// A step through a list of `size` that visits every place before repeating (it shares no factor
// with the size) and lands far from the last one, so neighbouring days are never neighbours in
// the list.
export function strideFor(size) {
  if (size <= 2) return 1;
  let stride = Math.max(1, Math.round(size * GOLDEN));
  while (gcd(stride, size) !== 1) stride++;
  return stride;
}
