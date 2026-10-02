// Adds DOM matchers such as toBeInTheDocument() and toHaveTextContent() to expect.
import '@testing-library/jest-dom';
import { beforeEach, vi } from 'vitest';
import { clearHadisTextCache } from './lib/useHadisText';
import { resetNavigation } from './test/nextNavigation';
import { resetPrefixesForTests, setContainingCapForTests, setSubstringPrefixForTests, setTagsPrefixForTests } from './search/searchConfig';

// Every test runs against in-memory versions of the Next.js router and link.
vi.mock('next/navigation', () => import('./test/nextNavigation'));
vi.mock('next/link', () => import('./test/nextLink'));
// next/font/local needs Next's compiler; in tests it just reports its CSS variable name.
vi.mock('next/font/local', () => ({ default: (options) => ({ variable: options.variable, className: '' }) }));

// Newer Node versions ship their own experimental localStorage that hides the test
// environment's one (and lacks clear()). Tests get one simple in-memory storage everywhere.
class MemoryStorage {
  #data = new Map();
  get length() { return this.#data.size; }
  key(index) { return [...this.#data.keys()][index] ?? null; }
  getItem(key) { return this.#data.has(String(key)) ? this.#data.get(String(key)) : null; }
  setItem(key, value) { this.#data.set(String(key), String(value)); }
  removeItem(key) { this.#data.delete(String(key)); }
  clear() { this.#data.clear(); }
}
Object.defineProperty(globalThis, 'localStorage', { value: new MemoryStorage(), configurable: true, writable: true });

beforeEach(() => {
  localStorage.clear();
  resetNavigation();
  clearHadisTextCache();
  // The older search tests serve 2-letter data files (/json/tags/xx.json, /json/substring/xx.json)
  // and expect every containing word to be loaded, so every test starts on the 2-letter layouts with
  // the cap off; the tests of the 3-letter layouts and of the cap pin them themselves
  // (setTagsPrefixForTests, setSubstringPrefixForTests, setContainingCapForTests).
  resetPrefixesForTests();
  setTagsPrefixForTests(2);
  setSubstringPrefixForTests(2);
  setContainingCapForTests(0);
});
