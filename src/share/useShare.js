'use client';

import { useCallback } from 'react';
import { hadisHref } from '../lib/hadisRoute';
import { citation, shareText } from '../lib/share';
import { useSettings } from '../settings/SettingsProvider';
import { useToast } from '../ui/Toast';

// The full address of a hadis page, for sharing.
export function permanentUrl(bookId, number) {
  return `${window.location.origin}${hadisHref(bookId, number)}`;
}

// copy(value, message) puts the value on the clipboard and says so. A blocked clipboard says so too,
// instead of claiming success. Resolves to true when the copy worked.
export function useCopy() {
  const toast = useToast();
  return useCallback(
    async (value, message = 'কপি করা হয়েছে') => {
      try {
        await navigator.clipboard.writeText(value);
        toast(message);
        return true;
      } catch {
        toast('কপি করা যায়নি');
        return false;
      }
    },
    [toast]
  );
}

// share({ book, number, text }) opens the device's share sheet with the saying, its citation and
// its permanent link. A cancelled sheet does nothing. With no share sheet, or when it fails, the
// share text is copied to the clipboard and the toast says so.
export function useShare() {
  const { settings } = useSettings();
  const copy = useCopy();

  return useCallback(
    async ({ book, number, text }) => {
      const url = permanentUrl(book.id, number);
      const digitStyle = settings.digits;
      if (typeof navigator.share === 'function') {
        try {
          // The link goes in its own field: an app given both a text with the link and a url would show it twice.
          await navigator.share({
            title: citation(book, number, digitStyle),
            text: shareText({ book, number, text, digitStyle }),
            url,
          });
          return 'shared';
        } catch (error) {
          if (error?.name === 'AbortError') return 'cancelled';
        }
      }
      await copy(shareText({ book, number, text, url, digitStyle }), 'শেয়ার টেক্সট কপি করা হয়েছে');
      return 'copied';
    },
    [settings.digits, copy]
  );
}
