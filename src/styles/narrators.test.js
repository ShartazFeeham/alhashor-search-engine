import { readFileSync } from 'node:fs';
import path from 'node:path';

const css = readFileSync(path.resolve(process.cwd(), 'src/styles/narrators.css'), 'utf8');
// The declarations of the first rule whose selector is exactly `selector`.
function rule(selector) {
  const start = css.indexOf(`${selector}{`);
  if (start === -1) throw new Error(`no rule ${selector}`);
  return css.slice(start + selector.length + 1, css.indexOf('}', start));
}
const px = (declarations, property) => Number(new RegExp(`(?:^|;)${property}:(-?\\d+)px`).exec(declarations)?.[1] ?? 0);

describe('narrators.css', () => {
  test('takes every colour from the theme tokens, so light, dark and sepia all work', () => {
    const outsideVars = css.replace(/var\(--[a-z0-9-]+\)/g, '').replace(/color-mix\([^;]*?\)(?=;|\})/g, '');
    expect(outsideVars).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(outsideVars).not.toMatch(/\brgba?\(/);
    for (const token of ['--surface', '--ink', '--ink2', '--line', '--accent', '--on-accent', '--accent-soft']) {
      expect(css).toContain(`var(${token})`);
    }
  });

  test.each(['.narr-row', '.narr-chip', '.narr-pager a,.narr-pager [aria-disabled="true"]', '.narr-field input', '.narr-more'])(
    '%s is at least 44px tall',
    (selector) => {
      expect(px(rule(selector), 'min-height')).toBeGreaterThanOrEqual(44);
    }
  );

  test('the back link has a 44px target', () => {
    expect(px(rule('.narr-back'), 'min-height')).toBeGreaterThanOrEqual(44);
  });

  test('a long name wraps instead of pushing the row sideways', () => {
    expect(rule('.narr-name')).toMatch(/overflow-wrap:anywhere/);
    expect(rule('.narr-row')).toMatch(/grid-template-columns:minmax\(0,1fr\) auto/);
    expect(rule('.narr-title')).toMatch(/overflow-wrap:anywhere/);
  });

  test('the book chips wrap onto more lines on a narrow phone', () => {
    expect(rule('.narr-chips')).toMatch(/flex-wrap:wrap/);
  });

  test('the page column is narrow, like Topics', () => {
    expect(rule('.narrators')).toMatch(/max-width:760px/);
  });

  test('the chosen chip uses the accent with its readable text colour', () => {
    const chosen = rule('.narr-chip[aria-current="true"]');
    expect(chosen).toMatch(/background:var\(--accent\)/);
    expect(chosen).toMatch(/color:var\(--on-accent\)/);
  });

  test('the loading line stops moving for visitors who prefer reduced motion (base.css switches animation off)', () => {
    const base = readFileSync(path.resolve(process.cwd(), 'src/styles/base.css'), 'utf8');
    expect(base).toMatch(/prefers-reduced-motion: reduce/);
    expect(base).toMatch(/animation-duration:\s*0\.01ms\s*!important/);
  });
});
