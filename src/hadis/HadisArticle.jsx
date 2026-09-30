'use client';

import { useState } from 'react';
import { hadisHref } from '../lib/hadisRoute';
import { splitHadis } from '../lib/hadisText';
import { useDigits } from '../lib/useDigits';
import BookBadge from '../ui/BookBadge';
import Button from '../ui/Button';
import Icon from '../ui/Icon';
import { useToast } from '../ui/Toast';

export default function HadisArticle({ book, number, text, id }) {
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
      <header className="hadis-head">
        <BookBadge bookId={book.id} />
        <h1>{book.full} - হাদীস নং {digits(number)}</h1>
      </header>

      {chain && (
        <div className={open ? 'hadis-chain open' : 'hadis-chain'}>
          <button type="button" className="hadis-chain-toggle" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
            <span className="hadis-chain-label">বর্ণনায়:</span>
            <span className="hadis-chain-summary">{summary}</span>
            <Icon name="cd" size={18} />
          </button>
          {open && <p className="hadis-chain-full">{chain}</p>}
        </div>
      )}

      <p className="hadis-read">{body}</p>

      <div className="hadis-actions">
        <Button size="sm" variant="ghost" onClick={() => copy(text)}><Icon name="copy" size={16} />কপি</Button>
        <Button size="sm" variant="ghost" onClick={() => copy(`${book.cite}, হাদীস নং ${digits(number)}`)}>উদ্ধৃতি কপি</Button>
        <Button size="sm" variant="ghost" onClick={() => copy(`${window.location.origin}${href}`)}><Icon name="link" size={16} />লিংক কপি</Button>
      </div>
      <p className="hadis-permalink">স্থায়ী লিংক: <code>{href}</code></p>
    </article>
  );
}
