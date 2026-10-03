// The pure part of the quote-card image: where words wrap, which font size fits, where a long
// text is cut, and the card colours. The drawing itself is in src/share/drawCard.js.

// The card is always this wide; its height is worked out from the text (see measureCard in src/share/drawCard.js).
export const CARD_WIDTH = 1080;
// The tallest card drawn. Phone browsers refuse a canvas of more than about 16.7 million pixels
// (15,534 px at this width), so a text that would need more is set smaller and then cut to an excerpt.
export const CARD_MAX_HEIGHT = 15400;

// The book colours of the light theme (src/styles/tokens.css). A card always uses these, whatever
// theme the visitor reads in, so a shared image looks the same everywhere.
export const CARD_COLOURS = {
  bukhari: '#0f8663',
  muslim: '#3a63c8',
  tirmidhi: '#9e6a07',
  abudawud: '#8a4bb8',
  ibnmajah: '#c45227',
  nasai: '#c3387f',
};

const ELLIPSIS = ' ...';

// Breaks the text into lines no wider than maxWidth. Lines break on spaces only, so a Bengali
// word (with its conjuncts) is never split. A new line in the text starts a new line. A word
// wider than the line stands alone on its own line. `measure(text)` gives the width of a string.
export function wrapWords(text, maxWidth, measure) {
  const lines = [];
  for (const paragraph of text.split('\n')) {
    let line = '';
    for (const word of paragraph.split(/[ \t]+/).filter(Boolean)) {
      const attempt = line ? `${line} ${word}` : word;
      if (line && measure(attempt) > maxWidth) {
        lines.push(line);
        line = word;
      } else {
        line = attempt;
      }
    }
    if (line) lines.push(line);
  }
  return lines;
}

function sizesFrom(maxFont, minFont, step) {
  const sizes = [];
  for (let size = maxFont; size > minFont; size -= step) sizes.push(size);
  sizes.push(minFont);
  return sizes;
}

// Chooses the biggest font size (from maxFont down to minFont) at which the text fits the box.
// If it does not fit even at minFont, the text is cut at a word boundary and " ..." is added,
// keeping as much as fits. `measure(text, fontSize)` gives the width of a string.
// Returns { fontSize, lines, text, excerpted }.
export function fitText({ text, maxWidth, maxHeight, measure, maxFont = 60, minFont = 34, lineHeight = 1.75, step = 2 }) {
  const wrapAt = (value, size) => wrapWords(value, maxWidth, (line) => measure(line, size));
  const fits = (lines, size) =>
    lines.length * size * lineHeight <= maxHeight && lines.every((line) => measure(line, size) <= maxWidth);

  for (const size of sizesFrom(maxFont, minFont, step)) {
    const lines = wrapAt(text, size);
    if (fits(lines, size)) return { fontSize: size, lines, text, excerpted: false };
  }

  // Candidate cut points: every space in the text. The longest prefix that fits wins.
  const cuts = [];
  for (let i = 1; i < text.length; i++) if (/\s/.test(text[i])) cuts.push(i);
  const candidate = (index) => `${text.slice(0, index).trimEnd()}${ELLIPSIS}`;
  // The " ..." stays with the last word (a non-breaking space) so it never sits alone on a line.
  const lay = (value) => wrapAt(value.replace(/ \.\.\.$/, ' ...'), minFont);

  if (cuts.length === 0) return { fontSize: minFont, lines: wrapAt(text, minFont), text, excerpted: false };

  let low = 0;
  let high = cuts.length - 1;
  let best = 0; // the first cut is the fallback even if it does not fit
  while (low <= high) {
    const mid = (low + high) >> 1;
    if (fits(lay(candidate(cuts[mid])), minFont)) {
      best = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  const cut = candidate(cuts[best]);
  return { fontSize: minFont, lines: lay(cut), text: cut, excerpted: true };
}

// ---------- colours ----------

const toRgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const toHex = (rgb) => `#${rgb.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;

// `amount` of `other` mixed into `hex` (0 = hex, 1 = other).
export function mix(hex, other, amount) {
  const a = toRgb(hex);
  const b = toRgb(other);
  return toHex(a.map((v, i) => v * (1 - amount) + b[i] * amount));
}

function luminance(hex) {
  const [r, g, b] = toRgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// WCAG contrast ratio between two colours.
export function contrastRatio(a, b) {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

// A fixed, pleasant light card for a book colour: a pale tint of the colour as the paper, the
// colour itself for the badge and accents, and dark shades of it for the text.
export function cardPalette(bookColor) {
  return {
    accent: bookColor,
    onAccent: '#ffffff',
    bg: mix(bookColor, '#ffffff', 0.9),
    bg2: mix(bookColor, '#ffffff', 0.8),
    line: mix(bookColor, '#ffffff', 0.55),
    ink: mix(bookColor, '#000000', 0.8),
    muted: mix(bookColor, '#000000', 0.55),
  };
}
