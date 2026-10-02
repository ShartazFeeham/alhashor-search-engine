'use client';

import { useMemo } from 'react';
import NameMenu from '../topics/NameMenu';
import { compareNames } from '../lib/topicBlocks';
import { filterNarrators, narratorHref } from '../lib/narrators';

const LABELS = {
  title: 'বর্ণনাকারীসূচি',
  search: 'বর্ণনাকারী খুঁজুন',
  none: 'কোনো বর্ণনাকারী পাওয়া যায়নি',
  found: (count) => `${count} জন বর্ণনাকারী পাওয়া গেছে`,
};

const SORTS = [
  { value: 'count-desc', label: 'হাদীস সংখ্যা (বেশি → কম)' },
  { value: 'count-asc', label: 'হাদীস সংখ্যা (কম → বেশি)' },
  { value: 'name-asc', label: 'নাম (ক → হ)' },
  { value: 'name-desc', label: 'নাম (হ → ক)' },
];

// The narrators menu (see NameMenu, the one /topics uses): each narrator is a row, the name with
// the hadis count, linking to /narrators?name=<id>. By count it is one flat list (ties by name);
// by name it is in letter blocks. `narrators` is the index (useNarratorIndex); `empty` shows while
// it has not loaded.
export default function NarratorIndex({ id, page = 0, book = 'all', sort = 'count-desc', narrators, empty, overlay = false, onClose, onPick }) {
  const byCount = sort.startsWith('count');
  const items = useMemo(() => {
    if (!byCount) return narrators;
    const sign = sort === 'count-asc' ? -1 : 1;
    return [...narrators].sort((a, b) => sign * (b.count - a.count) || compareNames(a.name, b.name));
  }, [narrators, byCount, sort]);
  return (
    <NameMenu
      items={items}
      nameOf={(narrator) => narrator.name}
      keyOf={(narrator) => narrator.id}
      countOf={(narrator) => narrator.count}
      filter={filterNarrators}
      hrefOf={(narrator) => narratorHref(narrator.id, 0, 'all', sort)}
      sortHref={(next) => narratorHref(id, page, book, next)}
      isCurrent={(narrator) => narrator.id === id}
      current={id}
      sort={sort}
      sortOptions={SORTS}
      flat={byCount}
      blockSort={sort === 'name-desc' ? 'desc' : 'asc'}
      labels={LABELS}
      empty={empty}
      overlay={overlay}
      onClose={onClose}
      onPick={onPick}
    />
  );
}
