'use client';

import NameMenu from '../topics/NameMenu';
import { filterNarrators, narratorHref } from '../lib/narrators';

const LABELS = {
  title: 'বর্ণনাকারীসূচি',
  search: 'বর্ণনাকারী খুঁজুন',
  none: 'কোনো বর্ণনাকারী পাওয়া যায়নি',
  found: (count) => `${count} জন বর্ণনাকারী পাওয়া গেছে`,
};

// The narrators menu (see NameMenu, the one /topics uses): each narrator is a link to
// /narrators?name=<id>. `narrators` is the index (useNarratorIndex); `empty` shows while it has
// not loaded.
export default function NarratorIndex({ id, page = 0, book = 'all', sort = 'asc', narrators, empty, overlay = false, onClose, onPick }) {
  return (
    <NameMenu
      items={narrators}
      nameOf={(narrator) => narrator.name}
      keyOf={(narrator) => narrator.id}
      filter={filterNarrators}
      hrefOf={(narrator) => narratorHref(narrator.id, 0, 'all', sort)}
      sortHref={(next) => narratorHref(id, page, book, next)}
      isCurrent={(narrator) => narrator.id === id}
      current={id}
      sort={sort}
      labels={LABELS}
      empty={empty}
      overlay={overlay}
      onClose={onClose}
      onPick={onPick}
    />
  );
}
