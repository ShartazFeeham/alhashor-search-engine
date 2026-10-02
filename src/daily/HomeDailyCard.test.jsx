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
  expect(card).toMatch(/--home-daily-fs:12px/);
  expect(card).toContain('--home-daily-ink:var(--ink2)');
  expect(excerpt).toMatch(/line-height:1\.[67]\d*[;}]/);
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

  // jsdom has no layout; a test says how tall the text really is by faking these two.
  function fakeLayout(scroll, client) {
    Object.defineProperty(HTMLElement.prototype, 'scrollHeight', { configurable: true, get: () => scroll });
    Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, get: () => client });
  }
  afterEach(() => {
    delete HTMLElement.prototype.scrollHeight;
    delete HTMLElement.prototype.clientHeight;
  });

  test('a very short real hadis (under 12 words): the link follows the last word on the same line, no ellipsis', async () => {
    const real = realHadis((_, words) => words < 12);
    withText(real.raw);
    renderCard();
    const excerpt = await screen.findByTestId('home-daily-text');
    expect(excerpt).toHaveTextContent(real.shown);
    expect(excerpt.textContent).not.toMatch(/…|\.\.\./);
    expect(body()).toHaveAttribute('data-link', 'inline');
    const paragraph = within(body()).getByTestId('home-daily-flow');
    expect(within(paragraph).getByTestId('home-daily-text')).toBe(excerpt);
    expect(within(paragraph).getByRole('link', { name: 'আরও দেখুন' })).toBe(link());
    expect(paragraph.textContent.trim()).toBe(`${real.shown} আরও দেখুন`);
    expect(link()).toContainHTML('<svg');
  });

  test('a medium real hadis that ends inside two lines: also an inline link, no ellipsis', async () => {
    const real = realHadis((shown) => shown.length > 55 && shown.length <= 100);
    withText(real.raw);
    renderCard();
    const excerpt = await screen.findByTestId('home-daily-text');
    expect(excerpt).toHaveTextContent(real.shown);
    expect(excerpt.textContent).not.toMatch(/…|\.\.\./);
    expect(body()).toHaveAttribute('data-link', 'inline');
    expect(within(within(body()).getByTestId('home-daily-flow')).getByRole('link', { name: 'আরও দেখুন' })).toBe(link());
  });

  test('a long real hadis is cut with an ellipsis and the link moves to the corner, outside the text', async () => {
    const real = realHadis((shown) => shown.length > 300);
    withText(real.raw);
    renderCard();
    const excerpt = await screen.findByTestId('home-daily-text');
    expect(excerpt.textContent).toMatch(/…$/);
    expect(real.shown.startsWith(excerpt.textContent.slice(0, -1))).toBe(true);
    expect(body()).toHaveAttribute('data-link', 'corner');
    const paragraph = within(body()).getByTestId('home-daily-flow');
    expect(within(paragraph).queryByRole('link')).not.toBeInTheDocument();
    expect(within(body()).getByRole('link', { name: 'আরও দেখুন' })).toBe(link());
    expect(paragraph.compareDocumentPosition(link()) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  test('a text that is not cut but still needs more than two lines (narrow phone, big text size) moves the link to the corner', async () => {
    const real = realHadis((shown) => shown.length > 55 && shown.length <= 100);
    withText(real.raw);
    fakeLayout(120, 58);
    renderCard();
    const excerpt = await screen.findByTestId('home-daily-text');
    expect(excerpt).toHaveTextContent(real.shown);
    expect(body()).toHaveAttribute('data-link', 'corner');
    expect(within(within(body()).getByTestId('home-daily-flow')).queryByRole('link')).not.toBeInTheDocument();
    expect(within(card()).getAllByRole('link')).toHaveLength(1);
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

describe('the stylesheet for the corner link and the compact card', () => {
  test('the corner mode is two columns, text then link at the bottom right; the inline mode is plain flow', () => {
    const css = readFileSync(path.resolve(process.cwd(), 'src/styles/daily.css'), 'utf8');
    const corner = css.split('\n').find((rule) => rule.startsWith('.home-daily-body[data-link="corner"]{'));
    expect(corner).toContain('display:grid');
    expect(corner).toContain('grid-template-columns:minmax(0,1fr) auto');
    expect(corner).toContain('align-items:end');
    expect(cssRule('.home-daily-body')).not.toContain('display:grid');
  });

  test('the link has a 44px hit area, the accent colour, and an underline on hover and focus', () => {
    const css = readFileSync(path.resolve(process.cwd(), 'src/styles/daily.css'), 'utf8');
    const more = cssRule('.home-daily-more');
    expect(more).toContain('color:var(--accent2)');
    expect(more).toContain('white-space:nowrap');
    expect(css).toMatch(/\.home-daily-more:hover,\.home-daily-more:focus-visible\{text-decoration:underline\}/);
    expect(css.split('\n').find((rule) => rule.startsWith('.home-daily-body[data-link="corner"] .home-daily-more{'))).toContain('min-height:44px');
    // inline, the 44px comes from padding that does not change the line height
    expect(css.split('\n').find((rule) => rule.startsWith('.home-daily-flow .home-daily-more{'))).toMatch(/padding:\d+px/);
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
