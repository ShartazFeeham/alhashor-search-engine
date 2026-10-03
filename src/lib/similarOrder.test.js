import { orderSimilar } from './similarOrder';

const entry = (tag, matched, extra = {}) => ({ tag, matched, ...extra });
const tags = (list) => list.map((e) => e.tag);

test('with the same number of matched words the shorter hadis comes first (character length)', () => {
  const list = [entry('A', 3, { text: 'x'.repeat(300) }), entry('B', 3, { text: 'x'.repeat(100) }), entry('C', 3, { text: 'x'.repeat(200) })];
  expect(tags(orderSimilar(list))).toEqual(['B', 'C', 'A']);
});

test('a word count in the entry is used instead of the character length', () => {
  // A has the shorter text but more words
  const list = [entry('A', 2, { text: 'x'.repeat(10), words: 50 }), entry('B', 2, { text: 'x'.repeat(500), words: 20 })];
  expect(tags(orderSimilar(list))).toEqual(['B', 'A']);
});

test('more matched words still beat a shorter text', () => {
  const list = [entry('A', 2, { text: 'x' }), entry('B', 5, { text: 'x'.repeat(900) }), entry('C', 5, { text: 'x'.repeat(400) })];
  expect(tags(orderSimilar(list))).toEqual(['C', 'B', 'A']);
});

test('full ties keep the existing order', () => {
  const list = ['A', 'B', 'C', 'D'].map((tag) => entry(tag, 4, { text: 'same length' }));
  expect(tags(orderSimilar(list))).toEqual(['A', 'B', 'C', 'D']);
});

test('the same hadis are returned, the input is not changed, and a hadis whose text is missing goes after the others', () => {
  const list = [entry('A', 0, { text: null }), entry('B', 1, { text: 'xx' }), entry('C', 1, { text: 'x' })];
  const copy = [...list];
  expect(tags(orderSimilar(list))).toEqual(['C', 'B', 'A']);
  expect(list).toEqual(copy);
});
