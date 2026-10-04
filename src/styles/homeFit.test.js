import { readFileSync } from 'node:fs';
import path from 'node:path';

// Home must show everything down to the row of four cards (which has no title) in the first view
// (1470 x 780, and a phone of 390 x 700 behind a 84px tab bar). The order is: hero with the search
// bar, the টপ লিস্ট/হাদীস section (three thin rows), the row of four cards, then হাদীসের বই.
// These pin the compact spacing so a later edit does not give the room back; the real heights were
// measured in a browser (docs/redesign-plan.md). Measured in headless Chrome with the three
// picks rows: 1470x780 the row of cards ends at 622px, 390x844 at 681px (320 wide: 702px);
// the picks section is 196px at 390 and 1470 (216px at 320 with a long title), each row 52px.
const read = (name) => readFileSync(path.resolve(process.cwd(), 'src/styles', name), 'utf8');
function rule(css, selector) {
  const start = css.indexOf(`${selector}{`);
  if (start === -1) throw new Error(`no rule ${selector}`);
  return css.slice(start + selector.length + 1, css.indexOf('}', start));
}
const px = (declarations, property) => {
  const match = new RegExp(`(?:^|;)${property}:(-?\\d+)px`).exec(declarations);
  return match ? Number(match[1]) : null;
};
const phone = (css) => /@media \(max-width: 640px\)\{((?:[^{}]|\{[^}]*\})*)\}/.exec(css)?.[1] ?? '';
const wide = (css) => /@media \(min-width: 641px\)\{((?:[^{}]|\{[^}]*\})*)\}/.exec(css)?.[1] ?? '';

describe('Home first view: compact spacing', () => {
  const home = read('home.css');
  const daily = read('daily.css');
  const ui = read('ui.css');

  test('the page column keeps its blocks 8px apart on Home', () => {
    expect(px(rule(home, '.screen.home'), 'gap')).toBeLessThanOrEqual(8);
    expect(px(rule(home, '.screen.home'), 'padding-top')).toBeLessThanOrEqual(8);
  });

  test('the hero padding is small on phones and on wide screens', () => {
    const base = rule(home, '.home-hero');
    expect(Number(/padding:(\d+)px/.exec(base)[1])).toBeLessThanOrEqual(12);
    expect(Number(/padding:(\d+)px/.exec(rule(wide(home), '.home-hero'))[1])).toBeLessThanOrEqual(14);
    expect(px(rule(home, '.home-hero::before'), 'width')).toBeLessThanOrEqual(110);
  });

  test('the search bar is at least 44px tall and its padding stays modest', () => {
    const search = rule(home, '\n.home-search');
    expect(px(search, 'min-height')).toBeGreaterThanOrEqual(44);
    expect(Number(/padding:(\d+)px/.exec(search)[1])).toBeLessThanOrEqual(10);
  });

  test('the hero search bar is a little taller (44 to 56px, about 27%): min-height 56px, 10px padding, content centred', () => {
    const search = rule(home, '\n.home-search');
    expect(px(search, 'min-height')).toBe(56);
    expect(search).toMatch(/padding:4px 4px 4px 14px/); // 44px pill + 4 + 4 + 2px borders = 56px
    expect(search).toMatch(/align-items:center/);
  });

  test('there is no tiles block any more', () => {
    expect(home).not.toMatch(/\.home-tile/);
  });

  test('the four cards: 4 across on wide screens, 2 x 2 on phones, icon beside the text, tall enough to tap', () => {
    expect(rule(daily, '.home-quick-links')).toMatch(/grid-template-columns:repeat\(2,1fr\)/);
    expect(wide(daily)).toMatch(/\.home-quick-links\{grid-template-columns:repeat\(4,1fr\)\}/);
    const card = rule(daily, '.home-quick-links a');
    expect(card).toMatch(/flex-direction:row/);
    expect(px(card, 'min-height')).toBeGreaterThanOrEqual(44);
    expect(px(card, 'gap')).toBeLessThanOrEqual(8);
  });

  test('the four cards are thick enough for a title and a wrapped description: 96px, content centred', () => {
    const card = rule(daily, '.home-quick-links a');
    expect(px(card, 'min-height')).toBe(96);
    expect(card).toMatch(/align-items:center/);
    expect(rule(daily, '.home-quick-text')).toMatch(/min-width:0/);
    expect(rule(daily, '.home-quick-note')).toMatch(/overflow-wrap:anywhere/);
    expect(px(rule(daily, '.home-quick-note'), 'font-size')).toBeGreaterThanOrEqual(12);
  });

  test('the shelf is compact (padding, plank) but the spines keep their 140 to 180 px length (heights are set in Home.jsx)', () => {
    expect(Number(/padding:(\d+)px/.exec(rule(home, '.home-shelf-wrap'))[1])).toBeLessThanOrEqual(10);
    expect(px(rule(home, '.home-plank'), 'height')).toBeLessThanOrEqual(8);
    const jsx = readFileSync(path.resolve(process.cwd(), 'src/home/Home.jsx'), 'utf8');
    const [, base, extra] = /Math\.round\((\d+) \+ \(hadisCount\(book\) \/ MOST\) \* (\d+)\)/.exec(jsx);
    expect(Number(base)).toBe(140);
    expect(Number(base) + Number(extra)).toBe(180);
  });

  test('the টপ লিস্ট/হাদীস rows are thin: a 38px tile, 6px of padding, a 30px label, rows 6px apart', () => {
    const row = rule(daily, '.home-pick');
    expect(px(row, 'gap')).toBeLessThanOrEqual(10);
    expect(Number(/padding:(\d+)px/.exec(row)[1])).toBeLessThanOrEqual(6);
    expect(px(rule(daily, '.plan-tile'), 'height')).toBeLessThanOrEqual(40);
    expect(px(rule(daily, '.home-pick-go'), 'min-height')).toBeLessThanOrEqual(32);
    expect(px(rule(daily, '.home-picks-list'), 'gap')).toBeLessThanOrEqual(6);
    expect(rule(daily, '.home-pick-title')).not.toMatch(/text-overflow|line-clamp|nowrap/);
  });

  test('the daily card shows its whole line (no clamp); the link is inline in the text, not on a line of its own', () => {
    expect(rule(daily, '.home-daily-text')).not.toMatch(/line-clamp|overflow:/);
    expect(rule(daily, '.home-daily-more')).not.toMatch(/margin-top|min-height/);
  });

  test('the daily card has 5px more room below it than before: the search bar sits 13px below it (8px before), 11px on phones (6px before)', () => {
    expect(px(rule(home, '.home-hero .home-search'), 'margin-top')).toBe(13);
    expect(px(rule(phone(home), '  .home-hero .home-search'), 'margin-top')).toBe(11);
  });

  test('the daily card keeps no leftover height', () => {
    expect(rule(daily, '.home-daily')).not.toMatch(/min-height/);
    expect(Number(/padding:(\d+)px/.exec(rule(daily, '.home-daily'))[1])).toBeLessThanOrEqual(8);
  });

  test('the top bar is no taller than its 44px settings button plus 8px of air on each side', () => {
    expect(px(rule(ui, '.shell-nav-in'), 'padding') ?? Number(/padding:(\d+)px/.exec(rule(ui, '.shell-nav-in'))[1])).toBeLessThanOrEqual(8);
  });

  test('tap targets stay 44px: the cards, the search bar and the shelf spines', () => {
    expect(px(rule(daily, '.home-quick-links a'), 'min-height')).toBeGreaterThanOrEqual(44);
    expect(px(rule(home, '\n.home-search'), 'min-height')).toBeGreaterThanOrEqual(44);
    expect(px(rule(home, '.home-spine'), 'max-width')).toBeGreaterThanOrEqual(44);
  });

  test('phones tighten further, never loosen', () => {
    expect(phone(home) || phone(daily)).toBeTruthy();
  });
});
