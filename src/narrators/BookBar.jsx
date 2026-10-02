import { BOOKS } from '../lib/books';

// A thin bar split by book (each book's own colour, in proportion to its count): a glance at where
// a narrator's hadis are. Decoration only: the counts are in the text next to it.
export default function BookBar({ perBook }) {
  return (
    <span className="narr-bar" aria-hidden="true" data-testid="narrator-bar">
      {BOOKS.filter((book) => perBook[book.id] > 0).map((book) => (
        <i key={book.id} style={{ flexGrow: perBook[book.id], background: `var(${book.colorVar})` }} />
      ))}
    </span>
  );
}
