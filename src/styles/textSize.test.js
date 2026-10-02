import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { DEFAULT_SETTINGS } from '../settings/settings';

// "Text size: two steps smaller" (docs/redesign-plan.md, last section). One step is 1px for sizes
// of 14px and up and 0.5px below that; no text goes under 11px; the reading size is 16px by default.
const dir = path.resolve(process.cwd(), 'src/styles');
const files = readdirSync(dir).filter((f) => f.endsWith('.css'));
const css = Object.fromEntries(files.map((f) => [f, readFileSync(path.join(dir, f), 'utf8')]));


// Removes comments and every @media print block (print sizes are in pt and left alone).
function screenCss(source) {
  let out = source.replace(/\/\*[\s\S]*?\*\//g, '');
  for (;;) {
    const at = out.search(/@media\s+print/);
    if (at < 0) return out;
    let depth = 0;
    let i = out.indexOf('{', at);
    for (; i < out.length; i++) {
      if (out[i] === '{') depth++;
      if (out[i] === '}' && --depth === 0) break;
    }
    out = out.slice(0, at) + out.slice(i + 1);
  }
}

// Size in px of a font-size value, with the reading size at `rs` px and body text at 15px.
function toPx(value, rs) {
  const expr = value
    .replace(/var\(--rs\)/g, `(${rs})`)
    .replace(/var\(--home-daily-fs\)/g, '13px')
    .replace(/([\d.]+)rem/g, '($1*16)')
    .replace(/([\d.]+)vw/g, '($1*0)')
    .replace(/([\d.]+)em/g, '($1*15)')
    .replace(/([\d.]+)px/g, '$1')
    .replace(/^calc/, '');
  if (!/^[\d\s.+\-*/()]+$/.test(expr)) return null;
  return Function(`return ${expr}`)();
}

function sizes(rs) {
  const found = [];
  for (const [file, source] of Object.entries(css)) {
    const text = screenCss(source);
    for (const [, selector, body] of text.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      for (const [, v] of body.matchAll(/(?:^|;)\s*font-size\s*:\s*([^;]+)/g)) {
        const value = v.trim();
        if (value === 'inherit') continue;
        found.push({ file, selector: selector.trim(), value, px: toPx(value, rs) });
      }
      for (const [, v] of body.matchAll(/(?:^|;)\s*font\s*:\s*[^;]*?([\d.]+(?:px|rem))/g)) {
        found.push({ file, selector: selector.trim(), value: v, px: toPx(v, rs) });
      }
    }
  }
  return found;
}

test('the base reading size is the new default, in the tokens and in the settings', () => {
  expect(DEFAULT_SETTINGS.size).toBe(16);
  expect(css['tokens.css']).toMatch(/--rs\s*:\s*16px/);
});

test('body text is 15px (the floor for reading text)', () => {
  expect(screenCss(css['base.css'])).toMatch(/body\s*\{[^}]*font-size:\s*0\.9375rem/);
});

test('every font-size can be measured (nothing slipped past the parser)', () => {
  const all = sizes(DEFAULT_SETTINGS.size);
  expect(all.length).toBeGreaterThan(100);
  expect(all.filter((s) => s.px === null || Number.isNaN(s.px))).toEqual([]);
});

// The visitor may now choose any size from 3 to 30px, so only the default size carries the floor;
// at a size the visitor picked on purpose, the text that follows --rs follows it too.
test.each([
  ['the default reading size', DEFAULT_SETTINGS.size],
])('no font-size is below 11px at %s', (_, rs) => {
  const tooSmall = sizes(rs).filter((s) => s.px < 11);
  expect(tooSmall).toEqual([]);
});

test('hadis reading text stays at 15px or more at the default size', () => {
  const reading = ['.hadis-read', '.hcard-text', '.search-text', '.related-text', '.hadis-chain-full'];
  const all = sizes(DEFAULT_SETTINGS.size);
  for (const name of reading) {
    const hit = all.filter((s) => s.selector === name);
    expect(hit.length, name).toBeGreaterThan(0);
    for (const s of hit) expect(s.px, name).toBeGreaterThanOrEqual(15);
  }
});

// The owner asked for the Home daily card's excerpt to match its citation line (13px, set by
// --home-daily-fs, 13px), so it is the one reading text deliberately under the 15px floor, but not under 13px.
test('the home daily excerpt is as small as its citation, and no smaller than 13px', () => {
  const all = sizes(DEFAULT_SETTINGS.size);
  const of = (selector) => all.find((s) => s.selector === selector)?.px;
  expect(of('.home-daily-text')).toBe(of('.home-daily-cite'));
  expect(of('.home-daily-text')).toBe(13);
});

test('the main sizes after the change', () => {
  const all = sizes(DEFAULT_SETTINGS.size);
  const of = (selector) => all.find((s) => s.selector === selector)?.px;
  expect(of('.hadis-read')).toBe(16);
  expect(of('.h1')).toBe(24);
  expect(of('.ui-btn.sm')).toBe(12);
  expect(of('.shell-tabbar a,.shell-tabbar button')).toBe(11);
  expect(of('.ui-btn')).toBe(14);
  expect(of('.ui-chip')).toBe(14);
});

test('headings stay larger than the text under them', () => {
  const all = sizes(DEFAULT_SETTINGS.size);
  const of = (selector) => all.find((s) => s.selector === selector).px;
  expect(of('.h1')).toBeGreaterThan(of('.hadis-read'));
  expect(of('.topics-name')).toBeGreaterThan(of('.hadis-read'));
  expect(of('.daily .h2,.home-picks .h2')).toBeGreaterThan(of('.hadis-read'));
});
