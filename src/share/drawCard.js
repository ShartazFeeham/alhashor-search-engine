import { cardPalette, fitText } from '../lib/cardLayout';

const PAD = 88;
const BADGE = 96;
const FOOTER = 150; // the rule, the citation and the site name
const LINE_HEIGHT = 1.75;
const LINK_ROOM = 64; // the "full hadis" line under an excerpt
const SITE_NAME = 'Alhashor · বইকথা';

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

// Draws the quote card on a 2D canvas context: the book badge and name, the hadis text wrapped by
// measured words (a long one cut to an excerpt), the citation and the site name.
// `fonts` are CSS font-family lists for the reading, interface and Latin fonts. The fonts must
// be loaded before this is called, or the text is measured and drawn in a fallback font.
// Returns { fontSize, lines, text, excerpted }: what was drawn.
export function drawCard(ctx, { width, height, badge, bookName, text, citationText, linkText, fonts, colour }) {
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

  // The saying
  const top = PAD + BADGE + 64;
  const bottom = height - PAD - FOOTER - 24;
  const measure = (line, size) => {
    ctx.font = readFont(size);
    return ctx.measureText(line).width;
  };
  const box = { text, maxWidth: width - 2 * PAD, measure, lineHeight: LINE_HEIGHT };
  let fit = fitText({ ...box, maxHeight: bottom - top });
  if (fit.excerpted && linkText) fit = fitText({ ...box, maxHeight: bottom - top - LINK_ROOM });
  const lineHeight = fit.fontSize * LINE_HEIGHT;
  const area = bottom - top - (fit.excerpted && linkText ? LINK_ROOM : 0);
  const first = top + Math.max(0, (area - fit.lines.length * lineHeight) / 2);
  ctx.font = readFont(fit.fontSize);
  ctx.fillStyle = palette.ink;
  fit.lines.forEach((line, index) => ctx.fillText(line, PAD, first + index * lineHeight + lineHeight / 2));

  if (fit.excerpted && linkText) {
    ctx.font = uiFont(600, 30);
    ctx.fillStyle = palette.muted;
    ctx.fillText(`সম্পূর্ণ হাদীস: ${linkText}`, PAD, bottom - 12);
  }

  // Footer: a rule, the citation and the site name
  const footerTop = height - PAD - FOOTER;
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

  return { fontSize: fit.fontSize, lines: fit.lines, text: fit.text, excerpted: fit.excerpted };
}
