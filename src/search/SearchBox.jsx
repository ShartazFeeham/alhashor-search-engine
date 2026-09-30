'use client';

import { useEffect, useState } from 'react';
import { isRoman, romanSuggestions } from '../lib/roman';
import Icon from '../ui/Icon';

const EXAMPLES = [
  'রোজা',
  'নফল নামায',
  'লায়লাতুল কদর',
  '১৫০',
  '২৪২২',
  'আবু হুরায়রা',
  'আয়েশা (রাঃ)',
  'প্রত্যেক কাজ নিয়তের সাথে সম্পর্কিত',
  'ইসলামের ভিত্তি পাঁচটি',
];

// The search form: the box, the Bengali-only note, Roman-letter suggestions while typing and,
// before the first search, example searches.
export default function SearchBox({ text, onText, query, onSubmit }) {
  const [suggestions, setSuggestions] = useState([]);

  // Roman letters (e.g. "namaz") get Bengali spellings to pick from. Only while typing:
  // a search already run from the address is left alone.
  useEffect(() => {
    let cancelled = false;
    if (text === query || !isRoman(text.trim())) {
      setSuggestions([]);
      return undefined;
    }
    romanSuggestions(text).then((list) => {
      if (!cancelled) setSuggestions(list);
    });
    return () => {
      cancelled = true;
    };
  }, [text, query]);

  return (
    <form className="search-form" role="search" onSubmit={onSubmit}>
      <p className="search-note">
        হাদীসের ক্রম কিংবা বর্ণনাকারীর নাম দিয়ে হাদীস খুঁজুন। অথবা যেকোনো শব্দ/বিষয় কিংবা হাদীসের অংশ লিখে সার্চ করুন।
        <br />
        <b>সমস্ত হাদীস বাংলায়, অতএব শুধু বাংলায় লিখে সার্চ করুন!</b>
      </p>
      <div className="search-box">
        <Icon name="search" size={20} />
        <input
          type="text"
          aria-label="খোঁজার শব্দ"
          value={text}
          onChange={(event) => onText(event.target.value)}
          autoComplete="off"
        />
        <button type="submit" className="search-go">খুঁজুন</button>
      </div>
      {suggestions.length > 0 && (
        <div className="search-chips" aria-label="বাংলা প্রস্তাব">
          {suggestions.map((word) => (
            <button key={word} type="button" className="ui-chip" onClick={() => onText(word)}>{word}</button>
          ))}
        </div>
      )}
      {query === '' && (
        <div className="search-chips" aria-label="উদাহরণ">
          {EXAMPLES.map((word) => (
            <button key={word} type="button" className="ui-chip" onClick={() => onText(word)}>{word}</button>
          ))}
        </div>
      )}
    </form>
  );
}
