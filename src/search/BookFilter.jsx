'use client';

import { BOOKS } from '../lib/books';
import { useDigits } from '../lib/useDigits';
import Chip from '../ui/Chip';

// "All" and one chip per book, each with how many of the search's hadis it holds.
export default function BookFilter({ counts, selected, onSelect }) {
  const digits = useDigits();
  const total = Object.values(counts).reduce((sum, n) => sum + n, 0);
  return (
    <div className="search-filters" role="group" aria-label="বই অনুযায়ী ছাঁকুন">
      <Chip pressed={selected === 'all'} onClick={() => onSelect('all')}>
        সব <span className="search-count-n">{digits(total)}</span>
      </Chip>
      {BOOKS.map((book) => (
        <Chip
          key={book.id}
          pressed={selected === book.id}
          dot={`var(${book.colorVar})`}
          disabled={counts[book.id] === 0}
          onClick={() => onSelect(book.id)}
        >
          {book.name} <span className="search-count-n">{digits(counts[book.id])}</span>
        </Chip>
      ))}
    </div>
  );
}
