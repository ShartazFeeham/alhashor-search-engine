// "সহীহ বুখারী, হাদীস নং ১,২৩৪": the full citation used on the daily page and plans.
export const citationOf = (book, number, digits) => (book.kind === 'tafsir' ? `${book.cite}, ${digits(number)}` : `${book.cite}, হাদীস নং ${digits(number)}`);
