// The filled, coloured icons of the home page's card row and the top bar. Each is a solid glyph in its own
// colour token (--qi-NAME in styles/tokens.css, at least 3:1 on the card in every theme). Home, search and
// books (top bar only) share one calm teal.
export const QUICK_ICON_COLORS = { heart: 'pink', speaker: 'blue', tag: 'green', clock: 'purple', home: 'teal', search: 'teal', book: 'teal' };

const WAVE = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' };

const GLYPHS = {
  home: <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />,
  search: (
    <>
      <circle cx="11" cy="11" r="6.2" fill="none" stroke="currentColor" strokeWidth="2.6" />
      <path d="m15.8 15.8 5 5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </>
  ),
  book: <path d="M12 6c-2-1.5-5-2-8-2v14c3 0 6 .5 8 2 2-1.5 5-2 8-2V4c-3 0-6 .5-8 2z" />,
  heart: <path d="M12 21.2 10.6 20C5.4 15.3 2 12.2 2 8.4 2 5.3 4.4 3 7.5 3c1.7 0 3.4.8 4.5 2.1C13.1 3.8 14.8 3 16.5 3 19.6 3 22 5.3 22 8.4c0 3.8-3.4 6.9-8.6 11.6z" />,
  speaker: (
    <>
      <path d="M3 9.5v5h4l5.5 4.5V5L7 9.5z" />
      <path data-wave="1" d="M15.6 9a4.2 4.2 0 0 1 0 6" {...WAVE} />
      <path data-wave="2" d="M18.4 6.2a8 8 0 0 1 0 11.6" {...WAVE} />
    </>
  ),
  tag: (
    <>
      <path d="M3 12V4h8l10 10-8 8z" />
      <circle cx="7.5" cy="8.5" r="1.5" fill="var(--surface)" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 7v5.2l3.4 2" fill="none" stroke="var(--surface)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
};

export default function QuickIcon({ kind, size = 24 }) {
  const glyph = GLYPHS[kind];
  if (!glyph) return null;
  return (
    <svg
      className="quick-icon"
      data-testid={`quick-icon-${kind}`}
      data-filled="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      style={{ color: `var(--qi-${QUICK_ICON_COLORS[kind]})` }}
      aria-hidden="true"
    >
      {glyph}
    </svg>
  );
}
