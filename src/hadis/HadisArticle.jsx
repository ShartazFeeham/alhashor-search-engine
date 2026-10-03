'use client';

import Link from 'next/link';
import { useState } from 'react';
import { stripChain } from '../lib/hadisCore';
import { splitHadis, wordCount } from '../lib/hadisText';
import { shareHref } from '../lib/share';
import { useDigits } from '../lib/useDigits';
import BookBadge from '../ui/BookBadge';
import Button from '../ui/Button';
import Icon from '../ui/Icon';
import ShareButton from '../share/ShareButton';
import { permanentUrl, useCopy } from '../share/useShare';
import ReadingProgress from './ReadingProgress';

// Every block is a card of its own: the header (with the breadcrumb handed in as `crumbs`), the
// narrator chain, the reading text with its progress info, and the actions. The daily page uses
// it too: it hands in its own `crumbs` line (the date), `headingLevel` 2 (the page has the h1),
// a `label` for the article and a first action (`lead`), and `coreOnly`, which shows the saying
// without its chain of narrators.
export default function HadisArticle({ book, number, text, id, crumbs, headingLevel = 1, label, lead, coreOnly = false }) {
  const Heading = `h${headingLevel}`;
  const digits = useDigits();
  const copyText = useCopy();
  const [open, setOpen] = useState(false);
  const split = splitHadis(text);
  // `coreOnly` (the daily page): the saying alone, with no chain block; copy and share keep the full text
  const chain = coreOnly ? '' : split.chain;
  const { summary } = split;
  const body = coreOnly ? stripChain(text).core : split.body;

  const copy = (value, message) => copyText(value, message);

  return (
    <article className="hadis-article" id={id} aria-label={label}>
      <header className="hadis-head hadis-card">
        {crumbs}
        <div className="hadis-title">
          <BookBadge bookId={book.id} />
          <Heading>{book.full} - হাদীস নং {digits(number)}</Heading>
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
        <ReadingProgress words={wordCount(coreOnly ? body : text)} targetId={id} />
        <p className="hadis-read">{body}</p>
      </div>

      <div className="hadis-actions hadis-card">
        {lead}
        <Button size="sm" variant="ghost" onClick={() => copy(text)}><Icon name="copy" size={16} />কপি</Button>
        <Button size="sm" variant="ghost" onClick={() => copy(`${book.cite}, হাদীস নং ${digits(number)}`)}>উদ্ধৃতি কপি</Button>
        <Button size="sm" variant="ghost" onClick={() => copy(permanentUrl(book.id, number), 'লিংক কপি করা হয়েছে')}><Icon name="link" size={16} />লিংক কপি</Button>
        <ShareButton book={book} number={number} text={text} />
        <Link href={shareHref(book.id, number)} className="ui-btn ghost sm">ছবি বানান</Link>
      </div>
    </article>
  );
}
