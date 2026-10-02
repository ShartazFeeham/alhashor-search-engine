'use client';

import { idOf, splitId } from '../lib/compareList';
import Button from '../ui/Button';
import Icon from '../ui/Icon';
import { useCompare } from './CompareProvider';

const ADD = 'তুলনায় যোগ করুন';
const REMOVE = 'তুলনা থেকে সরান';

// "Add to compare" for one hadis, a toggle (aria-pressed). `variant` picks how it looks: a pill
// with an icon (the hadis page), a quiet icon button (the hadis card), or a plain text button
// (search results, which style it like their other quiet actions). `describedBy` is the id of the
// title of the hadis it acts on.
export default function CompareToggle({ bookId, number, variant = 'pill', describedBy }) {
  const { has, toggle } = useCompare();
  const id = idOf(bookId, number);
  if (!splitId(id)) return null;
  const pressed = has(id);
  const label = pressed ? REMOVE : ADD;
  const onClick = () => toggle(id);

  if (variant === 'icon') {
    return (
      <button type="button" className="cmp-icon-btn" aria-pressed={pressed} aria-label={label} aria-describedby={describedBy} title={label} onClick={onClick}>
        <Icon name="cols" size={18} />
      </button>
    );
  }
  if (variant === 'link') {
    return (
      <button type="button" className="cmp-link-btn" aria-pressed={pressed} aria-describedby={describedBy} onClick={onClick}>
        {label}
      </button>
    );
  }
  return (
    <Button size="sm" variant="ghost" className="cmp-toggle" aria-pressed={pressed} aria-describedby={describedBy} onClick={onClick}>
      <Icon name="cols" size={16} />
      {label}
    </Button>
  );
}
