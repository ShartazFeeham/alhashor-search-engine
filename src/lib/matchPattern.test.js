import { buildMatcher, highlightParts, makeSnippet } from './matchPattern';

const YA_ONE = 'য়'; // য় as one character
const YA_TWO = 'য়'; // য + nukta
const O_ONE = 'ো'; // ো as one character
const O_TWO = 'ো'; // ে + া

test('no usable words gives no matcher', () => {
  expect(buildMatcher([])).toBeNull();
  expect(buildMatcher(['', '  '])).toBeNull();
});

test('finds plain words and parts of longer words', () => {
  const m = buildMatcher(['নামায']);
  expect('আমরা নামায পড়ি এবং নামাযের সময়'.match(m)).toEqual(['নামায', 'নামায']);
});

test('finds a word written with the other spelling of a letter (Review Focus 4)', () => {
  const m = buildMatcher([`ম${YA_ONE}লা`]);
  expect(`এটা ম${YA_TWO}লা`.match(m)).toHaveLength(1);
  const m2 = buildMatcher([`ক${O_TWO}ন`]);
  expect(`সে ক${O_ONE}ন`.match(m2)).toHaveLength(1);
});

test('finds a word with an invisible joiner inside it (Review Focus 4)', () => {
  const m = buildMatcher(['করা']);
  expect('সে কর‌া'.match(m)).toHaveLength(1);
});

test('characters that mean something in a pattern are matched literally', () => {
  const m = buildMatcher(['(রাঃ)', 'a.b']);
  expect('আনাস (রাঃ) থেকে'.match(m)).toEqual(['(রাঃ)']);
  expect('axb'.match(m)).toBeNull();
});

test('highlightParts rebuilds the original text exactly', () => {
  const text = 'তিনি বলেন, নামায পড়ো এবং নামায ছাড়ো না।';
  const parts = highlightParts(text, buildMatcher(['নামায']));
  expect(parts.map((p) => p.text).join('')).toBe(text);
  expect(parts.filter((p) => p.match).map((p) => p.text)).toEqual(['নামায', 'নামায']);
});

test('highlightParts with no matcher returns the text as one plain part', () => {
  expect(highlightParts('কথা', null)).toEqual([{ text: 'কথা', match: false }]);
});

test('a short text is returned whole', () => {
  const snippet = makeSnippet('ছোট নামায কথা', buildMatcher(['নামায']));
  expect(snippet).toEqual({ text: 'ছোট নামায কথা', cutStart: false, cutEnd: false });
});

test('a long text gets a window around the first match, cut at word boundaries', () => {
  const filler = (n) => Array.from({ length: n }, (_, i) => `শব্দ${i}`).join(' ');
  const text = `${filler(60)} নামায ${filler(60)}`;
  const snippet = makeSnippet(text, buildMatcher(['নামায']));
  expect(snippet.cutStart).toBe(true);
  expect(snippet.cutEnd).toBe(true);
  expect(snippet.text).toContain('নামায');
  expect(snippet.text.length).toBeLessThan(260);
  expect(snippet.text.startsWith(' ')).toBe(false);
  expect(/\s$/.test(snippet.text)).toBe(false);
});

test('when nothing matches the snippet is the start of the text', () => {
  const text = Array.from({ length: 200 }, (_, i) => `শব্দ${i}`).join(' ');
  const snippet = makeSnippet(text, buildMatcher(['অমিল']));
  expect(text.startsWith(snippet.text)).toBe(true);
  expect(snippet.cutStart).toBe(false);
  expect(snippet.cutEnd).toBe(true);
});
