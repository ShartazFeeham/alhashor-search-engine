'use client';

import { useEffect, useRef, useState } from 'react';
import { CARD_COLOURS, CARD_SIZES } from '../lib/cardLayout';
import { cleanText, excerptFor, shortLink } from '../lib/share';
import { drawCard } from './drawCard';
import { permanentUrl } from './useShare';

// The CSS font lists of the three site fonts. next/font gives them generated names, which it
// publishes as the custom properties --f-read, --f-ui and --f-lat on the page.
function fontFamilies() {
  const style = getComputedStyle(document.documentElement);
  const pick = (name, fallback) => style.getPropertyValue(name).trim() || fallback;
  return {
    read: `${pick('--f-read', '"Noto Serif Bengali"')}, serif`,
    ui: `${pick('--f-ui', '"Hind Siliguri"')}, sans-serif`,
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
    document.fonts.load(`600 40px ${fonts.ui}`, 'বুখারী'),
    document.fonts.load(`700 40px ${fonts.ui}`, 'বুখারী'),
    document.fonts.load(`700 40px ${fonts.lat}`, 'BoiKotha'),
  ]);
}

// The quote card of one hadis, drawn in the browser on a canvas (no outside library or request).
// `canvasRef` gives the parent the canvas, for saving or sharing the picture. `onDrawn` is called
// with what was drawn ({ fontSize, lines, text, excerpted }) after each drawing.
export default function QuoteCard({ book, number, text, ratio = 'square', citationText, canvasRef, onDrawn }) {
  const ownRef = useRef(null);
  const ref = canvasRef ?? ownRef;
  const drawn = useRef(onDrawn);
  drawn.current = onDrawn;
  const clean = cleanText(text);
  const size = CARD_SIZES[ratio] ?? CARD_SIZES.square;
  // What is on the card, for screen readers (the excerpt when the text is long).
  const [shown, setShown] = useState(() => excerptFor(clean, 450));

  useEffect(() => {
    let cancelled = false;
    const fonts = fontFamilies();
    loadFonts(fonts, clean).then(() => {
      const ctx = cancelled ? null : ref.current?.getContext('2d');
      if (!ctx) return;
      const result = drawCard(ctx, {
        ...size,
        badge: book.badge,
        bookName: book.full,
        text: clean,
        citationText,
        linkText: shortLink(permanentUrl(book.id, number)),
        fonts,
        colour: CARD_COLOURS[book.id],
      });
      setShown(result.text);
      drawn.current?.(result);
    });
    return () => {
      cancelled = true;
    };
  }, [book, number, clean, citationText, size, ref]);

  return (
    <canvas
      ref={ref}
      className="share-canvas"
      width={size.width}
      height={size.height}
      role="img"
      aria-label={`${shown}. ${citationText}`}
    />
  );
}
