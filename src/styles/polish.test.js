import { readFileSync } from 'node:fs';
import path from 'node:path';

const read = (name) => readFileSync(path.resolve(process.cwd(), 'src/styles', name), 'utf8');
// The declarations of the first rule whose selector is exactly `selector`.
function rule(css, selector) {
  const start = css.indexOf(`${selector}{`);
  if (start === -1) throw new Error(`no rule ${selector}`);
  return css.slice(start + selector.length + 1, css.indexOf('}', start));
}

describe('home bookshelf on phones', () => {
  const home = read('home.css');

  test('the spines share the row and shrink instead of keeping a fixed width', () => {
    const spine = rule(home, '.home-spine');
    expect(spine).toMatch(/flex:1 1 0/);
    expect(spine).toMatch(/min-width:0/);
    expect(spine).not.toMatch(/(^|;)width:/);
  });

  test('the gaps are small enough that six spines of 36px fit in a 256px card (320px phone)', () => {
    const gap = Number(/gap:(\d+)px/.exec(rule(home, '.home-shelf'))[1]);
    expect(6 * 36 + 5 * gap).toBeLessThanOrEqual(256);
  });

  test('desktop keeps the 72px spines', () => {
    expect(home).toMatch(/@media \(min-width: 641px\)\{[^@]*\.home-spine\{max-width:72px\}/);
  });

  test('the spine text does not use opacity (it would lower the contrast)', () => {
    expect(rule(home, '.home-spine-count')).not.toMatch(/opacity/);
  });
});

describe('tap targets of 44px', () => {
  const ui = read('ui.css');

  test.each(['.ui-btn.sm', '.ui-chip'])('%s is at least 44px tall', (selector) => {
    expect(Number(/min-height:(\d+)px/.exec(rule(ui, selector))[1])).toBeGreaterThanOrEqual(44);
  });

  test('the Aa / settings icon button is 44px square', () => {
    const declarations = rule(ui, '.shell-iconbtn');
    expect(declarations).toMatch(/width:44px/);
    expect(declarations).toMatch(/height:44px/);
  });
});

describe('search tap targets', () => {
  const search = read('search.css');
  const px = (declarations, property) => Number(new RegExp(`(?:^|;)${property}:(\\d+)px`).exec(declarations)?.[1] ?? 0);

  test('the result actions (copy, share, compare, full hadis, hadis page) are 44px tall', () => {
    const declarations = rule(search, '.search-item-actions a,.search-item-actions button');
    expect(px(declarations, 'min-height')).toBeGreaterThanOrEqual(44);
    expect(declarations).toMatch(/display:inline-flex/);
  });

  test('the taller actions do not make the list heavier: the row pulls back what they add', () => {
    const [, top, bottom] = /margin:(-?\d+)px 0 (-?\d+)px/.exec(rule(search, '.search-item-actions'));
    expect(Number(top)).toBeLessThan(0);
    expect(Number(bottom)).toBeLessThan(0);
    expect(-Number(top) - Number(bottom)).toBeGreaterThanOrEqual(18);
  });

  test('the result title link has a 44px hit area through padding that its margin gives back', () => {
    const declarations = rule(search, '.search-item-head a');
    expect(declarations).toMatch(/padding:10px 0/);
    expect(declarations).toMatch(/margin:-10px 0/);
  });

  test('the search button is 44px tall', () => {
    expect(px(rule(search, '.search-go'), 'min-height')).toBeGreaterThanOrEqual(44);
  });

  test('the did-you-mean chips and the near-words chip are 44px', () => {
    expect(px(rule(search, '.search-dym .ui-chip'), 'min-height')).toBeGreaterThanOrEqual(44);
    expect(px(rule(search, '.search-near .ui-chip'), 'min-height')).toBeGreaterThanOrEqual(44);
  });
});

describe('the other stylesheets keep their controls at 44px', () => {
  test.each([
    ['compare.css', '.cmp-icon-btn', 'height'],
    ['compare.css', '.cmp-bar-link', 'min-height'],
    ['compare.css', '.cmp-bar-clear', 'height'],
    ['compare.css', '.cmp-col-head a', 'min-height'],
    ['compare.css', '.cmp-remove', 'height'],
    ['share.css', '.share-icon-btn', 'height'],
    ['share.css', '.share-back', 'min-height'],
    ['daily.css', '.daily-tabs a', 'min-height'],
    ['daily.css', '.daily-recent-head a', 'min-height'],
    ['daily.css', '.plan-back', 'min-height'],
    ['daily.css', '.plan-day-more', 'min-height'],
    ['daily.css', '.khut-icon', 'height'],
    ['related.css', '.related-link', 'min-height'],
  ])('%s %s has a %s of at least 44px', (file, selector, property) => {
    const match = new RegExp(`(?:^|;)${property}:(\\d+)px`).exec(rule(read(file), selector));
    expect(Number(match[1])).toBeGreaterThanOrEqual(44);
  });
});

describe('the toast', () => {
  test('is as wide as its message (up to the screen), so a short sentence stays on one line', () => {
    const toast = rule(read('ui.css'), '.ui-toast');
    expect(toast).toMatch(/width:max-content/);
    expect(toast).toMatch(/max-width:calc\(100vw - 32px\)/);
  });
});

// The page is a full-height column (main grows, the footer is last) and the phone tab bar is fixed
// to the bottom, so a short page (not found) does not float the bar or the footer mid-screen.
describe('page shell layout', () => {
  const ui = read('ui.css');
  const base = read('base.css');
  const compare = read('compare.css');
  const phone = (css) => /@media \(max-width: 640px\)\{([^@]*)\}/.exec(css)?.[1] ?? '';

  test('the body is a full-height flex column and main grows', () => {
    const body = /\nbody \{([^}]*)\}/.exec(base)[1];
    expect(body).toMatch(/display:\s*flex/);
    expect(body).toMatch(/flex-direction:\s*column/);
    expect(body).toMatch(/min-height:\s*100dvh/);
    const main = rule(ui, 'body>main');
    expect(main).toMatch(/flex:1 0 auto/);
    expect(main).toMatch(/width:100%/);
  });

  test('the footer keeps its width in the column and sits last (no auto margins shrink it)', () => {
    expect(rule(ui, '.shell-footer')).toMatch(/flex:none/);
    expect(rule(ui, '.shell-footer')).toMatch(/width:calc\(100% - 32px\)/);
  });

  test('the phone tab bar is a fixed floating pill (as in D2), lifted by the safe-area inset', () => {
    const bar = rule(ui, '.shell-tabbar');
    expect(bar).toMatch(/position:fixed/);
    expect(bar).toMatch(/bottom:calc\(10px \+ env\(safe-area-inset-bottom/);
    expect(bar).toMatch(/left:12px/);
    expect(bar).toMatch(/right:12px/);
    expect(bar).toMatch(/border-radius:2\d+px[;}]/); // all four corners rounded, not just the top
    expect(bar).not.toMatch(/position:sticky/);
  });

  test('on phones the body reserves room for the bar and the compare bar, on wide screens only the compare bar', () => {
    expect(rule(ui, '.shell-tabbar')).not.toMatch(/margin/);
    expect(rule(ui, 'body')).toMatch(/padding-bottom:calc\(var\(--tabbar-h\) \+ var\(--dock-extra\)\)/);
    expect(rule(ui, ':root')).toMatch(/--tabbar-h:0px/);
    expect(phone(ui)).toMatch(/--tabbar-h:calc\(\d+px \+ env\(safe-area-inset-bottom/);
    expect(rule(ui, 'body.has-cmp-bar')).toMatch(/--dock-extra:\d+px/);
  });

  test('the compare bar sits above the tab bar, and back-to-top above the compare bar', () => {
    expect(rule(compare, '.cmp-bar')).toMatch(/bottom:calc\(var\(--tabbar-h\) \+ \d+px\)/);
    const fab = rule(compare, 'body.has-cmp-bar .ui-fab');
    const bottom = Number(/calc\(var\(--tabbar-h\) \+ (\d+)px\)/.exec(fab)[1]);
    const barBottom = Number(/calc\(var\(--tabbar-h\) \+ (\d+)px\)/.exec(rule(compare, '.cmp-bar'))[1]);
    expect(bottom).toBeGreaterThanOrEqual(barBottom + 56 + 4);
    expect(rule(ui, '.ui-fab')).toMatch(/bottom:calc\(var\(--tabbar-h\) \+ \d+px\)/);
  });

  test('the footer links keep clear of the back-to-top button', () => {
    expect(ui).toMatch(/\.shell-footer-links\{[^}]*padding-right:\d+px/);
  });
});

describe('links in the daily pages use the accent, not the default blue', () => {
  const daily = read('daily.css');

  test('the khutbah help links and the plan-day full-hadis link', () => {
    for (const selector of ['.khut-add .tiny a', '.plan-day-more']) {
      const declarations = rule(daily, selector);
      expect(declarations).toMatch(/color:var\(--accent2\)/);
      expect(declarations).not.toMatch(/--link/);
      expect(declarations).not.toMatch(/text-decoration:underline/);
    }
    expect(daily).toMatch(/\.khut-add \.tiny a:hover,\.khut-add \.tiny a:focus-visible\{[^}]*underline/);
    expect(daily).toMatch(/\.plan-day-more:hover,\.plan-day-more:focus-visible\{[^}]*underline/);
    expect(rule(daily, '.plan-day-more')).toMatch(/min-height:44px/);
  });
});

describe('daily tabs on a narrow phone', () => {
  const daily = read('daily.css');

  test('a label and its count badge stay on one line; the group scrolls rather than overflowing the page', () => {
    expect(rule(daily, '.daily-tabs a')).toMatch(/white-space:nowrap/);
    expect(rule(daily, '.daily-tabs')).toMatch(/overflow-x:auto/);
    expect(rule(daily, '.daily-tabs a')).toMatch(/flex:1 1 auto/);
  });
});

describe('topic chips scroller', () => {
  test('its edges fade, so a half-clipped chip looks intentional', () => {
    const declarations = rule(read('topics.css'), '.topics-chips');
    expect(declarations).toMatch(/mask-image:linear-gradient\(to bottom/);
    expect(declarations).toMatch(/scroll-padding/);
  });
});
