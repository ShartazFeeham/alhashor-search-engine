import { readFileSync } from 'node:fs';
import path from 'node:path';

const css = readFileSync(path.resolve(process.cwd(), 'src/styles/homeNarrators.css'), 'utf8');
const rule = (selector) => css.slice(css.indexOf(`${selector}{`) + selector.length + 1, css.indexOf('}', css.indexOf(`${selector}{`)));

describe('home narrators styles', () => {
  test('the colour legend is one line that never wraps, in a 11px or larger font', () => {
    expect(rule('.home-narr-legend')).toMatch(/display:flex/);
    expect(rule('.home-narr-legend')).toMatch(/flex-wrap:nowrap/);
    expect(rule('.home-narr-legend')).toMatch(/white-space:nowrap/);
    expect(Number(/font-size:(\d+)px/.exec(rule('.home-narr-legend'))[1])).toBeGreaterThanOrEqual(11);
    expect(rule('.home-narr-legend i')).toMatch(/border-radius:50%/);
  });

  test('the legend, the rows and their card: one surface with a shadow, names bold only here', () => {
    expect(rule('.home-narr-card')).toMatch(/background:var\(--surface\)/);
    expect(rule('.home-narr-card')).toMatch(/box-shadow:var\(--shadow\)/);
    expect(rule('.home-narr .narr-plain')).toMatch(/font-weight:700/);
  });

  test('"সব দেখুন" is an outlined pill button: transparent, accent border and text, a 44px target', () => {
    const all = rule('.home-narr-all');
    expect(all).toMatch(/min-height:44px/);
    expect(all).toMatch(/border:1\.5px solid var\(--accent\)/);
    expect(all).toMatch(/background:transparent/);
    expect(all).toMatch(/color:var\(--accent\)/);
    expect(all).toMatch(/border-radius:99px/);
  });

  test('on a phone the section is last (order 4, after the shelf 2 and the achievements 3)', () => {
    const phone = /@media \(max-width: 640px\)\{([^]*)\}/.exec(css)[1];
    expect(phone).toMatch(/\.home-narr\{order:4\}/);
  });

  test('the tooltip never takes the pointer, so a click goes to the row link', () => {
    expect(rule('.home-narr-tip')).toMatch(/pointer-events:none/);
    expect(rule('.home-narr .narr-bar')).toMatch(/pointer-events:auto/);
  });

  test('colours are theme tokens only (all three themes)', () => {
    expect(css.replace(/var\(--[a-z0-9-]+\)/g, '')).not.toMatch(/#[0-9a-fA-F]{3,8}\b|\brgba?\(/);
  });
});
