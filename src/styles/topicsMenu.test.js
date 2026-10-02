import { readFileSync } from 'node:fs';
import path from 'node:path';

const css = readFileSync(path.resolve(process.cwd(), 'src/styles/topics.css'), 'utf8');
const rule = (source, selector) => {
  const start = source.indexOf(`${selector}{`);
  if (start === -1) throw new Error(`no rule ${selector}`);
  return source.slice(start + selector.length + 1, source.indexOf('}', start));
};
const wide = css.slice(css.indexOf('@media (min-width: 900px)'));
const px = (declarations, property) => Number(new RegExp(`(?:^|;)${property}:(\\d+)px`).exec(declarations)?.[1] ?? NaN);

test('from 900px the page is two columns: a 320 to 360px menu and the content', () => {
  expect(css).toContain('@media (min-width: 900px)');
  const layout = rule(wide, '.topics-layout');
  expect(layout).toMatch(/display:grid/);
  expect(layout).toMatch(/grid-template-columns:(3[2-6]\d)px minmax\(0,1fr\)/);
});

test('the sidebar is sticky with its own vertical scroll', () => {
  const menu = rule(wide, 'nav.topics-menu');
  expect(menu).toMatch(/position:sticky/);
  expect(menu).toMatch(/top:\d+px/);
  expect(menu).toMatch(/max-height:calc\(100vh/);
  expect(rule(css, '.topics-scroll')).toMatch(/overflow-y:auto/);
});

test('the topics are a grid that fills with 96 to 110px columns', () => {
  const grid = rule(css, '.topics-chips');
  expect(grid).toMatch(/display:grid/);
  const min = /grid-template-columns:repeat\(auto-fill,minmax\((\d+)px,1fr\)\)/.exec(grid);
  expect(min).not.toBeNull();
  expect(Number(min[1])).toBeGreaterThanOrEqual(96);
  expect(Number(min[1])).toBeLessThanOrEqual(110);
});

test('chips and letter headings keep their type floors (13px bold headings, 13px chips)', () => {
  expect(px(rule(css, '.topics-chip'), 'font-size')).toBeGreaterThanOrEqual(13);
  const heading = rule(css, '.topics-letter');
  expect(px(heading, 'font-size')).toBeGreaterThanOrEqual(13);
  expect(heading).toMatch(/font-weight:700/);
});

test('the top row is one thin 36px row: the search shrinks, the select sits at its right', () => {
  expect(rule(css, '.topics-menu-row')).toMatch(/display:flex/);
  const field = rule(css, '.topics-field');
  expect(field).toMatch(/flex:1/);
  expect(field).toMatch(/min-width:0/);
  expect(px(field, 'height')).toBe(36);
  expect(px(rule(css, '.topics-sort'), 'height')).toBe(36);
  expect(rule(css, '.topics-sort')).toMatch(/flex:none/);
});

test('on a phone the menu is a fixed full-screen overlay with a 44px close button', () => {
  const overlay = rule(css, '.topics-menu.is-overlay');
  expect(overlay).toMatch(/position:fixed/);
  expect(overlay).toMatch(/inset:0/);
  const close = rule(css, '.topics-menu-close');
  expect(px(close, 'width')).toBe(44);
  expect(px(close, 'height')).toBe(44);
});

test('the opener button is slim (40px) with a 44px tap area, and hidden from 900px', () => {
  const open = rule(css, '.topics-open');
  expect(px(open, 'min-height')).toBe(40);
  expect(css).toMatch(/\.topics-open::after\{[^}]*inset:-2px/);
  expect(rule(wide, '.topics-open')).toMatch(/display:none/);
});

test('nothing sideways at 320px: the main column can shrink', () => {
  expect(rule(css, '.topics-main')).toMatch(/min-width:0/);
});
