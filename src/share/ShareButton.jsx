'use client';

import Icon from '../ui/Icon';
import { useShare } from './useShare';

// A "শেয়ার" button for one hadis. `variant` picks how it looks: a pill with an icon (the hadis
// page), a quiet icon button (the hadis card), or a plain text button (search results, which
// style it like their other quiet actions). `describedBy` is the id of the title the button acts on.
export default function ShareButton({ book, number, text, variant = 'pill', describedBy }) {
  const share = useShare();
  const onClick = () => share({ book, number, text });

  if (variant === 'icon') {
    return (
      <button type="button" className="share-icon-btn act-share" aria-label="শেয়ার" aria-describedby={describedBy} title="শেয়ার" onClick={onClick}>
        <Icon name="share" size={18} />
      </button>
    );
  }
  if (variant === 'link') {
    return (
      <button type="button" aria-describedby={describedBy} onClick={onClick}>
        শেয়ার
      </button>
    );
  }
  return (
    <button type="button" className="act-btn act-share" aria-describedby={describedBy} onClick={onClick}>
      <Icon name="share" size={16} />
      <span>শেয়ার</span>
    </button>
  );
}
