'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { bookHref, checkJump, pageOfNumber } from '../lib/bookBrowse';
import { toEnglishDigits } from '../lib/digits';
import { neighbours } from '../lib/hadisRoute';
import { useDigits } from '../lib/useDigits';
import Button from '../ui/Button';
import BookHead from './BookHead';

const WARNING_FOR = 3000; // how long "only digits" stays on screen

// The title band of the book page with the jump form at its right end. The box takes a whole number
// (Bangla or English digits) and goes to that hadis of the open book. What cannot be opened is
// explained: an empty box, a number past the end, a number with no file.
export default function JumpBox({ book }) {
  const router = useRouter();
  const digits = useDigits();
  const [text, setText] = useState('');
  const [problem, setProblem] = useState(null);
  const [warning, setWarning] = useState(false);

  useEffect(() => {
    if (!warning) return undefined;
    const timer = setTimeout(() => setWarning(false), WARNING_FOR);
    return () => clearTimeout(timer);
  }, [warning]);

  // Only digits get in (typed or pasted); anything else is dropped with a short warning.
  function change(event) {
    const value = event.target.value;
    const kept = value.replace(/[^০-৯0-9]/g, '');
    setText(kept);
    setProblem(null);
    setWarning(kept !== value);
  }

  function submit(event) {
    event.preventDefault();
    if (!text) {
      setProblem({ kind: 'empty' });
      return;
    }
    const number = Number(toEnglishDigits(text));
    const check = checkJump(book, number);
    if (!check.ok) {
      setProblem({ kind: check.reason, number, max: check.max });
      return;
    }
    setProblem(null);
    // The book page scrolls to the hadis itself, once it is on the page.
    router.push(bookHref(book, pageOfNumber(book, number), number), { scroll: false });
  }

  let message = null;
  if (problem?.kind === 'empty') {
    message = <p>একটি সংখ্যা লিখুন</p>;
  } else if (problem?.kind === 'range') {
    message = <p>{`${book.full}ে সর্বোচ্চ ${digits(problem.max)} নম্বর পর্যন্ত আছে।`}</p>;
  } else if (problem?.kind === 'gap') {
    const { prev, next } = neighbours(book, problem.number);
    const link = (number) => (
      <Link key={number} href={bookHref(book, pageOfNumber(book, number), number)}>
        হাদীস নং {digits(number)}
      </Link>
    );
    message = (
      <p>
        {`${book.full}ে ${digits(problem.number)} নম্বরের কোনো হাদীস নেই।`}
        {(prev || next) && ' কাছের হাদীস: '}
        {prev && link(prev)}
        {prev && next && ', '}
        {next && link(next)}
      </p>
    );
  }

  return (
    <div className="books-band">
      <BookHead book={book}>
        <form className="books-jump-form" onSubmit={submit} autoComplete="off">
          <input
            type="text"
            inputMode="numeric"
            value={text}
            onChange={change}
            placeholder="নম্বর"
            aria-label="হাদীস নম্বরে যান"
          />
          <Button variant="primary" size="sm" type="submit">যান</Button>
        </form>
      </BookHead>
      <div className="books-jump-msg" role="status">{message}</div>
      <div className="books-jump-warn" role="status">{warning && 'শুধু সংখ্যা লিখুন'}</div>
    </div>
  );
}
