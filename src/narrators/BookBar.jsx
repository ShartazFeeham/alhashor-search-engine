import { BOOKS } from '../lib/books';

// A thin bar split by book (each book's own colour, in proportion to its count): a glance at where
// a narrator's hadis are. By default decoration only: the counts are in the text next to it. With
// `labelOf(book, count)` (the home page) each segment is an image named by that text, and
// `onTip(book | null)` hears the pointer (or a touch) enter and leave a segment, for a tooltip.
export default function BookBar({ perBook, labelOf, onTip }) {
  return (
    <span className="narr-bar" aria-hidden={labelOf ? undefined : 'true'} data-testid="narrator-bar">
      {BOOKS.filter((book) => perBook[book.id] > 0).map((book) => (
        <i
          key={book.id}
          style={{ flexGrow: perBook[book.id], background: `var(${book.colorVar})` }}
          {...(labelOf && { role: 'img', 'aria-label': labelOf(book, perBook[book.id]), 'data-book': book.id })}
          {...(onTip && { onPointerEnter: (event) => onTip(book, event.currentTarget), onPointerLeave: () => onTip(null) })}
        />
      ))}
    </span>
  );
}
