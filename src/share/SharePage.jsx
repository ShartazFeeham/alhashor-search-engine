'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import PageTitle from '../Helpers/PageTitle';
import { bookById } from '../lib/books';
import { hadisHref, tagOf } from '../lib/hadisRoute';
import { citation, shareText } from '../lib/share';
import { useDigits } from '../lib/useDigits';
import { useHadisText } from '../lib/useHadisText';
import { useSettings } from '../settings/SettingsProvider';
import BookBadge from '../ui/BookBadge';
import Button from '../ui/Button';
import Icon from '../ui/Icon';
import { useToast } from '../ui/Toast';
import QuoteCard from './QuoteCard';
import { permanentUrl, useCopy } from './useShare';

const canvasToBlob = (canvas) => new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));

// Whether this browser can share a picture file (a phone's share sheet can; most desktops cannot).
function canShareFiles() {
  try {
    if (typeof navigator.share !== 'function' || typeof navigator.canShare !== 'function') return false;
    return navigator.canShare({ files: [new File(['x'], 'card.png', { type: 'image/png' })] });
  } catch {
    return false;
  }
}

// /share/<book>/<number>: a preview of the quote card of a hadis, with buttons to save or share
// the picture and to copy its text, its link and its citation.
export default function SharePage({ bookId, number }) {
  const book = bookById(bookId);
  const digits = useDigits();
  const { settings } = useSettings();
  const toast = useToast();
  const copy = useCopy();
  const { status, text, retry } = useHadisText(tagOf(bookId, number));
  const canvasRef = useRef(null);
  const [drawn, setDrawn] = useState(null);
  const [fileShare, setFileShare] = useState(false);

  useEffect(() => setFileShare(canShareFiles()), []);

  const title = `${book.full} - হাদীস নং ${digits(number)}`;
  const cite = citation(book, number, settings.digits);
  const url = status === 'ok' ? permanentUrl(bookId, number) : '';
  const fileName = `alhashor-${bookId}-${number}.png`;

  const download = async () => {
    const blob = await canvasToBlob(canvasRef.current);
    if (!blob) {
      toast('ছবি বানানো যায়নি');
      return;
    }
    const link = document.createElement('a');
    const href = URL.createObjectURL(blob);
    link.href = href;
    link.download = fileName;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(href), 4000);
    toast('ছবি ডাউনলোড হচ্ছে');
  };

  const shareImage = async () => {
    const blob = await canvasToBlob(canvasRef.current);
    if (!blob) {
      toast('ছবি বানানো যায়নি');
      return;
    }
    const file = new File([blob], fileName, { type: 'image/png' });
    try {
      await navigator.share({ files: [file], title: cite, text: `${cite}\n${url}` });
    } catch (error) {
      if (error?.name !== 'AbortError') toast('ছবি শেয়ার করা যায়নি');
    }
  };

  return (
    <main id="main" tabIndex={-1} className="screen share-page">
      <PageTitle parts={['শেয়ার', title]} />
      <Link href={hadisHref(bookId, number)} className="share-back">
        <Icon name="cl" size={16} />
        হাদীসে ফিরুন
      </Link>
      <header className="share-head">
        <BookBadge bookId={bookId} />
        <div>
          <h1 className="h1">শেয়ার করুন</h1>
          <p className="muted">{title}</p>
        </div>
      </header>

      {status === 'loading' && (
        <div className="hadis-skeleton" aria-busy="true" aria-label="লোড হচ্ছে">
          <div className="hadis-skel" style={{ width: '40%' }} />
          <div className="hadis-skel" style={{ width: '96%' }} />
          <div className="hadis-skel" style={{ width: '90%' }} />
        </div>
      )}

      {status === 'missing' && (
        <div className="hadis-message">
          <p>এই হাদীসটি পাওয়া যায়নি।</p>
        </div>
      )}

      {status === 'error' && (
        <div className="hadis-message">
          <p>হাদীসটি আনা যায়নি। ইন্টারনেট সংযোগ দেখে আবার চেষ্টা করুন।</p>
          <Button variant="primary" onClick={retry}>আবার চেষ্টা করুন</Button>
        </div>
      )}

      {status === 'ok' && (
        <>
          <section className="share-card-wrap" aria-label="কার্ডের প্রিভিউ">
            <div className="share-preview">
              <QuoteCard
                book={book}
                number={number}
                text={text}
                citationText={cite}
                canvasRef={canvasRef}
                onDrawn={setDrawn}
              />
            </div>
            {drawn?.excerpted && (
              <p className="muted share-note">ছবিতে হাদীসের শুরুর অংশ আছে। পুরো হাদীসের লিংক ছবিতেই লেখা আছে।</p>
            )}
          </section>

          <div className="share-actions">
            <Button variant="primary" onClick={download} disabled={!drawn}>
              <Icon name="cd" size={18} />ছবি ডাউনলোড
            </Button>
            {fileShare && (
              <Button onClick={shareImage} disabled={!drawn}>
                <Icon name="share" size={18} />ছবি শেয়ার
              </Button>
            )}
            <Button onClick={() => copy(shareText({ book, number, text, url, digitStyle: settings.digits }), 'টেক্সট কপি করা হয়েছে')}>
              <Icon name="copy" size={18} />টেক্সট কপি
            </Button>
            <Button onClick={() => copy(url, 'লিংক কপি করা হয়েছে')}>
              <Icon name="link" size={18} />লিংক কপি
            </Button>
          </div>

          <section className="share-box" aria-label="উদ্ধৃতি">
            <div className="share-citebox" data-testid="citebox">
              <Icon name="book" size={18} />
              <span>{cite}</span>
            </div>
            <h2 className="h3">শেয়ারের লেখা</h2>
            <p className="share-text" data-testid="share-text">
              {shareText({ book, number, text, url, digitStyle: settings.digits })}
            </p>
          </section>
        </>
      )}
    </main>
  );
}
