'use client';

import { useEffect, useRef, useState } from 'react';
import { CARD_COLOURS, CARD_WIDTH } from '../lib/cardLayout';
import { cleanText, excerptFor, shortLink } from '../lib/share';
import { drawCard, measureCard } from './drawCard';
import { permanentUrl } from './useShare';

// The CSS font lists of the three site fonts. next/font gives them generated names, which it
// publishes as the custom properties --f-read, --f-ui and --f-lat on the page.
function fontFamilies() {
  const style = getComputedStyle(document.documentElement);
  const pick = (name, fallback) => style.getPropertyValue(name).trim() || fallback;
  // The digit font (the ten Bengali digits only) comes first in every list that can draw a digit, as in
  // the page's body font stack: the interface font draws the digits at uneven heights.
  const digits = pick('--f-digits', '"Noto Serif Bengali"');
  return {
    digits,
    read: `${digits}, ${pick('--f-read', '"Noto Serif Bengali"')}, serif`,
    ui: `${digits}, ${pick('--f-ui', '"Hind Siliguri"')}, sans-serif`,
    lat: `${pick('--f-lat', '"Plus Jakarta Sans"')}, sans-serif`,
  };
}

// A canvas measures and draws with a font only once it has loaded, and a page loads a font only
// when something shows it. So the card asks for its fonts and waits for them first. A font that
// fails to load is not fatal: the card is drawn in the fallback.
async function loadFonts(fonts, text) {
  if (!document.fonts?.load) return;
  await Promise.allSettled([
    document.fonts.load(`500 40px ${fonts.read}`, text.slice(0, 60) || 'আ'),
    // the digit font at each weight the picture draws (saying 500, citation 600, book name 700)
    ...[500, 600, 700].map((weight) => document.fonts.load(`${weight} 40px ${fonts.digits}`, '০১২৩৪৫৬৭৮৯')),
    document.fonts.load(`600 40px ${fonts.ui}`, 'বুখারী'),
    document.fonts.load(`700 40px ${fonts.ui}`, 'বুখারী'),
    document.fonts.load(`700 40px ${fonts.lat}`, 'Alhashor'),
  ]);
}

// The quote card of one hadis, drawn in the browser on a canvas (no outside library or request).
// It is always CARD_WIDTH wide; its height is measured from the wrapped text, so the whole hadis is on it.
// `canvasRef` gives the parent the canvas, for saving or sharing the picture. `onDrawn` is called
// with what was drawn ({ fontSize, lines, text, excerpted, width, height }) after each drawing.
export default function QuoteCard({ book, number, text, citationText, canvasRef, onDrawn }) {
  const ownRef = useRef(null);
  const ref = canvasRef ?? ownRef;
  const drawn = useRef(onDrawn);
  drawn.current = onDrawn;
  const clean = cleanText(text);
  // What is on the card, for screen readers (its first 450 characters when the text is long: the whole hadis is on its page).
  const [shown, setShown] = useState(() => excerptFor(clean, 450));

  useEffect(() => {
    let cancelled = false;
    const fonts = fontFamilies();
    loadFonts(fonts, clean).then(() => {
      const ctx = cancelled ? null : ref.current?.getContext('2d');
      if (!ctx) return;
      const canvas = ref.current;
      const linkText = shortLink(permanentUrl(book.id, number));
      // Measure first: the height is set on the canvas (which erases it) before anything is drawn.
      const layout = measureCard(ctx, { text: clean, linkText, fonts });
      if (canvas.width !== layout.width) canvas.width = layout.width;
      canvas.height = layout.height;
      const result = drawCard(ctx, {
        layout,
        badge: book.badge,
        bookName: book.full,
        text: clean,
        citationText,
        linkText,
        fonts,
        colour: CARD_COLOURS[book.id],
      });
      setShown(excerptFor(result.text, 450));
      drawn.current?.(result);
    });
    return () => {
      cancelled = true;
    };
  }, [book, number, clean, citationText, ref]);

  return (
    <canvas
      ref={ref}
      className="share-canvas"
      width={CARD_WIDTH}
      height={CARD_WIDTH} // only the first guess: the height is set from the measured text, never by React
      role="img"
      aria-label={`${shown}. ${citationText}`}
    />
  );
}
