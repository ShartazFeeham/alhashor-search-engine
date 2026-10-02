'use client';

import { useEffect, useRef, useState } from 'react';
import { WARNING_TEXT, applyInput, convertRomanRuns, diffEdit } from '../lib/banglaInput';
import { loadRoman, romanReady, romanToBangla } from '../lib/roman';
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

const WARNING_MS = 3000;

// The search form: the box, the Bengali-only note and, before the first search, example searches.
// The box takes Bengali as typed, turns English letters into Bengali as you type (the whole word
// is converted again after each letter) and refuses anything else with a short warning.
export default function SearchBox({ text, onText, query, onSubmit }) {
  const inputRef = useRef(null);
  const valueRef = useRef(text); // the text as the rules last saw it
  const wordRef = useRef(null); // the Roman word being typed (see banglaInput.js)
  const composing = useRef(false);
  const pending = useRef(false); // Roman letters are in the box because the engine was not ready
  const timer = useRef(null);
  const mounted = useRef(true);
  const [warn, setWarn] = useState(false);

  // Text set from outside (an example, a new address) is not a word being typed.
  useEffect(() => {
    if (text !== valueRef.current && !composing.current) {
      valueRef.current = text;
      wordRef.current = null;
    }
  }, [text]);

  const showWarning = (on) => {
    clearTimeout(timer.current);
    setWarn(on);
    if (on) timer.current = setTimeout(() => setWarn(false), WARNING_MS);
  };

  // Load the engine now so the first letters are converted at once; letters typed before it is
  // ready show as typed and are converted when it arrives.
  useEffect(() => {
    mounted.current = true;
    loadRoman().then(() => {
      const input = inputRef.current;
      if (!mounted.current || !pending.current || !input) return;
      pending.current = false;
      const done = convertRomanRuns(valueRef.current, wordRef.current, input.selectionStart ?? valueRef.current.length, romanToBangla);
      valueRef.current = done.value;
      wordRef.current = done.word;
      input.value = done.value;
      input.setSelectionRange(done.caret, done.caret);
      onText(done.value);
    }, () => {});
    return () => {
      mounted.current = false;
      clearTimeout(timer.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const apply = (input, next, inputType) => {
    const edit = diffEdit(valueRef.current, next, input.selectionStart ?? next.length, inputType);
    if (!edit) return;
    const ready = romanReady();
    const done = applyInput({ value: valueRef.current, word: wordRef.current }, { type: 'edit', ...edit }, romanToBangla);
    if (!ready && /[a-zA-Z0-9]/.test(done.value)) pending.current = true;
    valueRef.current = done.value;
    wordRef.current = done.word;
    // The box is controlled, so what was typed is put back by hand (and the caret with it).
    input.value = done.value;
    input.setSelectionRange(done.caret, done.selEnd);
    showWarning(done.warn);
    onText(done.value);
  };

  const change = (event) => {
    const input = event.target;
    if (composing.current) {
      onText(input.value); // an input method is at work: leave its text alone until it ends
      return;
    }
    apply(input, input.value, event.nativeEvent?.inputType);
  };

  const endComposition = (event) => {
    composing.current = false;
    apply(event.target, event.target.value);
  };

  return (
    <form className="search-form" role="search" onSubmit={onSubmit}>
      <p className="search-note">
        হাদীসের ক্রম কিংবা বর্ণনাকারীর নাম দিয়ে হাদীস খুঁজুন। অথবা যেকোনো শব্দ/বিষয় কিংবা হাদীসের অংশ লিখে সার্চ করুন।
      </p>
      <div className="search-box">
        <Icon name="search" size={20} />
        <input
          type="text"
          aria-label="খোঁজার শব্দ"
          value={text}
          ref={inputRef}
          onChange={change}
          onCompositionStart={() => { composing.current = true; }}
          onCompositionEnd={endComposition}
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
        />
        <button type="submit" className="search-go">খুঁজুন</button>
      </div>
      <p className="search-warn" role="status" aria-live="polite">{warn ? WARNING_TEXT : ''}</p>
      {query === '' && (
        <div className="search-chips" role="group" aria-label="উদাহরণ">
          {EXAMPLES.map((word) => (
            <button key={word} type="button" className="ui-chip" onClick={() => onText(word)}>{word}</button>
          ))}
        </div>
      )}
    </form>
  );
}
