import { render, screen, within } from '@testing-library/react';
import { renderToStaticMarkup as toMarkup } from 'react-dom/server';
import { FEATURED_SET_NUMBERS, ALL_SETS, featuredSets } from '../lib/topPicks';
import { SettingsProvider } from '../settings/SettingsProvider';
import HomeTopPicks from './HomeTopPicks';

// Twelve sets with a description and hadis, so a title-only row is a real choice.
const SETS = Array.from({ length: 12 }, (_, index) => ({
  id: `set-${index + 1}`,
  number: index + 1,
  title: `সেটের নাম ${index + 1}`,
  description: `বর্ণনা ${index + 1}`,
  days: [{ book: 'bukhari', number: index + 1 }, { book: 'muslim', number: index + 1 }],
}));
const FEATURED = featuredSets(SETS);
const wrap = (sets) => (
  <SettingsProvider>
    <HomeTopPicks sets={sets} />
  </SettingsProvider>
);
const rows = () => within(screen.getByRole('list')).getAllByRole('listitem');
const hrefs = () => within(screen.getByRole('list')).getAllByRole('link').map((link) => link.getAttribute('href'));

afterEach(() => vi.restoreAllMocks());

test('the featured sets are numbers 5, 1, 4, 6, 2, and the real ones never include another set or an empty set', () => {
  expect(FEATURED_SET_NUMBERS).toEqual([5, 1, 4, 6, 2]);
  expect(FEATURED.map((set) => set.number)).toEqual([5, 1, 4, 6, 2]);
  for (const set of featuredSets()) {
    expect(FEATURED_SET_NUMBERS).toContain(set.number);
    expect(set.days.length).toBeGreaterThan(0);
  }
  expect(featuredSets().every((set) => ALL_SETS.includes(set))).toBe(true);
});

test('shows exactly three different sets, only from the featured ones, whatever the random numbers are', () => {
  for (const value of [0, 0.2, 0.5, 0.99]) {
    vi.spyOn(Math, 'random').mockReturnValue(value);
    const { unmount } = render(wrap(FEATURED));
    const ids = hrefs().filter((href) => href !== '/top-picks').map((href) => href.split('/').pop());
    expect(ids).toHaveLength(3);
    expect(new Set(ids).size).toBe(3);
    for (const id of ids) expect(FEATURED.map((set) => set.id)).toContain(id);
    expect(ids.some((id) => ['set-3', 'set-7', 'set-8', 'set-9', 'set-10', 'set-11', 'set-12'].includes(id))).toBe(false);
    unmount();
  }
});

test('a row is the title and a পড়ুন label, nothing else: no description, no count', () => {
  render(wrap(FEATURED));
  for (const row of rows()) {
    const link = within(row).getByRole('link');
    expect(link).toHaveAccessibleName(/^সেটের নাম \d+ পড়ুন$/);
    expect(within(link).getByText('পড়ুন')).toBeInTheDocument();
    expect(link.textContent).not.toMatch(/বর্ণনা|হাদীস$|টি/);
  }
  expect(screen.queryByText(/বর্ণনা/)).not.toBeInTheDocument();
});

test('each row opens its own set page, and the heading opens the list', () => {
  render(wrap(FEATURED));
  for (const row of rows()) {
    const link = within(row).getByRole('link');
    const title = within(link).getByText(/^সেটের নাম/).textContent;
    const set = FEATURED.find((entry) => entry.title === title);
    expect(link).toHaveAttribute('href', `/top-picks/${set.id}`);
  }
  expect(screen.getByRole('heading', { level: 2, name: 'টপ লিস্ট/হাদীস' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'টপ লিস্ট/হাদীস' })).toHaveAttribute('href', '/top-picks');
});

test('every row has the colour tile with an aria-hidden list icon', () => {
  render(wrap(FEATURED));
  expect(screen.getAllByTestId('pick-tile')).toHaveLength(3);
  for (const icon of screen.getAllByTestId('icon-list')) expect(icon).toHaveAttribute('aria-hidden', 'true');
});

test('the pre-built page and the first render show the first three, the same on the server and in the browser', () => {
  vi.spyOn(Math, 'random').mockReturnValue(0.99);
  const markup = toMarkup(wrap(FEATURED));
  for (const set of FEATURED.slice(0, 3)) expect(markup).toContain(set.title);
  expect(markup).not.toContain(FEATURED[3].title);
  expect(markup).toContain('href="/top-picks/set-1"');
});

test('after mounting the three are chosen at random, and a visit with other random numbers shows other sets', () => {
  vi.spyOn(Math, 'random').mockReturnValue(0);
  const view = render(wrap(FEATURED));
  const one = hrefs();
  view.unmount();
  vi.spyOn(Math, 'random').mockReturnValue(0.99);
  render(wrap(FEATURED));
  expect(hrefs()).not.toEqual(one);
});

test('with fewer than three featured sets it shows those, and with none it shows nothing at all', () => {
  const { unmount } = render(wrap(FEATURED.slice(0, 2)));
  expect(rows()).toHaveLength(2);
  unmount();
  render(wrap([]));
  expect(screen.queryByRole('heading')).not.toBeInTheDocument();
  expect(screen.queryByRole('list')).not.toBeInTheDocument();
});
