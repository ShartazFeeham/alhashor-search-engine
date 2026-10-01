'use client';

import Button from '../ui/Button';
import Icon from '../ui/Icon';
import { useShare } from './useShare';

// A "শেয়ার" button for one hadis. `variant` picks how it looks: a pill with an icon (the hadis
// page), a quiet icon button (the hadis card), or a plain text button (search results, which
// style it like their other quiet actions).
export default function ShareButton({ book, number, text, variant = 'pill' }) {
  const share = useShare();
  const onClick = () => share({ book, number, text });

  if (variant === 'icon') {
    return (
      <button type="button" className="share-icon-btn" aria-label="শেয়ার" title="শেয়ার" onClick={onClick}>
        <Icon name="share" size={18} />
      </button>
    );
  }
  if (variant === 'link') {
    return (
      <button type="button" onClick={onClick}>
        শেয়ার
      </button>
    );
  }
  return (
    <Button size="sm" variant="ghost" onClick={onClick}>
      <Icon name="share" size={16} />
      শেয়ার
    </Button>
  );
}
