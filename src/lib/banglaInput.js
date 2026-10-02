// The rules of the search box, as pure functions (no DOM, no React): what a keystroke or a paste
// does to the text. SearchBox.jsx feeds them the edit it saw and shows what they return.
//
// State:  { value, word }   word is null, or { from, to, roman, shown }: the Roman letters of the
//                            word being typed and the Bengali shown for them at value[from, to).
// Result: { value, caret, selEnd, word, warn, handled }
export const WARNING_TEXT = 'শুধু বাংলা বা ইংরেজি অক্ষর লিখুন';

// Bengali script (matras, hasanta, Bengali digits), the danda, ZWJ, ZWNJ and the space.
const isAllowedCode = (code) => (code >= 0x0980 && code <= 0x09ff) || code === 0x0964 || code === 0x200c || code === 0x200d || code === 0x20;
const ROMAN = /^[a-zA-Z0-9]$/;

export const isAllowedChar = (ch) => [...ch].length === 1 && isAllowedCode(ch.codePointAt(0));
export const isRomanChar = (ch) => ROMAN.test(ch);

// Keeps what is allowed and converts every run of Roman letters on its own.
function sanitise(text, convert) {
  let out = '';
  let run = '';
  let dropped = false;
  const flush = () => {
    if (run) out += convert(run);
    run = '';
  };
  for (const ch of text) {
    if (isRomanChar(ch)) run += ch;
    else {
      flush();
      if (isAllowedChar(ch)) out += ch;
      else dropped = true;
    }
  }
  flush();
  return { text: out, dropped };
}

function result(value, caret, word, extra = {}) {
  return { value, caret, selEnd: caret, word, warn: false, handled: true, ...extra };
}

// Puts the Bengali for `roman` where the word is (or at `from` for a new word).
function showWord(value, from, to, roman, convert) {
  const shown = convert(roman);
  const next = value.slice(0, from) + shown + value.slice(to);
  const end = from + shown.length;
  return result(next, end, { from, to: end, roman, shown });
}

// One Roman letter fewer in the word being typed (Backspace), converted again.
function shorten(state, convert) {
  const { word, value } = state;
  const roman = word.roman.slice(0, -1);
  if (!roman) return result(value.slice(0, word.from) + value.slice(word.to), word.from, null);
  return showWord(value, word.from, word.to, roman, convert);
}

// action: { type: 'backspace', caret }
//      or { type: 'edit', from, to, text, backward }  (text replaces value[from, to); '' deletes)
export function applyInput(state, action, convert) {
  const { value, word } = state;

  if (action.type === 'backspace') {
    if (!word || action.caret !== word.to) return { ...result(value, action.caret, word), handled: false };
    return shorten(state, convert);
  }

  const { from, to, text } = action;
  if (text === '') {
    // One character off the end of the word: take back the last Roman letter.
    if (word && to === word.to && to - from === 1 && from >= word.from && action.backward !== false) return shorten(state, convert);
    return result(value.slice(0, from) + value.slice(to), from, null);
  }

  // A Roman letter or digit typed at the end of the word grows it; elsewhere it starts a new word.
  if (text.length === 1 && isRomanChar(text)) {
    if (word && from === to && from === word.to) return showWord(value, word.from, word.to, word.roman + text, convert);
    return showWord(value, from, to, text, convert);
  }

  const clean = sanitise(text, convert);
  if (clean.text === '') {
    // Nothing allowed came in: the text, the selection and the word stay as they were.
    return { value, caret: from, selEnd: to, word, warn: true, handled: true };
  }
  const next = value.slice(0, from) + clean.text + value.slice(to);
  return result(next, from + clean.text.length, null, { warn: clean.dropped });
}

const BACKWARD = new Set(['deleteContentBackward', 'deleteWordBackward', 'deleteSoftLineBackward', 'deleteHardLineBackward']);

// The edit that turned `before` into `after`, with the caret now at `caret` (end of what was
// inserted). null when nothing changed.
export function diffEdit(before, after, caret, inputType) {
  if (before === after) return null;
  const end = Math.min(Math.max(caret, 0), after.length);
  let suffix = after.length - end;
  if (suffix > before.length || before.slice(before.length - suffix) !== after.slice(after.length - suffix)) {
    suffix = 0;
    while (suffix < before.length && suffix < after.length && before[before.length - 1 - suffix] === after[after.length - 1 - suffix]) suffix += 1;
  }
  const oldEnd = before.length - suffix;
  const newEnd = after.length - suffix;
  let prefix = 0;
  while (prefix < oldEnd && prefix < newEnd && before[prefix] === after[prefix]) prefix += 1;
  const edit = { from: prefix, to: oldEnd, text: after.slice(prefix, newEnd) };
  if (inputType !== undefined) edit.backward = BACKWARD.has(inputType);
  return edit;
}

// Letters typed before the engine was ready sit in the text as Roman letters: convert every run
// now and move the word and the caret with them.
export function convertRomanRuns(value, word, caret, convert) {
  const runs = [];
  const pattern = /[a-zA-Z0-9]+/g;
  let match;
  while ((match = pattern.exec(value))) runs.push({ start: match.index, end: match.index + match[0].length, shown: convert(match[0]) });
  if (!runs.length) return { value, word, caret };
  let next = '';
  let last = 0;
  for (const run of runs) {
    next += value.slice(last, run.start) + run.shown;
    last = run.end;
  }
  next += value.slice(last);
  const map = (position) => {
    let delta = 0;
    for (const run of runs) {
      if (run.end <= position) delta += run.shown.length - (run.end - run.start);
      else if (run.start < position) return run.start + delta + run.shown.length;
    }
    return position + delta;
  };
  const moved = word ? { ...word, from: map(word.from), to: map(word.to) } : null;
  if (moved) moved.shown = next.slice(moved.from, moved.to);
  return { value: next, word: moved, caret: map(caret) };
}
