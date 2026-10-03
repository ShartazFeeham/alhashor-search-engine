import { CARD_MAX_HEIGHT, CARD_WIDTH, cardPalette, fitText } from '../lib/cardLayout';

const PAD = 88;
const BADGE = 96;
const FOOTER = 150; // the rule, the citation and the site name
const LINE_HEIGHT = 1.75;
const LINK_ROOM = 64; // the "full hadis" line under an excerpt
const TEXT_GAP = 24; // between the end of the saying and the footer rule
const HEAD = PAD + BADGE + 64; // where the saying starts
const FONT_SIZE = 48; // the saying's font size; only a text too long for the tallest card is set smaller
const MIN_FONT_SIZE = 26;
const MIN_HEIGHT = 640;
const SITE_NAME = 'Alhashor';

// A rounded rectangle path (ctx.roundRect is not in every browser we serve).
function roundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Works out the card before it is drawn: wraps the saying with the very fonts and width it is drawn
// with and gives the height that contains all of it (header, saying, footer and their paddings).
// The width is always CARD_WIDTH; the height grows with the text, up to CARD_MAX_HEIGHT (a text
// longer than that is set smaller, and only then cut to an excerpt). `fonts` are CSS font-family lists
// (the fonts must be loaded first). Returns { width, height, fit }, `fit` being { fontSize, lines, text, excerpted }.
export function measureCard(ctx, { text, linkText, fonts, width = CARD_WIDTH }) {
  const measure = (line, size) => {
    ctx.font = `500 ${size}px ${fonts.read}`;
    return ctx.measureText(line).width;
  };
  const chrome = HEAD + TEXT_GAP + FOOTER + PAD;
  const box = { text, maxWidth: width - 2 * PAD, measure, lineHeight: LINE_HEIGHT, maxFont: FONT_SIZE, minFont: MIN_FONT_SIZE };
  let fit = fitText({ ...box, maxHeight: CARD_MAX_HEIGHT - chrome });
  if (fit.excerpted && linkText) fit = fitText({ ...box, maxHeight: CARD_MAX_HEIGHT - chrome - LINK_ROOM });
  const room = fit.excerpted && linkText ? LINK_ROOM : 0;
  const height = Math.max(MIN_HEIGHT, Math.ceil(chrome + fit.lines.length * fit.fontSize * LINE_HEIGHT + room));
  return { width, height, fit };
}

// Draws the quote card on a 2D canvas context: the book badge and name, the whole hadis text wrapped by
// measured words, the citation and the site name. The canvas must already be `layout.width` x
// `layout.height` (from measureCard, which is worked out here when not given), as resizing a canvas
// erases it. `fonts` are CSS font-family lists for the reading, interface and Latin fonts.
// Returns { fontSize, lines, text, excerpted, width, height }: what was drawn.
export function drawCard(ctx, { layout: given, badge, bookName, text, citationText, linkText, fonts, colour }) {
  const { width, height, fit } = given ?? measureCard(ctx, { text, linkText, fonts });
  const palette = cardPalette(colour);
  const readFont = (size) => `500 ${size}px ${fonts.read}`;
  const uiFont = (weight, size) => `${weight} ${size}px ${fonts.ui}`;
  const latFont = (weight, size) => `${weight} ${size}px ${fonts.lat}, ${fonts.ui}`;

  // Paper and frame
  const paper = ctx.createLinearGradient(0, 0, 0, height);
  paper.addColorStop(0, palette.bg);
  paper.addColorStop(1, palette.bg2);
  ctx.fillStyle = paper;
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = palette.line;
  ctx.lineWidth = 3;
  roundedRect(ctx, 28, 28, width - 56, height - 56, 40);
  ctx.stroke();

  // Big quotation mark, faint, top right
  ctx.save();
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = palette.accent;
  ctx.font = latFont(700, 280);
  ctx.textAlign = 'right';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('“', width - PAD, PAD + 190);
  ctx.restore();

  // Header: badge and book name
  ctx.fillStyle = palette.accent;
  roundedRect(ctx, PAD, PAD, BADGE, BADGE, 30);
  ctx.fill();
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  ctx.fillStyle = palette.onAccent;
  ctx.font = uiFont(700, 46);
  ctx.fillText(badge, PAD + BADGE / 2, PAD + BADGE / 2);
  ctx.textAlign = 'left';
  ctx.fillStyle = palette.ink;
  ctx.font = uiFont(700, 46);
  ctx.fillText(bookName, PAD + BADGE + 28, PAD + BADGE / 2);

  // The saying: the card is as tall as it needs, so it starts at the top and nothing is cut.
  const lineHeight = fit.fontSize * LINE_HEIGHT;
  const footerTop = height - PAD - FOOTER;
  const bottom = footerTop - TEXT_GAP;
  ctx.font = readFont(fit.fontSize);
  ctx.fillStyle = palette.ink;
  fit.lines.forEach((line, index) => ctx.fillText(line, PAD, HEAD + index * lineHeight + lineHeight / 2));

  if (fit.excerpted && linkText) {
    ctx.font = uiFont(600, 30);
    ctx.fillStyle = palette.muted;
    ctx.fillText(`সম্পূর্ণ হাদীস: ${linkText}`, PAD, bottom - 12);
  }

  // Footer: a rule, the citation and the site name
  ctx.strokeStyle = palette.line;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(PAD, footerTop);
  ctx.lineTo(width - PAD, footerTop);
  ctx.stroke();
  ctx.fillStyle = palette.ink;
  ctx.font = uiFont(600, 40);
  ctx.fillText(citationText, PAD, footerTop + 48);
  ctx.fillStyle = palette.muted;
  ctx.font = latFont(700, 32);
  ctx.fillText(SITE_NAME, PAD, footerTop + 104);

  return { fontSize: fit.fontSize, lines: fit.lines, text: fit.text, excerpted: fit.excerpted, width, height };
}
