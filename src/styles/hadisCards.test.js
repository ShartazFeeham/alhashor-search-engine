import { readFileSync } from 'node:fs';
import path from 'node:path';

const read = (name) => readFileSync(path.resolve(process.cwd(), 'src/styles', name), 'utf8');
const hadis = read('hadis.css');
const related = read('related.css');
const tokens = read('tokens.css');
// The declarations of the first rule whose selector is exactly `selector`.
function rule(css, selector) {
  const start = css.indexOf(`${selector}{`);
  if (start === -1) throw new Error(`no rule ${selector}`);
  return css.slice(start + selector.length + 1, css.indexOf('}', start));
}
const px = (declarations, property) => Number(new RegExp(`(?:^|;)${property}:(\\d+(?:\\.\\d+)?)px`).exec(declarations)?.[1]);

describe('cards, the same look as the search result cards', () => {
  const card = rule(hadis, '.hadis-card');
  const searchCard = rule(read('search.css'), '.search-item');

  test('surface background, 1px line border, 14px radius, about 12px padding', () => {
    expect(card).toMatch(/background:var\(--surface\)/);
    expect(card).toMatch(/border:1px solid var\(--line\)/);
    expect(px(card, 'border-radius')).toBe(14);
    expect(px(card, 'border-radius')).toBe(px(searchCard, 'border-radius'));
    expect(px(card, 'padding')).toBeGreaterThanOrEqual(10);
    expect(px(card, 'padding')).toBeLessThanOrEqual(12);
  });

  test('8 to 10px between the cards, on the page and inside the article', () => {
    expect(px(rule(hadis, '.hadis-page'), 'gap')).toBeGreaterThanOrEqual(8);
    expect(px(rule(hadis, '.hadis-page'), 'gap')).toBeLessThanOrEqual(10);
    expect(px(rule(hadis, '.hadis-article'), 'gap')).toBeGreaterThanOrEqual(8);
    expect(px(rule(hadis, '.hadis-article'), 'gap')).toBeLessThanOrEqual(10);
  });

  test('the reading progress sits on the card surface, not on the page colour', () => {
    expect(rule(hadis, '.hadis-progress')).toMatch(/background:var\(--surface\)/);
  });

  test('the similar list and the previous/next block use the card class (see the component tests)', () => {
    expect(related).not.toMatch(/\.related\{[^}]*border-top/);
  });
});

describe('no permanent link line', () => {
  test('its styles are gone', () => {
    expect(hadis).not.toMatch(/permalink/);
    expect(related).not.toMatch(/permalink/);
  });
});

describe('a hairline between similar hadis', () => {
  test('each item after the first has a top border in the line colour and some padding', () => {
    const separator = rule(related, '.related-item+.related-item');
    expect(separator).toMatch(/border-top:1px solid var\(--line\)/);
    expect(px(separator, 'padding-top')).toBeGreaterThanOrEqual(6);
  });
});

describe('the slim previous/next block', () => {
  const link = rule(hadis, '.hadis-pn a');

  test('one line, 36 to 40px tall, with a 44px tap area', () => {
    expect(px(link, 'min-height')).toBeGreaterThanOrEqual(36);
    expect(px(link, 'min-height')).toBeLessThanOrEqual(40);
    // the pseudo-element reaches above and below the link: 40 + 2 x 2 is at least 44
    const reach = Number(/inset:-(\d+)px 0/.exec(rule(hadis, '.hadis-pn a::after'))?.[1]);
    expect(px(link, 'min-height') + 2 * reach).toBeGreaterThanOrEqual(44);
  });

  test('text is not under 13px and the card is slim (6 to 8px padding)', () => {
    expect(px(rule(hadis, '.hadis-pn small'), 'font-size')).toBeGreaterThanOrEqual(13);
    expect(px(link, 'font-size')).toBeGreaterThanOrEqual(13);
    const nav = rule(hadis, '.hadis-pn');
    expect(px(nav, 'padding')).toBeGreaterThanOrEqual(6);
    expect(px(nav, 'padding')).toBeLessThanOrEqual(8);
  });
});

describe('the same width as the hadis list pages', () => {
  test('--list-w is 760px and .hadis-page, .search, .books and .topics-main all use it', () => {
    expect(tokens).toMatch(/--list-w:\s*760px/);
    expect(rule(hadis, '.hadis-page')).toMatch(/max-width:var\(--list-w\)/);
    expect(rule(read('search.css'), '.search')).toMatch(/max-width:var\(--list-w\)/);
    expect(rule(read('books.css'), '.books')).toMatch(/max-width:var\(--list-w\)/);
    expect(rule(read('topics.css'), '.topics-main')).toMatch(/max-width:var\(--list-w\)/);
  });

  test('the reading text and the similar texts fill their card', () => {
    expect(rule(hadis, '.hadis-read')).not.toMatch(/max-width/);
    expect(rule(related, '.related-text')).not.toMatch(/max-width/);
    expect(rule(hadis, '.hadis-read')).toMatch(/font-size:var\(--rs\)/);
    expect(rule(hadis, '.hadis-read')).toMatch(/line-height:var\(--rlh\)/);
  });
});

describe('similar hadis list', () => {
  test('the text is clamped to 3 lines', () => {
    const text = rule(related, '.related-text');
    expect(text).toMatch(/-webkit-line-clamp:3/);
    expect(text).toMatch(/(?:^|;)line-clamp:3/);
    expect(text).not.toMatch(/line-clamp:2/);
  });

  test('the head row has the link on the left and the word count pushed to the right', () => {
    expect(rule(related, '.related-head')).toMatch(/display:flex/);
    expect(rule(related, '.related-head')).toMatch(/justify-content:space-between/);
    expect(rule(related, '.related-reason')).toMatch(/margin-left:auto/);
    expect(rule(related, '.related-reason')).toMatch(/white-space:nowrap/);
  });

  test('the loader is a centred spinner row, and the spinner stops for people who ask for less motion (base.css)', () => {
    expect(rule(related, '.related-loader')).toMatch(/justify-content:center/);
    expect(rule(related, '.related-spinner')).toMatch(/animation:/);
    expect(related).toMatch(/@keyframes related-spin/);
    expect(related).not.toMatch(/\.related-more/);
  });
});
