import { BOOKS as LIB_BOOKS } from "../lib/books";

// Adapter for the old Books page (removed in Phase 3): the old names, totals and gaps, taken
// from the single book list in src/lib/books.js.
export const BOOKS = LIB_BOOKS.map((book) => ({
    code: book.code,
    name: book.legacyName,
    total: book.total,
    missing: book.missing,
}));

// The hadis numbers of a book that exist, in order.
export function hadisNumbers(book) {
    const numbers = [];
    let skipIndex = 0;
    for (let number = 1; number <= book.total; number++) {
        while (skipIndex < book.missing.length && book.missing[skipIndex][1] < number) skipIndex++;
        const gap = book.missing[skipIndex];
        if (gap && number >= gap[0] && number <= gap[1]) continue;
        numbers.push(number);
    }
    return numbers;
}
