'use client';

import { MAX_ITEMS, idOf } from '../lib/khutbahList';
import { useDigits } from '../lib/useDigits';
import Button from '../ui/Button';
import Icon from '../ui/Icon';
import { useToast } from '../ui/Toast';
import { useKhutbahList } from './useKhutbahList';

// "Add to the khutbah list": puts the hadis in the address's list. A hadis already there shows a
// quiet "already in the list" instead.
export default function AddToKhutbah({ bookId, number }) {
  const { items, add } = useKhutbahList();
  const toast = useToast();
  const digits = useDigits();
  const item = { bookId, number };

  if (items.some((existing) => idOf(existing) === idOf(item))) {
    return (
      <Button size="sm" disabled>
        <Icon name="check" size={16} />খুতবার তালিকায় আছে
      </Button>
    );
  }

  const onClick = () => {
    const status = add(item);
    if (status === 'added') toast('খুতবার তালিকায় যোগ হয়েছে');
    else if (status === 'full') toast(`খুতবার তালিকায় ${digits(MAX_ITEMS)}টির বেশি হাদীস রাখা যায় না`);
  };

  return (
    <Button size="sm" onClick={onClick}>
      <Icon name="plan" size={16} />খুতবার তালিকায় যোগ করুন
    </Button>
  );
}
