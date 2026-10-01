'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { bookHref, checkJump, pageOfNumber, parseJump } from '../lib/bookBrowse';
import { neighbours } from '../lib/hadisRoute';
import { useDigits } from '../lib/useDigits';
import Button from '../ui/Button';
import Chip from '../ui/Chip';

const EXAMPLES = ['বুখারী ১২৩৪', 'মুসলিম ১০৬৯', 'তিরমিযী ৯৮৭'];

// "বুখারী ১২৩৪" (or just "১২৩৪" for the open book) goes to that book's page and points at the hadis.
// What cannot be opened is explained: unreadable text, a number past the end, a number with no file.
export default function JumpBox({ book }) {
  const router = useRouter();
  const digits = useDigits();
  const [text, setText] = useState('');
  const [problem, setProblem] = useState(null);

  function submit(event) {
    event.preventDefault();
    const target = parseJump(text, book);
    if (!target) {
      setProblem({ kind: 'unreadable' });
      return;
    }
    const check = checkJump(target.book, target.number);
    if (!check.ok) {
      setProblem({ kind: check.reason, book: target.book, number: target.number, max: check.max });
      return;
    }
    setProblem(null);
    // The book page scrolls to the hadis itself, once it is on the page.
    router.push(bookHref(target.book, pageOfNumber(target.book, target.number), target.number), { scroll: false });
  }

  let message = null;
  if (problem?.kind === 'unreadable') {
    message = <p>গ্রন্থের নাম আর নম্বর লিখুন, যেমন: বুখারী ১২৩৪।</p>;
  } else if (problem?.kind === 'range') {
    message = <p>{`${problem.book.full}ে সর্বোচ্চ ${digits(problem.max)} নম্বর পর্যন্ত আছে।`}</p>;
  } else if (problem?.kind === 'gap') {
    const { prev, next } = neighbours(problem.book, problem.number);
    const link = (number) => (
      <Link key={number} href={bookHref(problem.book, pageOfNumber(problem.book, number), number)}>
        হাদীস নং {digits(number)}
      </Link>
    );
    message = (
      <p>
        {`${problem.book.full}ে ${digits(problem.number)} নম্বরের কোনো হাদীস নেই।`}
        {(prev || next) && ' কাছের হাদীস: '}
        {prev && link(prev)}
        {prev && next && ', '}
        {next && link(next)}
      </p>
    );
  }

  return (
    <section className="books-jump" aria-labelledby="books-jump-title">
      <h2 className="h3" id="books-jump-title">নম্বরে যান</h2>
      <form className="books-jump-form" onSubmit={submit} autoComplete="off">
        <input
          type="text"
          lang="bn"
          value={text}
          onChange={(event) => {
            setText(event.target.value);
            setProblem(null);
          }}
          placeholder="যেমন: বুখারী ১২৩৪"
          aria-label="হাদীস নম্বরে যান"
        />
        <Button variant="primary" size="sm" type="submit">যান</Button>
      </form>
      <div className="books-jump-msg" role="status">{message}</div>
      <div className="books-jump-examples">
        {EXAMPLES.map((example) => (
          <Chip key={example} onClick={() => setText(example)}>{example}</Chip>
        ))}
      </div>
    </section>
  );
}
