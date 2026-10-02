'use client';

import { normalizeBengali } from '../Helpers/bengali';
import { TOPICS, filterTopics, topicHref } from '../lib/topics';
import NameMenu from './NameMenu';

const LABELS = {
  title: 'বিষয়সূচি',
  search: 'বিষয় খুঁজুন',
  none: 'কোনো বিষয় পাওয়া যায়নি',
  found: (count) => `${count}টি বিষয় পাওয়া গেছে`,
};

// The topics menu (see NameMenu): each topic is a link to /topics?topic=<name>.
export default function TopicIndex({ topic, page = 0, sort = 'asc', book = 'all', topics = TOPICS, overlay = false, onClose, onPick }) {
  return (
    <NameMenu
      items={topics}
      filter={filterTopics}
      hrefOf={(name) => topicHref(name, 0, sort)}
      sortHref={(next) => topicHref(topic, page, next, book)}
      isCurrent={(name) => normalizeBengali(name) === normalizeBengali(topic)}
      current={topic}
      sort={sort}
      labels={LABELS}
      overlay={overlay}
      onClose={onClose}
      onPick={onPick}
    />
  );
}
