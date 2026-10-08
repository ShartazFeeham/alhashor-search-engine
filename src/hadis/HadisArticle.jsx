'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useMemo } from 'react';
import { stripChain } from '../lib/hadisCore';
import { normalizeQuery } from '../search/searchIndex';
import { buildWordMatcher, highlightParts } from '../lib/matchPattern';
import { splitHadis, wordCount } from '../lib/hadisText';
import { shareHref, textWithCitation } from '../lib/share';
import { citationOf } from '../daily/citation';
import { useDigits } from '../lib/useDigits';
import BookBadge from '../ui/BookBadge';
import Icon from '../ui/Icon';
import ShareButton from '../share/ShareButton';
import { permanentUrl, useCopy } from '../share/useShare';
import ReadingProgress from './ReadingProgress';

// Every block is a card of its own: the header (with the breadcrumb handed in as `crumbs`), the
// narrator chain, the reading text with its progress info, and the actions. The daily page uses
// it too: it hands in its own `crumbs` line (the date), `headingLevel` 2 (the page has the h1),
// a `label` for the article and a first action (`lead`), and `coreOnly`, which shows the saying
// without its chain of narrators.
export default function HadisArticle({ book, number, text, id, crumbs, headingLevel = 1, label, lead, coreOnly = false, term = '' }) {
  const Heading = `h${headingLevel}`;
  const digits = useDigits();
  const copyText = useCopy();
  const [open, setOpen] = useState(false);
  const split = splitHadis(text);
  // `coreOnly` (the daily page): the saying alone, with no chain block; copy and share keep the full text
  const chain = coreOnly ? '' : split.chain;
  const { summary } = split;
  const body = coreOnly ? stripChain(text).core : split.body;

  // The words of the page the reader came from (?q=) are bolded, as in the similar-hadis list.
  const parts = useMemo(() => highlightParts(body, buildWordMatcher(normalizeQuery(term))), [body, term]);

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
        <p className="hadis-read">
          {parts.map((part, index) => (part.match ? <strong key={index} className="related-match">{part.text}</strong> : part.text))}
        </p>
      </div>

      <div className="hadis-actions hadis-card">
        {lead}
        <button type="button" className="act-btn act-copy" onClick={() => copy(textWithCitation(text, citationOf(book, number, digits)))}>
          <Icon name="copy" size={16} />
          <span>কপি</span>
        </button>
        <button type="button" className="act-btn act-link" onClick={() => copy(permanentUrl(book.id, number), 'লিংক কপি করা হয়েছে')}>
          <Icon name="link" size={16} />
          <span>লিংক<span className="act-more"> কপি</span></span>
        </button>
        <ShareButton book={book} number={number} text={text} />
        <Link href={shareHref(book.id, number)} className="act-btn act-image">
          <Icon name="image" size={16} />
          <span>ছবি<span className="act-more"> বানান</span></span>
        </Link>
      </div>
    </article>
  );
}
