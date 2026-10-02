'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import PageTitle from '../Helpers/PageTitle';
import { citationOf } from '../daily/citation';
import { checkJump, parseJump } from '../lib/bookBrowse';
import { compareTexts, textFor } from '../lib/compareDiff';
import { MAX_COMPARE, addId, compareHref, idOf, parseIds, removeId, serializeIds, splitId } from '../lib/compareList';
import { useDigits } from '../lib/useDigits';
import Button from '../ui/Button';
import Chip from '../ui/Chip';
import Icon from '../ui/Icon';
import CompareColumn from './CompareColumn';
import { useCompare } from './CompareProvider';
import { useCompareTexts } from './useCompareTexts';

const FULL_MESSAGE = `সর্বোচ্চ ৪টি হাদীস তুলনা করা যায়।`;

// /compare?ids=bukhari-1234,muslim-5: two to four hadis side by side, with the words no other
// hadis has marked. The address is the whole state, so a link is a saved comparison; with no ids
// in it, the hadis chosen elsewhere on the site (held by CompareProvider) are used.
export default function ComparePage() {
  const params = useSearchParams();
  const router = useRouter();
  const digits = useDigits();
  const { ready, setAll, getAll, clear } = useCompare();
  const rawIds = params.get('ids');
  const ids = useMemo(() => parseIds(rawIds), [rawIds]);
  const chain = params.get('chain') === '1';
  const { texts, retry } = useCompareTexts(ids);
  const [text, setText] = useState('');
  const [message, setMessage] = useState('');

  // The address and the choice kept for the floating bar are one list. An address with ids is
  // the truth; an address with none borrows the choice (this is how the "তুলনা" links arrive).
  useEffect(() => {
    if (!ready) return;
    const chosen = getAll();
    if (ids.length > 0) {
      if (serializeIds(chosen) !== serializeIds(ids)) setAll(ids);
    } else if (chosen.length > 0) {
      router.replace(compareHref(chosen, { chain }), { scroll: false });
    }
  }, [ready, ids, chain, getAll, setAll, router]);

  const go = (next, nextChain = chain) => {
    setAll(next);
    router.replace(compareHref(next, { chain: nextChain }), { scroll: false });
  };

  function submit(event) {
    event.preventDefault();
    const target = parseJump(text);
    if (!target) {
      setMessage('গ্রন্থের নাম আর নম্বর লিখুন, যেমন: বুখারী ১২৩৪।');
      return;
    }
    const { book, number } = target;
    const check = checkJump(book, number);
    if (!check.ok) {
      setMessage(
        check.reason === 'range'
          ? `${book.full}ে সর্বোচ্চ ${digits(check.max)} নম্বর পর্যন্ত আছে।`
          : `${book.full}ে ${digits(number)} নম্বরের কোনো হাদীস নেই।`
      );
      return;
    }
    const result = addId(ids, idOf(book.id, number));
    if (result.status === 'added') {
      go(result.ids);
      setMessage(`${citationOf(book, number, digits)} যোগ হয়েছে।`);
      setText('');
    } else if (result.status === 'duplicate') {
      setMessage('এই হাদীসটি তুলনায় আগেই আছে।');
    } else if (result.status === 'full') {
      setMessage(FULL_MESSAGE);
    }
  }

  // Compare only once every text has settled; hadis that were not found are left out of the comparison.
  const diffs = useMemo(() => {
    if (ids.some((id) => texts[id].status === 'loading')) return {};
    const readable = ids.filter((id) => texts[id].status === 'ok');
    if (readable.length < 2) return {};
    const columns = compareTexts(readable.map((id) => textFor(texts[id].text, { chain })));
    return Object.fromEntries(readable.map((id, index) => [id, columns[index]]));
  }, [ids, texts, chain]);
  const comparing = Object.keys(diffs).length > 0;
  const unrelated = comparing && Object.values(diffs).some((column) => column.unrelated);

  const empty = ids.length === 0;
  return (
    <main id="main" tabIndex={-1} className="screen cmp">
      <PageTitle parts={['হাদীস তুলনা']} />
      <header className="cmp-head">
        <h1 className="h1">হাদীস তুলনা</h1>
        <p className="muted">২ থেকে ৪টি হাদীস পাশাপাশি রেখে আলাদা শব্দ চিহ্নিত করুন। ঠিকানাটি রেখে দিলেই তুলনাটি রাখা হয়।</p>
      </header>

      <section className="cmp-add no-print" aria-labelledby="cmp-add-title">
        <h2 className="h3" id="cmp-add-title">তুলনার হাদীস ({digits(ids.length)}/{digits(MAX_COMPARE)})</h2>
        <form className="cmp-add-form" onSubmit={submit} autoComplete="off">
          <input
            type="text"
            lang="bn"
            value={text}
            onChange={(event) => {
              setText(event.target.value);
              setMessage('');
            }}
            placeholder="যেমন: বুখারী ১২৩৪"
            aria-label="হাদীস যোগ করুন"
          />
          <Button variant="primary" size="sm" type="submit">যোগ করুন</Button>
        </form>
        <div className="cmp-add-msg" role="status" aria-label="যোগ করার ফল">{message}</div>
        <div className="cmp-tools">
          <Chip pressed={chain} onClick={() => router.replace(compareHref(ids, { chain: !chain }), { scroll: false })}>
            বর্ণনাকারীসহ
          </Chip>
          <Button size="sm" onClick={() => { clear(); router.replace('/compare', { scroll: false }); setMessage(''); }} disabled={empty}>
            <Icon name="x" size={16} />সব মুছুন
          </Button>
        </div>
        {unrelated && <p className="cmp-legend cmp-unrelated">এই হাদীসগুলোর মধ্যে শব্দের মিল খুব কম, তাই আলাদা শব্দ চিহ্নিত করা হয়নি।</p>}
        {comparing && !unrelated && (
          <p className="cmp-legend">
            <mark className="cmp-diff">এভাবে</mark> চিহ্নিত শব্দ অন্য হাদীসে নেই।
            {!chain && ' বর্ণনাকারীদের নাম ধরা হয়নি।'}
          </p>
        )}
      </section>

      {ids.length < 2 && (
        <div className="cmp-empty">
          <span className="cmp-empty-icon"><Icon name="cols" size={26} /></span>
          <b>{empty ? 'তুলনা করতে দুটি হাদীস যোগ করুন' : 'আরও একটি হাদীস যোগ করুন'}</b>
          <p>উপরের বাক্সে বই আর নম্বর লিখুন, অথবা যেকোনো হাদীসের পাশে "তুলনায় যোগ করুন" চাপুন।</p>
        </div>
      )}

      {!empty && (
        <div className="cmp-cols" data-count={ids.length}>
          {ids.map((id) => {
            const { book, number } = splitId(id);
            const result = texts[id];
            return (
              <CompareColumn
                key={id}
                book={book}
                number={number}
                result={result}
                column={diffs[id] ?? null}
                plainText={result.status === 'ok' ? textFor(result.text, { chain }) : ''}
                onRemove={() => go(removeId(ids, id))}
                onRetry={retry}
              />
            );
          })}
        </div>
      )}
    </main>
  );
}
