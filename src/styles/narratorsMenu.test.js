import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const read = (file) => readFileSync(path.resolve(process.cwd(), file), 'utf8');

// The narrators page wears the topics page: the same classes, so the sidebar, the top row and the
// phone overlay have the same values (see topicsMenu.test.js for the values themselves).
test('the narrators page uses the topics classes for the sidebar, the top row, the chips and the overlay', () => {
  const source = ['src/narrators/NarratorsPage.jsx', 'src/narrators/NarratorIndex.jsx', 'src/topics/NameMenu.jsx'].map(read).join('\n');
  for (const name of ['topics-layout', 'topics-main', 'topics-menu', 'is-overlay', 'topics-menu-row', 'topics-field', 'topics-sort', 'topics-scroll', 'topics-block', 'topics-letter', 'topics-chips', 'topics-chip', 'topics-open', 'topics-menu-close']) {
    expect(source).toContain(name);
  }
  expect(read('src/narrators/NarratorsPage.jsx')).toContain('topics-layout');
  expect(read('src/narrators/NarratorIndex.jsx')).toContain('NameMenu');
});

test('the old narrators layout is gone: no narr- classes in the page (the bars live in their own components), no narrators.css, one menu component for both pages', () => {
  expect(existsSync(path.resolve(process.cwd(), 'src/styles/narrators.css'))).toBe(false);
  for (const file of ['NarratorList', 'NarratorPager', 'NarratorBookFilter']) {
    expect(existsSync(path.resolve(process.cwd(), `src/narrators/${file}.jsx`))).toBe(false);
  }
  expect(read('src/narrators/NarratorsPage.jsx')).not.toMatch(/narr-/);
  expect(read('src/topics/TopicIndex.jsx')).toContain('NameMenu');
});

const css = read('src/styles/topics.css');
const rule = (selector) => {
  const start = css.indexOf(`${selector}{`);
  if (start === -1) throw new Error(`no rule ${selector}`);
  return css.slice(start + selector.length + 1, css.indexOf('}', start));
};

test('a narrator is one row of the menu width: 36px high, name left with an ellipsis, count right in muted tabular numbers', () => {
  const row = rule('.topics-row');
  expect(row).toMatch(/display:flex/);
  expect(row).toMatch(/height:36px/);
  expect(row).toMatch(/font-size:13px/);
  expect(rule('.topics-row-name')).toMatch(/flex:1/);
  expect(rule('.topics-row-name')).toMatch(/min-width:0/);
  expect(rule('.topics-row-name')).toMatch(/text-overflow:ellipsis/);
  expect(rule('.topics-row-name')).toMatch(/white-space:nowrap/);
  const count = rule('.topics-row-count');
  expect(count).toMatch(/margin-left:auto|flex:none/);
  expect(count).toMatch(/color:var\(--ink2\)/);
  expect(count).toMatch(/font-variant-numeric:tabular-nums/);
  expect(rule('.topics-row::after')).toMatch(/inset:-4px 0/);
});
