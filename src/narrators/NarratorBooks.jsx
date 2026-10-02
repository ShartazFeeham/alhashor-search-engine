import { BOOKS } from '../lib/books';
import { useDigits } from '../lib/useDigits';

// The chosen narrator's hadis book by book: the book's name, the count, and a bar as long as the
// count is next to the narrator's largest book. Books with no hadis are left out. The number is
// text; the bar is decoration.
export default function NarratorBooks({ perBook }) {
  const digits = useDigits();
  const books = BOOKS.filter((book) => perBook[book.id] > 0);
  if (books.length === 0) return null;
  const largest = Math.max(...books.map((book) => perBook[book.id]));
  return (
    <ul className="narr-books" aria-label="বই অনুযায়ী হাদীস">
      {books.map((book) => (
        <li key={book.id}>
          <span className="narr-books-name">{book.name}</span>
          <span className="narr-books-n">{digits(perBook[book.id])}</span>
          <span className="narr-books-track" aria-hidden="true" data-testid="narrator-book-track">
            <i data-testid="narrator-book-fill" style={{ width: `${(perBook[book.id] / largest) * 100}%`, background: `var(${book.colorVar})` }} />
          </span>
        </li>
      ))}
    </ul>
  );
}
