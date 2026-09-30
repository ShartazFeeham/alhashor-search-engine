import { bookById } from '../lib/books';

// A rounded square in the book's colour holding its one or two letters.
export default function BookBadge({ bookId, size }) {
  const book = bookById(bookId);
  if (!book) return null;
  return (
    <span className={size === 'sm' ? 'ui-badge sm' : 'ui-badge'} style={{ '--bk': `var(${book.colorVar})` }}>
      {book.badge}
    </span>
  );
}
