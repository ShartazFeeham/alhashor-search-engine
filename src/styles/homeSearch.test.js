import { readFileSync } from 'node:fs';
import path from 'node:path';

// The hero search bar is the most important element of Home: dark text, accent border and glow,
// a solid "খুঁজুন" pill, and a short one-time glow pulse that reduced motion switches off.
const read = (name) => readFileSync(path.resolve(process.cwd(), 'src/styles', name), 'utf8');
const home = read('home.css');
const tokens = read('tokens.css');
function rule(css, selector) {
  const start = css.indexOf(`\n${selector}{`);
  if (start === -1) throw new Error(`no rule ${selector}`);
  const from = start + selector.length + 2;
  return css.slice(from, css.indexOf('}', from));
}

function declarations(block) {
  const out = {};
  for (const [, name, value] of block.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) out[name] = value.trim();
  return out;
}
function blockOf(selector) {
  const open = tokens.indexOf('{', tokens.indexOf(selector));
  return tokens.slice(open + 1, tokens.indexOf('}', open));
}
const light = declarations(blockOf(':root {'));
const themes = {
  light,
  dark: { ...light, ...declarations(blockOf(':root[data-theme="dark"]')) },
  sepia: { ...light, ...declarations(blockOf(':root[data-theme="sepia"]')) },
};
const channel = (c) => {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};
const luminance = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => channel(parseInt(hex.slice(i, i + 2), 16)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => {
  const [x, y] = [luminance(a), luminance(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};

const bar = rule(home, '.home-search');
const token = (declaration, property) => new RegExp(`(?:^|;)${property}:var\\((--[\\w-]+)\\)`).exec(declaration)?.[1];

describe('hero search bar stands out', () => {
  test('text uses --ink (not --ink3) at weight 600, 17px', () => {
    expect(token(bar, 'color')).toBe('--ink');
    expect(bar).toMatch(/font-weight:600/);
    expect(bar).toMatch(/font-size:17px/);
  });

  test.each(Object.keys(themes))('text on the bar background is at least 7:1 and darker than --ink3 in the %s theme', (name) => {
    const t = themes[name];
    const bg = t[token(bar, 'background')];
    const fg = t[token(bar, 'color')];
    expect(ratio(fg, bg)).toBeGreaterThanOrEqual(7);
    expect(ratio(fg, bg)).toBeGreaterThan(ratio(t['--ink3'], bg));
  });

  test('2px accent border and an accent glow shadow, with a stronger hover and focus state', () => {
    expect(bar).toMatch(/border:2px solid var\(--accent\)/);
    expect(bar).toMatch(/box-shadow:0 6px 20px color-mix\(in srgb,var\(--accent\) 28%,transparent\)/);
    const hover = rule(home, '.home-search:hover,.home-search:focus-visible');
    expect(hover).toMatch(/border-color:var\(--accent2\)/);
    expect(hover).toMatch(/box-shadow:0 8px 26px color-mix\(in srgb,var\(--accent\) 4\d%,transparent\)/);
  });

  test('the icon is accent2 and 24px', () => {
    expect(rule(home, '.home-search .ui-icon')).toMatch(/color:var\(--accent2\)/);
    expect(readFileSync(path.resolve(process.cwd(), 'src/home/Home.jsx'), 'utf8')).toMatch(/<Icon name="search" size=\{24\}/);
  });

  test('the text can truncate with an ellipsis next to the pill', () => {
    const text = rule(home, '.home-search>span:not(.home-search-go)');
    expect(text).toMatch(/flex:1/);
    expect(text).toMatch(/min-width:0/);
    expect(text).toMatch(/text-overflow:ellipsis/);
    expect(text).toMatch(/white-space:nowrap/);
  });

  test('the pill is solid accent, 44px tall, 16px bold, never shrinks', () => {
    const pill = rule(home, '.home-search-go');
    expect(pill).toMatch(/background:var\(--accent\)/);
    expect(pill).toMatch(/color:var\(--on-accent\)/);
    expect(pill).toMatch(/min-height:44px/);
    expect(pill).toMatch(/font-size:16px/);
    expect(pill).toMatch(/font-weight:700/);
    expect(pill).toMatch(/flex:none/);
  });

  test('a one-time two-cycle glow pulse, only when motion is allowed', () => {
    expect(home).toMatch(/@keyframes home-search-pulse/);
    const block = /@media \(prefers-reduced-motion: no-preference\)\{\s*\.home-search\{([^}]*)\}/.exec(home)?.[1] ?? '';
    expect(block).toMatch(/animation:home-search-pulse [^;]* 2(?:;|$)/);
    expect(home).not.toMatch(/infinite/);
  });
});
