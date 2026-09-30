import { BOOKS } from './books';
import { parseTag } from './hadisRoute';

export function countByBook(tags) {
  const counts = Object.fromEntries(BOOKS.map((book) => [book.id, 0]));
  for (const tag of tags) {
    const parsed = parseTag(tag);
    if (parsed) counts[parsed.book.id] += 1;
  }
  return counts;
}

export function filterByBook(tags, bookId) {
  if (bookId === 'all') return tags;
  return tags.filter((tag) => parseTag(tag)?.book.id === bookId);
}
