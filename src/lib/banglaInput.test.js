import { WARNING_TEXT, applyInput, convertRomanRuns, diffEdit, isAllowedChar, isRomanChar } from './banglaInput';

// A stand-in for the Avro engine: every Roman letter becomes one Bengali letter.
const convert = (roman) => 'অ'.repeat(roman.length);
const empty = { value: '', word: null };

function typeAt(state, text, at = state.value.length, to = at) {
  return applyInput(state, { type: 'edit', from: at, to, text }, convert);
}
function typeAll(text, state = empty) {
  let current = state;
  for (const ch of text) current = typeAt(current, ch);
  return current;
}

test('the warning text', () => {
  expect(WARNING_TEXT).toBe('শুধু বাংলা বা ইংরেজি অক্ষর লিখুন');
});

test('which characters are allowed', () => {
  for (const ch of ['ক', 'ি', '্', '১', '।', '‌', '‍', ' ']) expect(isAllowedChar(ch)).toBe(true);
  for (const ch of ['@', '#', '.', ',', '-', "'", 'ش', '😀', '\t', '\n', 'é', '٣']) expect(isAllowedChar(ch)).toBe(false);
  expect(isRomanChar('a')).toBe(true);
  expect(isRomanChar('Z')).toBe(true);
  expect(isRomanChar('7')).toBe(true);
  expect(isRomanChar('ক')).toBe(false);
});

describe('typing', () => {
  test('Bangla goes in as typed, with the caret after it', () => {
    const result = typeAll('বুখারী ১২৩৪।');
    expect(result.value).toBe('বুখারী ১২৩৪।');
    expect(result.caret).toBe(result.value.length);
    expect(result.warn).toBe(false);
    expect(result.word).toBeNull();
  });

  test('Roman letters are converted as the word grows, never left as Roman', () => {
    let state = empty;
    for (const [i, ch] of [...'abc'].entries()) {
      state = typeAt(state, ch);
      expect(state.value).toBe('অ'.repeat(i + 1));
      expect(state.caret).toBe(i + 1);
      expect(state.word.roman).toBe('abc'.slice(0, i + 1));
    }
  });

  test('digits are converted in the same way', () => {
    const state = typeAll('12');
    expect(state.value).toBe('অঅ');
    expect(state.word.roman).toBe('12');
  });

  test('a space commits the word and the next letters start a new one', () => {
    const state = typeAll('ab c');
    expect(state.value).toBe('অঅ অ');
    expect(state.word.roman).toBe('c');
    expect(typeAll('ab ').word).toBeNull();
  });

  test('Bangla after Roman letters commits them', () => {
    const state = typeAll('abক');
    expect(state.value).toBe('অঅক');
    expect(state.word).toBeNull();
  });

  test('a letter typed in the middle of the text starts a word at the caret', () => {
    const state = typeAt({ value: 'কখ', word: null }, 'a', 1);
    expect(state.value).toBe('কঅখ');
    expect(state.caret).toBe(2);
    expect(state.word).toMatchObject({ from: 1, to: 2, roman: 'a' });
  });

  test('a letter typed away from the end of the word being typed commits that word', () => {
    const word = typeAll('abc');
    const state = typeAt(word, 'd', 1);
    expect(state.value).toBe('অঅঅঅ');
    expect(state.word).toMatchObject({ from: 1, roman: 'd' });
    expect(state.word.roman).not.toBe('abcd');
  });

  test('typing over a selection replaces it', () => {
    const state = typeAt({ value: 'কখগ', word: null }, 'a', 1, 2);
    expect(state.value).toBe('কঅগ');
  });
});

describe('Backspace', () => {
  test('removes the last Roman letter and converts again', () => {
    let state = typeAll('abc');
    state = applyInput(state, { type: 'backspace', caret: state.caret }, convert);
    expect(state.handled).toBe(true);
    expect(state.value).toBe('অঅ');
    expect(state.word.roman).toBe('ab');
    state = applyInput(state, { type: 'backspace', caret: state.caret }, convert);
    state = applyInput(state, { type: 'backspace', caret: state.caret }, convert);
    expect(state.value).toBe('');
    expect(state.word).toBeNull();
  });

  test('with no word being typed it is left to the browser', () => {
    const result = applyInput({ value: 'কখ', word: null }, { type: 'backspace', caret: 2 }, convert);
    expect(result.handled).toBe(false);
  });

  test('a phone keyboard deleting one character at the end of the word does the same', () => {
    const word = typeAll('abc');
    const result = applyInput(word, { type: 'edit', from: 2, to: 3, text: '', backward: true }, convert);
    expect(result.value).toBe('অঅ');
    expect(result.word.roman).toBe('ab');
  });

  test('deleting a selection (or the whole word) is a normal delete that commits', () => {
    const word = typeAll('abc');
    const whole = applyInput(word, { type: 'edit', from: 0, to: 3, text: '', backward: true }, convert);
    expect(whole.value).toBe('');
    expect(whole.word).toBeNull();
    const part = applyInput(word, { type: 'edit', from: 1, to: 3, text: '', backward: false }, convert);
    expect(part.value).toBe('অ');
    expect(part.word).toBeNull();
  });

  test('a delete clears the warning', () => {
    expect(applyInput({ value: 'কখ', word: null }, { type: 'edit', from: 1, to: 2, text: '' }, convert).warn).toBe(false);
  });
});

describe('characters that are not allowed', () => {
  test.each(['@', '#', '$', '%', '.', ',', '-', "'", 'ش', 'é', '😀', '\t', '\n'])('%j is not inserted and the warning is raised', (ch) => {
    const state = typeAll('ক খ');
    const result = typeAt(state, ch);
    expect(result.value).toBe('ক খ');
    expect(result.caret).toBe(3);
    expect(result.warn).toBe(true);
  });

  test('the word being typed is kept after a rejected character', () => {
    const state = typeAll('ab');
    const rejected = typeAt(state, '@');
    expect(rejected.word).toEqual(state.word);
    expect(typeAt({ ...state, ...rejected }, 'c').value).toBe('অঅঅ');
  });

  test('a rejected character over a selection leaves the text and the selection alone', () => {
    const result = typeAt({ value: 'কখগ', word: null }, '@', 1, 2);
    expect(result.value).toBe('কখগ');
    expect([result.caret, result.selEnd]).toEqual([1, 2]);
    expect(result.warn).toBe(true);
  });

  test('the next valid keystroke has no warning', () => {
    expect(typeAt(empty, 'ক').warn).toBe(false);
    expect(typeAt(empty, 'a').warn).toBe(false);
  });
});

describe('paste', () => {
  test('Roman words are converted one at a time, other characters dropped, with a warning', () => {
    const result = typeAt({ value: 'ক', word: null }, 'ab@cd ef.', 1);
    expect(result.value).toBe('কঅঅঅঅ অঅ');
    expect(result.warn).toBe(true);
    expect(result.word).toBeNull();
    expect(result.caret).toBe(result.value.length);
  });

  test('pasted Bangla and Roman words keep their order and the text after the caret', () => {
    const result = typeAt({ value: 'কখ', word: null }, 'বই abc ১২', 1);
    expect(result.value).toBe('ক' + 'বই অঅঅ ১২' + 'খ');
    expect(result.warn).toBe(false);
    expect(result.caret).toBe(1 + 'বই অঅঅ ১২'.length);
  });

  test('a paste commits the word being typed', () => {
    const word = typeAll('ab');
    const result = typeAt(word, 'cd');
    expect(result.value).toBe('অঅঅঅ');
    expect(result.word).toBeNull();
  });

  test('a paste of only disallowed characters changes nothing but warns', () => {
    const result = typeAt({ value: 'ক', word: null }, '@#$', 1);
    expect(result.value).toBe('ক');
    expect(result.warn).toBe(true);
  });
});

describe('diffEdit', () => {
  test('no change gives nothing', () => {
    expect(diffEdit('কখ', 'কখ', 2)).toBeNull();
  });
  test('typing at the end, in the middle, and over a selection', () => {
    expect(diffEdit('ক', 'কখ', 2)).toMatchObject({ from: 1, to: 1, text: 'খ' });
    expect(diffEdit('কগ', 'কখগ', 2)).toMatchObject({ from: 1, to: 1, text: 'খ' });
    expect(diffEdit('কখগ', 'কঘগ', 2)).toMatchObject({ from: 1, to: 2, text: 'ঘ' });
  });
  test('deleting', () => {
    expect(diffEdit('কখ', 'ক', 1)).toMatchObject({ from: 1, to: 2, text: '' });
    expect(diffEdit('কখগ', 'কগ', 1)).toMatchObject({ from: 1, to: 2, text: '' });
  });
  test('a repeated letter is the one at the caret', () => {
    expect(diffEdit('কক', 'কক' + 'ক', 3)).toMatchObject({ from: 2, to: 2, text: 'ক' });
  });
  test('a paste', () => {
    expect(diffEdit('কখ', 'কabcখ', 4)).toMatchObject({ from: 1, to: 1, text: 'abc' });
  });
  test('the input type tells a backward delete from other deletes', () => {
    expect(diffEdit('কখ', 'ক', 1, 'deleteContentBackward').backward).toBe(true);
    expect(diffEdit('কখ', 'ক', 1, 'deleteByCut').backward).toBe(false);
    expect(diffEdit('কখ', 'ক', 1).backward).toBeUndefined();
  });
});

describe('convertRomanRuns (letters typed before the engine was ready)', () => {
  test('converts every Roman run and moves the word and the caret', () => {
    const word = { from: 4, to: 6, roman: 'ab', shown: 'ab' };
    const result = convertRomanRuns('xyz ab', word, 6, (roman) => 'অ' + roman.length);
    expect(result.value).toBe('অ3 অ2');
    expect(result.word).toMatchObject({ from: 3, to: 5, roman: 'ab', shown: 'অ2' });
    expect(result.caret).toBe(5);
  });
  test('Bengali text is left alone', () => {
    expect(convertRomanRuns('কখ', null, 2, () => 'x').value).toBe('কখ');
  });
});
