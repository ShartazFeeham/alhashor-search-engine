const SITE = 'Alhashor';
const HOME_TITLE = 'Alhashor - হাদীস সম্ভার';

// pageTitle() is the home title; pageTitle("হাদীস সার্চ") gives "হাদীস সার্চ - Alhashor".
// Empty parts are skipped, so pageTitle(query, "হাদীস সার্চ") works before anything is typed.
export function pageTitle(...parts) {
  const named = parts.filter(Boolean);
  return named.length > 0 ? [...named, SITE].join(' - ') : HOME_TITLE;
}

// Renders the page's <title>. React 19 hoists it into <head>, and because the layout sets no
// title of its own, nothing else can overwrite it (Next.js used to replace a title set from
// an effect with the layout's title about a millisecond later).
export default function PageTitle({ parts = [] }) {
  return <title>{pageTitle(...parts)}</title>;
}
