'use client';

import Link from 'next/link';
import { useState } from 'react';
import PageTitle from '../Helpers/PageTitle';
import { checkJump, parseJump } from '../lib/bookBrowse';
import { formatDate } from '../lib/bnDate';
import { dailyHref } from '../lib/dailyRoute';
import { tagOf } from '../lib/hadisRoute';
import { splitHadis } from '../lib/hadisText';
import { MAX_ITEMS } from '../lib/khutbahList';
import { bookById } from '../lib/books';
import { useDigits } from '../lib/useDigits';
import { loadHadisText } from '../lib/useHadisText';
import { useSettings } from '../settings/SettingsProvider';
import Button from '../ui/Button';
import Chip from '../ui/Chip';
import Icon from '../ui/Icon';
import { useToast } from '../ui/Toast';
import { citationOf } from './citation';
import KhutbahItem from './KhutbahItem';
import { useKhutbahList } from './useKhutbahList';
import { useToday } from './useToday';

const EXAMPLES = ['বুখারী ১২৩৪', 'মুসলিম ১০৬৯', 'তিরমিযী ৯৮৭'];

// খুতবার তালিকা: pick hadis by number (or from the daily and plan lists), reorder them, and
// print the sheet. The list is in the address, so a link is a saved list.
export default function KhutbahSection() {
  const { items, add, remove, move } = useKhutbahList();
  const digits = useDigits();
  const toast = useToast();
  const { settings } = useSettings();
  const today = useToday();
  const [text, setText] = useState('');
  const [message, setMessage] = useState('');
  const [paper, setPaper] = useState(false);

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
    const status = add({ bookId: book.id, number });
    if (status === 'added') {
      setMessage(`${citationOf(book, number, digits)} যোগ হয়েছে।`);
      setText('');
    } else if (status === 'duplicate') {
      setMessage('এই হাদীসটি তালিকায় আগেই আছে।');
    } else if (status === 'full') {
      setMessage(`তালিকায় ${digits(MAX_ITEMS)}টির বেশি হাদীস রাখা যায় না।`);
    }
  }

  const copy = (value, done) =>
    Promise.resolve(navigator.clipboard?.writeText(value)).then(
      () => toast(done),
      () => toast('কপি করা যায়নি')
    );

  async function copyText() {
    const loaded = await Promise.all(items.map((item) => loadHadisText(tagOf(item.bookId, item.number))));
    const entries = items.map((item, index) => {
      const result = loaded[index];
      let line = `${digits(index + 1)}।`;
      if (result.status === 'ok') {
        const { chain, body } = splitHadis(result.text);
        line += ` ${`${chain} ${body}`.trim()}`;
      }
      return `${line}\n— ${citationOf(bookById(item.bookId), item.number, digits)}`;
    });
    copy(`খুতবার হাদীস তালিকা\n\n${entries.join('\n\n')}`, 'কপি করা হয়েছে');
  }

  const copyLink = () => copy(`${window.location.origin}${dailyHref({ tab: 'khutbah', items })}`, 'লিঙ্ক কপি করা হয়েছে');

  const dateText = today ? formatDate(today, settings.digits) : '';
  const empty = items.length === 0;

  return (
    <>
      <PageTitle parts={['খুতবার তালিকা']} />
      <section className="khut-add no-print" aria-labelledby="khut-add-title">
        <h2 className="h3" id="khut-add-title">হাদীস যোগ করুন</h2>
        <form className="khut-add-form" onSubmit={submit} autoComplete="off">
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
        <div className="khut-add-msg" role="status" aria-label="যোগ করার ফল">{message}</div>
        <div className="khut-add-examples">
          {EXAMPLES.map((example) => (
            <Chip key={example} onClick={() => setText(example)}>{example}</Chip>
          ))}
        </div>
        <p className="tiny">
          অথবা <Link href={dailyHref({ tab: 'today', items })}>আজকের হাদীস</Link> ও{' '}
          <Link href={dailyHref({ tab: 'plans', items })}>পরিকল্পনা</Link> থেকে যোগ করুন। তালিকাটি এই পাতার ঠিকানাতেই থাকে, তাই লিঙ্কটি রেখে দিলেই তালিকা রাখা হয়।
        </p>
      </section>

      <div className="khut-bar no-print">
        <span className="tag">{digits(items.length)}টি বাছা</span>
        <Button size="sm" onClick={copyText} disabled={empty}><Icon name="copy" size={16} />লেখা কপি করুন</Button>
        <Button size="sm" onClick={copyLink} disabled={empty}><Icon name="link" size={16} />লিঙ্ক কপি করুন</Button>
        <Button size="sm" onClick={() => setPaper((on) => !on)} aria-pressed={paper}>ছাপার দৃশ্য</Button>
        <Button size="sm" variant="primary" onClick={() => window.print()} disabled={empty}><Icon name="print" size={16} />ছাপুন</Button>
      </div>

      <section className={paper ? 'khut-sheet is-paper' : 'khut-sheet'} aria-labelledby="khut-sheet-title">
        <header className="khut-sheet-head">
          <h2 id="khut-sheet-title">খুতবার হাদীস তালিকা</h2>
          {dateText && <p className="khut-date">{dateText}</p>}
        </header>
        {empty ? (
          <p className="khut-empty">কোনো হাদীস বাছা হয়নি</p>
        ) : (
          <ol className="khut-list" aria-label="খুতবার হাদীস">
            {items.map((item, index) => (
              <KhutbahItem
                key={`${item.bookId}-${item.number}`}
                position={index}
                last={index === items.length - 1}
                item={item}
                onMove={(delta) => move(index, delta)}
                onRemove={() => remove(index)}
              />
            ))}
          </ol>
        )}
        <footer className="khut-foot">BoiKotha · বইকথা{dateText && ` · ${dateText}`}</footer>
      </section>
    </>
  );
}
