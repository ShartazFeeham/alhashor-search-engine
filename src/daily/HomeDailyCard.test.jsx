/* eslint-disable testing-library/no-node-access */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import { pickDaily } from '../lib/dailyPick';
import { SettingsProvider } from '../settings/SettingsProvider';
import { splitHadis } from '../lib/hadisText';
import { diskFetch, realShortList, realText } from '../test/hadisFixtures';
import HomeDailyCard from './HomeDailyCard';
import { clearDailyPicksCache } from './useHomePick';
import { clearShortListCache } from './useShortList';

const NOW = new Date(2026, 9, 2, 10, 0);
const pick = () => pickDaily(realShortList(), NOW);
const renderCard = () => render(<SettingsProvider><HomeDailyCard /></SettingsProvider>);
const card = () => screen.getByRole('region', { name: 'আজকের হাদীস' });

// Serves everything from disk, but the one hadis text of the day is replaced by `text`.
function withText(text) {
  const { book, number } = pick();
  const own = `/${book.folder}/${String(number).padStart(4, '0')}/text.txt`;
  global.fetch = vi.fn((url) =>
    url.endsWith(own) ? Promise.resolve({ ok: true, json: () => Promise.resolve(text) }) : diskFetch(url),
  );
}

async function settle() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
  clearShortListCache();
  clearDailyPicksCache();
  global.fetch = vi.fn(diskFetch);
});

afterEach(async () => {
  await settle();
  vi.useRealTimers();
  delete global.fetch;
});

test('cuts a long real hadis with an ellipsis and still shows the link', async () => {
  const { book, number } = pick();
  renderCard();
  const excerpt = await screen.findByTestId('home-daily-text');
  expect(excerpt.textContent).toMatch(/…$/);
  expect(excerpt.textContent).not.toMatch(/\.\.\./);
  expect(within(card()).getByRole('link', { name: 'আরও দেখুন' })).toHaveAttribute('href', `/hadis/${book.id}/${number}`);
  expect(realText(book.id, number).length).toBeGreaterThan(excerpt.textContent.length);
});

test('never cuts inside a word', async () => {
  const words = Array.from({ length: 80 }, (_, index) => `শব্দ${'ক'.repeat(index % 7)}`);
  withText(`১২৩। ${words.join(' ')}`);
  renderCard();
  const excerpt = (await screen.findByTestId('home-daily-text')).textContent;
  expect(excerpt.endsWith('…')).toBe(true);
  const kept = excerpt.slice(0, -1).split(' ');
  expect(kept.every((word) => words.includes(word))).toBe(true);
  expect(excerpt).not.toMatch(/^১২৩/);
});

test('a very short hadis is shown whole, with no ellipsis, and still has the link', async () => {
  withText('৫। রাসূলুল্লাহ (সাঃ) বলেছেনঃ সত্য কথা বল।');
  const { book, number } = pick();
  renderCard();
  const excerpt = await screen.findByTestId('home-daily-text');
  expect(excerpt).toHaveTextContent('রাসূলুল্লাহ (সাঃ) বলেছেনঃ সত্য কথা বল।');
  expect(excerpt.textContent).not.toMatch(/…|\.\.\./);
  expect(excerpt.textContent).not.toMatch(/^\s*৫/);
  const link = within(card()).getByRole('link', { name: 'আরও দেখুন' });
  expect(link).toHaveAttribute('href', `/hadis/${book.id}/${number}`);
  expect(link).toContainHTML('<svg');
});

test('shows a loading card, with the heading and no link, until the pick and its text arrive', async () => {
  renderCard();
  expect(within(card()).getByLabelText('লোড হচ্ছে')).toHaveAttribute('aria-busy', 'true');
  expect(within(card()).queryByRole('link')).not.toBeInTheDocument();
  await screen.findByTestId('home-daily-text');
  expect(within(card()).queryByLabelText('লোড হচ্ছে')).not.toBeInTheDocument();
});

test('renders nothing when the daily pick cannot load', async () => {
  global.fetch = vi.fn(() => Promise.resolve({ ok: false }));
  const { container } = renderCard();
  await waitFor(() => expect(container).toBeEmptyDOMElement());
});

test('renders nothing when the text of the pick cannot load', async () => {
  const { book, number } = pick();
  const own = `/${book.folder}/${String(number).padStart(4, '0')}/text.txt`;
  global.fetch = vi.fn((url) => (url.endsWith(own) ? Promise.resolve({ ok: false }) : diskFetch(url)));
  const { container } = renderCard();
  await waitFor(() => expect(container).toBeEmptyDOMElement());
});

test('clamps the excerpt to two lines, on every width, in the stylesheet', () => {
  const css = readFileSync(path.resolve(process.cwd(), 'src/styles/daily.css'), 'utf8');
  const rules = css.split('\n').filter((line) => line.startsWith('.home-daily-text{'));
  expect(rules).toHaveLength(1);
  expect(rules[0]).toContain('-webkit-line-clamp:2');
  expect(rules[0]).toContain('line-clamp:2');
  expect(rules[0]).toContain('overflow:hidden');
  expect(rules[0]).not.toMatch(/line-clamp:3/);
  // no media rule gives the excerpt more room
  expect(css.slice(css.indexOf('@media (min-width: 641px)'))).not.toContain('.home-daily-text');
});

test('the excerpt has the same size and colour as the citation line, from shared tokens', () => {
  const excerpt = cssRule('.home-daily-text');
  const cite = cssRule('.home-daily-cite');
  expect(excerpt).toContain('font-size:var(--home-daily-fs)');
  expect(cite).toContain('font-size:var(--home-daily-fs)');
  expect(excerpt).toContain('color:var(--home-daily-ink)');
  expect(cite).toContain('color:var(--home-daily-ink)');
  const card = cssRule('.home-daily');
  expect(card).toMatch(/--home-daily-fs:13px/);
  expect(card).toContain('--home-daily-ink:var(--ink2)');
  expect(excerpt).toMatch(/line-height:1\.[67]\d*[;}]/);
});

describe('the whole card is one link', () => {
  test('has a single link, to the hadis page, still labelled "আরও দেখুন", and no other interactive element', async () => {
    const { book, number } = pick();
    renderCard();
    await screen.findByTestId('home-daily-text');
    const links = within(card()).getAllByRole('link');
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute('href', `/hadis/${book.id}/${number}`);
    expect(links[0]).toHaveTextContent('আরও দেখুন');
    expect(within(card()).queryByRole('button')).not.toBeInTheDocument();
    expect(links[0].querySelector('a, button')).toBeNull();
  });

  test('the click target covers the card: the card is the containing block of the link\'s stretched ::after', () => {
    expect(cssRule('.home-daily')).toMatch(/position:relative/);
    const stretch = cssRule('.home-daily-more::after');
    expect(stretch).toMatch(/content:""/);
    expect(stretch).toMatch(/position:absolute/);
    expect(stretch).toMatch(/inset:0/);
    const css = readFileSync(path.resolve(process.cwd(), 'src/styles/daily.css'), 'utf8');
    // nothing between the link and the card may become the containing block
    for (const selector of ['.home-daily-body', '.home-daily-text']) {
      expect(cssRule(selector), selector).not.toMatch(/position:(relative|absolute|fixed|sticky)/);
    }
    expect(css).not.toMatch(/\.home-daily-more\{[^}]*overflow/);
  });

  test('has a hover state and a visible keyboard focus ring on the whole card', () => {
    const css = readFileSync(path.resolve(process.cwd(), 'src/styles/daily.css'), 'utf8');
    expect(css).toMatch(/\.home-daily:hover\{[^}]*background:var\(--[a-z0-9-]+\)/);
    expect(css).toMatch(/\.home-daily:has\(\.home-daily-more:focus-visible\)\{[^}]*outline:2px solid var\(--accent\)/);
  });
});

test('the excerpt is short enough for about two lines', async () => {
  renderCard();
  const excerpt = await screen.findByTestId('home-daily-text');
  expect(excerpt.textContent.length).toBeLessThanOrEqual(110);
});

const cssRule = (selector) => {
  const css = readFileSync(path.resolve(process.cwd(), 'src/styles/daily.css'), 'utf8');
  const rules = css.split('\n').filter((line) => line.startsWith(`${selector}{`));
  expect(rules).toHaveLength(1);
  return rules[0];
};

// The first real Bukhari hadis (from the short list) whose displayed text satisfies `fits`.
function realHadis(fits) {
  for (const number of realShortList().BUK) {
    const raw = realText('bukhari', number);
    const { chain, body } = splitHadis(raw);
    const shown = `${chain} ${body}`.replace(/\s+/g, ' ').trim();
    if (fits(shown, shown.split(' ').length)) return { raw, shown };
  }
  throw new Error('no such real hadis');
}

describe('where the link goes', () => {
  const body = () => screen.getByTestId('home-daily-body');
  const link = () => within(card()).getByRole('link', { name: 'আরও দেখুন' });

  test('the text takes the whole width of the card and the link is on its own line below it, for a short and a long hadis', async () => {
    for (const fits of [(_, words) => words < 12, (shown) => shown.length > 300]) {
      const real = realHadis(fits);
      withText(real.raw);
      clearShortListCache();
      clearDailyPicksCache();
      const { unmount } = renderCard();
      const excerpt = await screen.findByTestId('home-daily-text');
      const paragraph = excerpt.closest('p');
      expect(paragraph).toHaveClass('home-daily-text');
      expect(within(paragraph).queryByRole('link')).not.toBeInTheDocument();
      expect(paragraph).toHaveTextContent(excerpt.textContent);
      expect(body()).toContainElement(link());
      expect(paragraph.compareDocumentPosition(link()) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(link()).toContainHTML('<svg');
      expect(body().children).toHaveLength(2);
      unmount();
    }
  });

  test('a short hadis is shown whole, with no ellipsis', async () => {
    const short = realHadis((_, words) => words < 12);
    withText(short.raw);
    renderCard();
    expect((await screen.findByTestId('home-daily-text')).textContent).toBe(short.shown);
  });

  test('the link always goes to the full hadis page, wherever it sits', async () => {
    const { book, number } = pick();
    renderCard();
    await screen.findByTestId('home-daily-text');
    expect(link()).toHaveAttribute('href', `/hadis/${book.id}/${number}`);
  });

  test('the citation stays outside the text block, on one line above it', async () => {
    renderCard();
    await screen.findByTestId('home-daily-text');
    const cite = within(card()).getByText(/হাদীস নং/);
    expect(body()).not.toContainElement(cite);
    expect(cite.compareDocumentPosition(body()) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(cssRule('.home-daily-cite')).toContain('white-space:nowrap');
  });
});

describe('the stylesheet for the link row and the compact card', () => {
  test('the body is a plain column: the text, then the link on the right edge below it (no grid, no side-by-side)', () => {
    const css = readFileSync(path.resolve(process.cwd(), 'src/styles/daily.css'), 'utf8');
    expect(css).not.toMatch(/data-link|home-daily-flow/);
    const bodyRule = cssRule('.home-daily-body');
    expect(bodyRule).toContain('display:flex');
    expect(bodyRule).toContain('flex-direction:column');
    expect(bodyRule).not.toContain('display:grid');
    expect(cssRule('.home-daily-more')).toContain('align-self:flex-end');
  });

  test('the link is accent coloured, underlined on hover and focus; the tap area is the whole card', () => {
    const css = readFileSync(path.resolve(process.cwd(), 'src/styles/daily.css'), 'utf8');
    const more = cssRule('.home-daily-more');
    expect(more).toContain('color:var(--accent2)');
    expect(more).toContain('white-space:nowrap');
    expect(css).toMatch(/\.home-daily-more:hover,\.home-daily-more:focus-visible\{text-decoration:underline\}/);
  });

  test('the card has no min-height of its own: only the loading state holds a height, of about two lines', () => {
    expect(cssRule('.home-daily')).not.toContain('min-height');
    const loading = cssRule('.home-daily-loading');
    const height = Number(/min-height:(\d+)px/.exec(loading)[1]);
    expect(height).toBeGreaterThanOrEqual(90);
    expect(height).toBeLessThanOrEqual(110);
  });

  test('the card and the hero around it are compact: 6 to 12px gaps, 6 to 12px card padding', () => {
    const px = (rule, property) => Number(new RegExp(`${property}:(\\d+)px`).exec(rule)[1]);
    const card = cssRule('.home-daily');
    expect(/padding:(\d+)px (\d+)px/.exec(card).slice(1).map(Number).every((value) => value >= 6 && value <= 12)).toBe(true);
    expect(/margin:(\d+)px 0 0/.test(card)).toBe(true);
    const gap = Number(/margin:(\d+)px 0 0/.exec(card)[1]);
    expect(gap).toBeGreaterThanOrEqual(6);
    expect(gap).toBeLessThanOrEqual(12);
    const home = readFileSync(path.resolve(process.cwd(), 'src/styles/home.css'), 'utf8');
    const search = Number(/\.home-hero \.home-search\{margin-top:(\d+)px\}/.exec(home)[1]);
    expect(search).toBeGreaterThanOrEqual(6);
    expect(search).toBeLessThanOrEqual(12);
    const bottoms = [...home.matchAll(/\.home-hero\{[^}]*padding:(\d+)px (\d+)px/g)].map((match) => Number(match[1]));
    expect(bottoms.length).toBeGreaterThan(0);
    expect(bottoms.every((value) => value >= 8 && value <= 14)).toBe(true);
    expect(px(cssRule('.home-daily'), 'gap')).toBeLessThanOrEqual(8);
  });
});
