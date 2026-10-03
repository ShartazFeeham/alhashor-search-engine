import { bookById, hasHadis } from '../lib/books';
import { CURATED_TOPICS } from './curatedTopics';
import { realText } from '../test/hadisFixtures';
import { PLANS } from './readingPlans';

const wordCount = (text) => text.trim().split(/\s+/).length;

function expectRealHadis(entry) {
  const book = bookById(entry.book);
  expect(book, `unknown book id ${entry.book}`).toBeDefined();
  expect(Number.isInteger(entry.number)).toBe(true);
  expect(hasHadis(book, entry.number), `${entry.book} ${entry.number} has no data file`).toBe(true);
}

describe('curated topics', () => {
  const names = Object.keys(CURATED_TOPICS);

  test('has about ten topics, each with five or more entries', () => {
    expect(names.length).toBeGreaterThanOrEqual(10);
    for (const name of names) expect(CURATED_TOPICS[name].length).toBeGreaterThanOrEqual(5);
  });

  // The picks are switched off by the owner and the topic list was curated by what people search
  // for (docs/topics-review.md), so a pick's name need not be on the list; it only has to be a clean name.
  test('every topic name is a trimmed, non-empty name', () => {
    for (const name of names) {
      expect(name).not.toBe('');
      expect(name).toBe(name.trim());
    }
  });

  test('every entry uses a known book, an existing number and a short Bengali note', () => {
    for (const name of names) {
      for (const entry of CURATED_TOPICS[name]) {
        expectRealHadis(entry);
        expect(typeof entry.note).toBe('string');
        expect(entry.note.length).toBeGreaterThan(0);
        expect(wordCount(entry.note), `${name} ${entry.book} ${entry.number}`).toBeLessThanOrEqual(12);
      }
    }
  });

  test('no hadis is listed twice in one topic', () => {
    for (const name of names) {
      const keys = CURATED_TOPICS[name].map((e) => `${e.book}:${e.number}`);
      expect(new Set(keys).size).toBe(keys.length);
    }
  });
});

describe('reading plans', () => {
  test('exactly three plans with the agreed ids and day counts', () => {
    expect(PLANS.map((p) => p.id)).toEqual(['ramadan-30', 'short-40', 'character-7']);
    expect(PLANS.map((p) => p.days.length)).toEqual([30, 40, 7]);
  });

  test('each plan has an ascii id, a title and a description', () => {
    for (const plan of PLANS) {
      expect(plan.id).toMatch(/^[a-z0-9-]+$/);
      expect(plan.title.length).toBeGreaterThan(0);
      expect(plan.description.length).toBeGreaterThan(0);
    }
  });

  test('every day uses a known book and an existing number', () => {
    for (const plan of PLANS) for (const day of plan.days) expectRealHadis(day);
  });

  test('no hadis repeats within a plan', () => {
    for (const plan of PLANS) {
      const keys = plan.days.map((d) => `${d.book}:${d.number}`);
      expect(new Set(keys).size, plan.id).toBe(keys.length);
    }
  });

  test('the short-40 plan uses only hadis of 60 words or fewer', () => {
    const plan = PLANS.find((p) => p.id === 'short-40');
    for (const day of plan.days) {
      const body = realText(day.book, day.number).replace(/^\s*[0-9০-৯]+(?:\/[0-9০-৯]+)?\s*[।.]\s*/, '');
      expect(wordCount(body), `${day.book} ${day.number}`).toBeLessThanOrEqual(60);
    }
  });
});
