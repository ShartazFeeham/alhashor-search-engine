import { readFileSync } from 'node:fs';
import path from 'node:path';

const read = (name) => readFileSync(path.resolve(process.cwd(), 'src/styles', name), 'utf8');
const FILES = ['tokens.css', 'base.css', 'ui.css', 'home.css', 'hadis.css', 'search.css', 'books.css', 'topics.css', 'share.css', 'daily.css', 'related.css'];
const css = FILES.map(read).join('\n').replace(/\/\*[\s\S]*?\*\//g, '');

// Every declaration block whose selector list contains `selector` exactly, joined.
function declarationsOf(selector) {
  const blocks = [];
  for (const [, list, body] of css.matchAll(/([^{}]+)\{([^}]*)\}/g)) {
    if (list.split(',').map((part) => part.trim()).includes(selector)) blocks.push(body);
  }
  if (blocks.length === 0) throw new Error(`no rule for ${selector}`);
  return blocks.join(';');
}

// Every place that shows the text of a hadis: the detail page and the daily page (.hadis-read), the similar
// list, the search results (also the book, narrators and topics listings: they use the same item) and the hadis cards.
const TEXTS = ['.hadis-read', '.related-text', '.search-text', '.hcard-text', '.hadis-justify'];

describe('hadis text is justified', () => {
  test.each(TEXTS)('%s: justify, inter-word, no hyphens, last line left', (selector) => {
    const declarations = declarationsOf(selector);
    expect(declarations).toMatch(/text-align:\s*(justify|var\(--hadis-align\))/);
    expect(declarations).toMatch(/text-justify:\s*inter-word/);
    expect(declarations).toMatch(/hyphens:\s*none/);
    expect(declarations).toMatch(/text-align-last:\s*left/);
    expect(declarations).not.toMatch(/letter-spacing|word-spacing/);
  });

  test('the token the other pages can use is justify', () => {
    expect(declarationsOf(':root')).toMatch(/--hadis-align:\s*justify/);
  });

  test('a long unbroken word wraps instead of overflowing (no horizontal scroll at 320px)', () => {
    for (const selector of TEXTS) expect(declarationsOf(selector)).toMatch(/overflow-wrap:\s*anywhere/);
  });

  test('headings, buttons and short labels are not justified', () => {
    for (const selector of ['.related-link', '.related-reason', '.hadis-title', '.ui-btn', '.topics-row-name', '.hadis-chain-label']) {
      let declarations = '';
      try {
        declarations = declarationsOf(selector);
      } catch {
        // no rule of its own: nothing justifies it
      }
      expect(declarations).not.toMatch(/text-align:\s*justify/);
    }
  });
});
