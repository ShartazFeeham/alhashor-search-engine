import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const css = readFileSync(path.resolve(process.cwd(), 'src/styles/tokens.css'), 'utf8');

const required = [
  '--page', '--bg', '--surface', '--surface2', '--line', '--ink', '--ink2', '--ink3',
  '--accent', '--accent2', '--on-accent', '--accent-soft', '--hl', '--hl-ink',
  '--ok', '--warn', '--bad', '--link',
  '--bk-bukhari', '--bk-muslim', '--bk-tirmidhi', '--bk-abudawud', '--bk-ibnmajah', '--bk-nasai', '--on-bk',
  '--shadow', '--rs', '--rlh', '--rw', '--related-text', '--match-text',
];

test.each(required)('the light theme defines %s', (name) => {
  const light = css.slice(0, css.indexOf(':root[data-theme="dark"]'));
  expect(light).toMatch(new RegExp(`${name}\\s*:`));
});

test('dark and sepia redefine the colour variables', () => {
  for (const theme of ['dark', 'sepia']) {
    const block = css.slice(css.indexOf(`:root[data-theme="${theme}"]`));
    for (const name of ['--bg', '--surface', '--ink', '--accent']) {
      expect(block).toMatch(new RegExp(`${name}\\s*:`));
    }
  }
});

test('light is the default: the base block is light, and the device-dark copy only applies to an explicit device choice (no data-theme)', () => {
  const light = css.slice(0, css.indexOf(':root[data-theme="dark"]'));
  expect(light).toMatch(/color-scheme:\s*light/);
  expect(css).toContain('@media (prefers-color-scheme: dark)');
  expect(css).toContain(':root:not([data-theme])');
  expect(css.slice(0, 400)).not.toMatch(/no saved choice follows the device/);
});

test('the six book colours match the design', () => {
  expect(css).toContain('--bk-bukhari:#0f8663');
  expect(css).toContain('--bk-muslim:#3a63c8');
  expect(css).toContain('--bk-tirmidhi:#9e6a07');
  expect(css).toContain('--bk-abudawud:#8a4bb8');
  expect(css).toContain('--bk-ibnmajah:#c45227');
  expect(css).toContain('--bk-nasai:#c3387f');
});

// ---------- WCAG contrast of the tokens that carry text and focus rings ----------
function declarations(block) {
  const out = {};
  for (const [, name, value] of block.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) out[name] = value.trim();
  return out;
}

function blockOf(selector) {
  const start = css.indexOf(selector);
  const open = css.indexOf('{', start);
  return css.slice(open + 1, css.indexOf('}', open));
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
function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => channel(parseInt(hex.slice(i, i + 2), 16)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function ratio(a, b) {
  const [x, y] = [luminance(a), luminance(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

const names = Object.keys(themes);
const books = ['bukhari', 'muslim', 'tirmidhi', 'abudawud', 'ibnmajah', 'nasai'];

test('the contrast helper agrees with known values', () => {
  expect(ratio('#000000', '#ffffff')).toBeCloseTo(21, 0);
  expect(ratio('#777777', '#ffffff')).toBeCloseTo(4.48, 1);
});

describe.each(names)('contrast in the %s theme', (name) => {
  const t = themes[name];

  test.each(['--page', '--bg', '--surface', '--surface2', '--accent-soft'])('--ink3 text on %s is at least 4.5:1', (bg) => {
    expect(ratio(t['--ink3'], t[bg])).toBeGreaterThanOrEqual(4.5);
  });

  test('--ink2 (the home daily card text and citation) on the card surface is at least 4.5:1', () => {
    expect(ratio(t['--ink2'], t['--surface'])).toBeGreaterThanOrEqual(4.5);
  });

  test.each(['--page', '--bg', '--surface', '--surface2'])('--match-text (bold matching words) on %s is at least 4.5:1', (bg) => {
    expect(ratio(t['--match-text'], t[bg])).toBeGreaterThanOrEqual(4.5);
  });

  test.each(['--page', '--bg', '--surface', '--surface2'])('--related-text (similar hadis text) on %s is at least 4.5:1', (bg) => {
    expect(ratio(t['--related-text'], t[bg])).toBeGreaterThanOrEqual(4.5);
  });

  test('--match-text is softer than --related-text but still readable', () => {
    expect(ratio(t['--match-text'], t['--surface'])).toBeLessThan(ratio(t['--related-text'], t['--surface']));
    expect(t['--match-text']).not.toBe(t['--related-text']);
  });

  test('--ink3 stays quieter than --ink2 (the hierarchy is kept)', () => {
    expect(ratio(t['--ink3'], t['--page'])).toBeLessThan(ratio(t['--ink2'], t['--page']));
  });

  test('text on the accent colour is at least 4.5:1', () => {
    expect(ratio(t['--on-accent'], t['--accent'])).toBeGreaterThanOrEqual(4.5);
  });

  test.each(books)('the badge letter on the %s colour is at least 4.5:1', (book) => {
    expect(ratio(t['--on-bk'], t[`--bk-${book}`])).toBeGreaterThanOrEqual(4.5);
  });

  test('the focus ring colour (--accent2) is at least 3:1 on every background', () => {
    for (const bg of ['--page', '--bg', '--surface', '--surface2', '--accent-soft']) {
      expect(ratio(t['--accent2'], t[bg])).toBeGreaterThanOrEqual(3);
    }
  });
});

test('the automatic dark theme repeats the dark theme values', () => {
  const auto = declarations(css.slice(css.indexOf(':root:not([data-theme])')));
  for (const [key, value] of Object.entries(auto)) {
    expect(`${key}:${value}`).toBe(`${key}:${themes.dark[key]}`);
  }
});

test('the focus ring is a solid accent2 outline, not a translucent one', () => {
  const base = readFileSync(path.resolve(process.cwd(), 'src/styles/base.css'), 'utf8');
  const rule = base.slice(base.indexOf(':focus-visible'), base.indexOf('}', base.indexOf(':focus-visible')));
  expect(rule).toContain('var(--accent2)');
  expect(rule).not.toContain('transparent');
});

describe('the reading column width is a fixed constant', () => {
  test('--rw is a plain 34em custom property, set once in the light theme block', () => {
    expect(css).toMatch(/--rw\s*:\s*34em/);
    expect(css.match(/--rw\s*:/g)).toHaveLength(1);
  });

  test('nothing in src writes --rw at runtime (no setProperty, no inline style, no saved setting)', () => {
    const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) return walk(full);
      return /\.(jsx?|mjs)$/.test(e.name) && !/\.test\./.test(e.name) ? [full] : [];
    });
    const writers = walk(path.resolve(process.cwd(), 'src')).filter((file) => readFileSync(file, 'utf8').includes('--rw'));
    expect(writers).toEqual([]);
  });
});

// ---------- top picks: the list tile colours ----------
describe.each(names)('top picks tile colours in the %s theme', (name) => {
  const t = themes[name];
  const colours = ['rose', 'green', 'teal', 'magenta', 'amber', 'orange', 'grey', 'slate', 'sand', 'brown', 'yellow'];

  test.each(colours)('%s has a tile and an icon colour, at least 3:1 apart', (colour) => {
    expect(t[`--pick-${colour}-bg`]).toMatch(/^#[0-9a-f]{6}$/i);
    expect(t[`--pick-${colour}-fg`]).toMatch(/^#[0-9a-f]{6}$/i);
    expect(ratio(t[`--pick-${colour}-fg`], t[`--pick-${colour}-bg`])).toBeGreaterThanOrEqual(3);
  });

  test('the tiles are told apart from the card surface', () => {
    for (const colour of colours) expect(t[`--pick-${colour}-bg`]).not.toBe(t['--surface']);
  });
});

describe.each(names)('top picks progress ring colours in the %s theme', (name) => {
  const t = themes[name];

  test.each(['red', 'yellow', 'green'])('the %s arc is at least 3:1 on the card, and its track is a faint tint of its own', (band) => {
    expect(ratio(t[`--progress-${band}`], t['--surface'])).toBeGreaterThanOrEqual(3);
    expect(t[`--progress-${band}-track`]).toMatch(/^#[0-9a-f]{6}$/i);
    expect(ratio(t[`--progress-${band}-track`], t['--surface'])).toBeLessThan(ratio(t[`--progress-${band}`], t['--surface']));
  });
});

describe.each(names)('top picks progress text colours in the %s theme', (name) => {
  const t = themes[name];

  test('the label "আপনি পড়েছেন" is at least 4.5:1 on the card', () => {
    expect(ratio(t['--progress-label'], t['--surface'])).toBeGreaterThanOrEqual(4.5);
  });

  test.each(['red', 'yellow', 'green'])('the %s N/M text is at least 4.5:1 on the card and the same hue family as its ring arc', (band) => {
    expect(ratio(t[`--progress-${band}-text`], t['--surface'])).toBeGreaterThanOrEqual(4.5);
    expect(t[`--progress-${band}-text`]).toMatch(/^#[0-9a-f]{6}$/i);
  });
});

test('the label is #333 in the light theme', () => {
  expect(themes.light['--progress-label'].toLowerCase()).toBe('#333333');
});

// ---------- home cards: the filled icon colours ----------
describe.each(names)('home card icon colours in the %s theme', (name) => {
  const t = themes[name];

  test.each(['pink', 'blue', 'green', 'purple'])('%s is at least 3:1 on the card surface', (colour) => {
    expect(t[`--qi-${colour}`]).toMatch(/^#[0-9a-f]{6}$/i);
    expect(ratio(t[`--qi-${colour}`], t['--surface'])).toBeGreaterThanOrEqual(3);
  });
});

test('the automatic dark theme carries the same icon colours as the dark theme', () => {
  for (const colour of ['pink', 'blue', 'green', 'purple']) {
    expect(css.split(`--qi-${colour}:`).length - 1, colour).toBe(4);
  }
});

// ---------- top picks set page: the day number box (card colour on a solid box) ----------
describe.each(names)('day number boxes in the %s theme', (name) => {
  const t = themes[name];

  test('the number (card colour) is at least 4.5:1 on the box, done or not', () => {
    expect(ratio(t['--surface'], t['--accent2'])).toBeGreaterThanOrEqual(4.5);
    expect(ratio(t['--surface'], t['--ink3'])).toBeGreaterThanOrEqual(4.5);
  });
});

// ---------- top picks set page: the progress tree ----------
describe.each(names)('progress tree colours in the %s theme', (name) => {
  const t = themes[name];

  test.each(['trunk', 'leaf', 'canopy', 'seed'])('the %s is at least 3:1 on the hero background', (part) => {
    expect(t[`--tree-${part}`]).toMatch(/^#[0-9a-f]{6}$/i);
    expect(ratio(t[`--tree-${part}`], t['--surface'])).toBeGreaterThanOrEqual(3);
  });

  test('the ground line is a faint tint (below 3:1) but not invisible', () => {
    expect(ratio(t['--tree-ground'], t['--surface'])).toBeLessThan(3);
    expect(ratio(t['--tree-ground'], t['--surface'])).toBeGreaterThan(1.1);
  });
});

test('the automatic dark theme carries the tree colours too', () => {
  for (const part of ['trunk', 'leaf', 'canopy', 'canopy2', 'seed', 'ground']) {
    expect(css.split(`--tree-${part}:`).length - 1, part).toBe(4);
  }
});

test('the similar hadis text is #333 and the bold matching words #555 in the light theme', () => {
  expect(themes.light['--related-text']).toBe('#333333');
  expect(themes.light['--match-text']).toBe('#555555');
});

test('every theme block (including the device-dark one) defines both similar hadis tokens', () => {
  const blocks = css.split(/\n(?=:root|@media)/);
  expect(blocks.length).toBeGreaterThanOrEqual(4);
  for (const name of ['--related-text', '--match-text']) {
    expect(css.match(new RegExp(`${name}\\s*:`, 'g')).length).toBe(4);
  }
});

test('.related-text uses --related-text and .related-match uses --match-text', () => {
  const related = readFileSync(path.resolve(process.cwd(), 'src/styles/related.css'), 'utf8');
  expect(related).toMatch(/\.related-text\{[^}]*color:var\(--related-text\)/);
  expect(related).toMatch(/\.related-match\{[^}]*color:var\(--match-text\)/);
});
