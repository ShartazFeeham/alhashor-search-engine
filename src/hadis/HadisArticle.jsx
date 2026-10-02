'use client';

import Link from 'next/link';
import { useState } from 'react';
import { hadisHref } from '../lib/hadisRoute';
import { splitHadis, wordCount } from '../lib/hadisText';
import { shareHref } from '../lib/share';
import { useDigits } from '../lib/useDigits';
import BookBadge from '../ui/BookBadge';
import Button from '../ui/Button';
import Icon from '../ui/Icon';
import ShareButton from '../share/ShareButton';
import { useToast } from '../ui/Toast';
import ReadingProgress from './ReadingProgress';

// Every block is a card of its own: the header (with the breadcrumb handed in as `crumbs`), the
// narrator chain, the reading text with its progress info, and the actions.
export default function HadisArticle({ book, number, text, id, crumbs }) {
  const digits = useDigits();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const { chain, body, summary } = splitHadis(text);
  const href = hadisHref(book.id, number);

  const copy = (value) => {
    Promise.resolve(navigator.clipboard?.writeText(value)).then(
      () => toast('কপি করা হয়েছে'),
      () => toast('কপি করা যায়নি')
    );
  };

  return (
    <article className="hadis-article" id={id}>
      <header className="hadis-head hadis-card">
        {crumbs}
        <div className="hadis-title">
          <BookBadge bookId={book.id} />
          <h1>{book.full} - হাদীস নং {digits(number)}</h1>
        </div>
      </header>

      {chain && (
        <div className={open ? 'hadis-chain hadis-card open' : 'hadis-chain hadis-card'}>
          <button type="button" className="hadis-chain-toggle" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
            <span className="hadis-chain-label">বর্ণনায়:</span>
            <span className="hadis-chain-summary">{summary}</span>
            <Icon name="cd" size={18} />
          </button>
          {open && <p className="hadis-chain-full">{chain}</p>}
        </div>
      )}

      <div className="hadis-reading hadis-card">
        <ReadingProgress words={wordCount(text)} targetId={id} />
        <p className="hadis-read">{body}</p>
      </div>

      <div className="hadis-actions hadis-card">
        <Button size="sm" variant="ghost" onClick={() => copy(text)}><Icon name="copy" size={16} />কপি</Button>
        <Button size="sm" variant="ghost" onClick={() => copy(`${book.cite}, হাদীস নং ${digits(number)}`)}>উদ্ধৃতি কপি</Button>
        <Button size="sm" variant="ghost" onClick={() => copy(`${window.location.origin}${href}`)}><Icon name="link" size={16} />লিংক কপি</Button>
        <ShareButton book={book} number={number} text={text} />
        <Link href={shareHref(book.id, number)} className="ui-btn ghost sm">ছবি বানান</Link>
      </div>
    </article>
  );
}
