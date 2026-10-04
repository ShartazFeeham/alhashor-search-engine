import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { render, screen } from '@testing-library/react';
import { renderToStaticMarkup as toMarkup } from 'react-dom/server';
import { SettingsProvider } from '../settings/SettingsProvider';
import { setUrl } from '../test/nextNavigation';
import RootLayout, { metadata, viewport } from './layout';
import HomePage from './page';
import SearchPage from './search/page';
import BooksPage from './books/page';
import TopicsPage from './topics/page';
import DailyRoute, { metadata as dailyMetadata } from './daily/page';
import TopPicksRoute, { metadata as topPicksMetadata } from './top-picks/page';
import NarratorsRoute from './narrators/page';
import NotFoundPage from './not-found';
import SettingsRoute from './settings/page';

const pages = [
  ['/', HomePage],
  ['/search', SearchPage],
  ['/books', BooksPage],
  ['/topics', TopicsPage],
  ['/daily', DailyRoute],
  ['/top-picks', TopPicksRoute],
  ['/narrators', NarratorsRoute],
  ['/narrators?name=abu-hurayrah&page=2&book=muslim', NarratorsRoute],
  ['/settings', SettingsRoute],
];

beforeEach(() => {
  global.fetch = vi.fn(() => Promise.resolve({ ok: false }));
});

afterEach(() => {
  delete global.fetch;
});

test.each(pages)('page %s renders without React warnings', (path, Page) => {
  const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
  setUrl(path);
  render(<SettingsProvider><Page /></SettingsProvider>);
  const messages = errors.mock.calls.map((call) => String(call[0]));
  errors.mockRestore();
  expect(messages).toEqual([]);
});

test.each([
  ['/', 'Alhashor - হাদীস সম্ভার', HomePage],
  ['/search', 'হাদীস সার্চ - Alhashor', SearchPage],
  ['/search?q=রোজা', 'রোজা - হাদীস সার্চ - Alhashor', SearchPage],
  ['/books', 'হাদীসের বই - Alhashor', BooksPage],
  ['/topics', 'বিষয়ভিত্তিক হাদীস - Alhashor', TopicsPage],
  ['/topics?topic=ঈমান', 'ঈমান - বিষয়ভিত্তিক হাদীস - Alhashor', TopicsPage],
  ['/daily', 'আজকের হাদীস - Alhashor', DailyRoute],
  ['/top-picks', 'টপ লিস্ট/হাদীস - Alhashor', TopPicksRoute],
  ['/narrators', 'বর্ণনাকারী - Alhashor', NarratorsRoute],
  ['/narrators?name=abu-hurayrah', 'বর্ণনাকারী - Alhashor', NarratorsRoute], // the narrator's name joins the title once the index has loaded (NarratorsPage.test.jsx)
  ['/settings', 'পড়ার সেটিংস - Alhashor', SettingsRoute],
])('%s is titled %s', (route, title, Page) => {
  setUrl(route);
  render(<SettingsProvider><Page /></SettingsProvider>);
  expect(document.title).toBe(title);
});

test('the daily route has a pre-built title for the first paint', () => {
  expect(dailyMetadata.title).toBe('আজকের হাদীস - Alhashor');
});

test('the top picks route has a pre-built title for the first paint', () => {
  expect(topPicksMetadata.title).toBe('টপ লিস্ট/হাদীস - Alhashor');
  expect(topPicksMetadata.description).toBe('সবথেকে জনপ্রিয় হাদীসের সংগ্রহ');
});

test('there is no compare route', () => {
  expect(existsSync(path.resolve(process.cwd(), 'src/app/compare'))).toBe(false);
  expect(existsSync(path.resolve(process.cwd(), 'src/compare'))).toBe(false);
});

test('the narrators route is static and sets no pre-built title (the page sets one that includes the narrator\'s name)', () => {
  const source = readFileSync(path.resolve(process.cwd(), 'src/app/narrators/page.jsx'), 'utf8');
  expect(source).not.toMatch(/export const metadata|generateMetadata|searchParams|dynamic\s*=/);
  expect(source).toContain('<Suspense');
});

test('the not-found page explains and links home', () => {
  render(<NotFoundPage />);
  expect(screen.getByText('পৃষ্ঠাটি পাওয়া যায়নি')).toBeInTheDocument();
  expect(screen.getByText('হোম পেজে ফিরে যান').getAttribute('href')).toBe('/');
});

test('the layout sets the language and wraps each page with the navigation', () => {
  const html = toMarkup(
    <RootLayout>
      <p>PAGE BODY</p>
    </RootLayout>
  );
  expect(html).toContain('<html lang="bn"');
  expect(html).toContain('href="/search"');
  expect(html).toContain('PAGE BODY');
  expect(html).toContain('উপরে যান');
  expect(html).toContain('aria-label="নিচের মেনু"');
  // the site has no footer: no landmark, no footer menu, no total line
  expect(html).not.toContain('shell-footer');
  expect(html).not.toContain('<footer');
  expect(html).not.toContain('ফুটার মেনু');
  expect(html).not.toContain('৩২,৮৮৬ হাদীস');
});

test('the browser bar colour is the light page colour by default (not black, not the device)', () => {
  expect(viewport.themeColor).toBe('#f2f8f6');
  expect(viewport.colorScheme).toBe('light');
});

test('the server renders the light theme, so the first paint and hydration are light on every device', () => {
  const html = toMarkup(<RootLayout><p>PAGE BODY</p></RootLayout>);
  expect(html).toMatch(/<html[^>]*data-theme="light"/);
});

test('site metadata names the site and describes it in Bengali', () => {
  // Every page sets its own <title> (see PageTitle); a layout title would overwrite it in the browser.
  expect(metadata.title).toBeUndefined();
  expect(metadata.description).toContain('হাদীস');
  expect(metadata.manifest).toBe('/manifest.json');
});

test('the layout loads every global stylesheet, in order', () => {
  const source = readFileSync(path.resolve(process.cwd(), 'src/app/layout.jsx'), 'utf8');
  const stylesheets = [...source.matchAll(/import '([^']*\.css)';/g)].map((match) => match[1]);
  expect(stylesheets).toEqual(['../styles/tokens.css', '../styles/base.css', '../styles/ui.css', '../styles/home.css', '../styles/hadis.css', '../styles/search.css', '../styles/books.css', '../styles/topics.css', '../styles/share.css', '../styles/daily.css', '../styles/related.css', '../styles/homeNarrators.css']);
});

test('the layout renders no compare provider or bar', () => {
  const source = readFileSync(path.resolve(process.cwd(), 'src/app/layout.jsx'), 'utf8');
  expect(source).not.toMatch(/compare/i);
  expect(source).toContain('<TopNav />');
});

describe('skip link and main landmark', () => {
  const html = () => toMarkup(<RootLayout><p>PAGE BODY</p></RootLayout>);

  test('the first link in the body skips to the main content, ahead of the navigation', () => {
    const markup = html();
    const body = markup.slice(markup.indexOf('<body'));
    const firstLink = /<a [^>]*>/.exec(body)[0];
    expect(firstLink).toContain('href="#main"');
    expect(firstLink).toContain('class="skip-link"');
    expect(body.indexOf('মূল অংশে যান')).toBeLessThan(body.indexOf('href="/search"'));
    expect(body.indexOf('মূল অংশে যান')).toBeLessThan(body.indexOf('PAGE BODY'));
  });

  test('the skip link is visible on focus and uses the theme colours', () => {
    const css = readFileSync(path.resolve(process.cwd(), 'src/styles/base.css'), 'utf8');
    expect(css).toMatch(/\.skip-link:focus[^{]*\{[^}]*top:\s*\d/);
    expect(css).toMatch(/\.skip-link\{[^}]*var\(--on-accent\)/);
  });

  test('every page component renders a main that the link can target', () => {
    const files = readdirSync(path.resolve(process.cwd(), 'src'), { recursive: true })
      .filter((file) => file.endsWith('.jsx') && !file.includes('.test.'));
    const mains = files.flatMap((file) => {
      const source = readFileSync(path.resolve(process.cwd(), 'src', file), 'utf8');
      return [...source.matchAll(/<main\b[^>]*>/g)].map((match) => match[0]);
    });
    expect(mains.length).toBeGreaterThanOrEqual(12);
    for (const tag of mains) {
      expect(tag).toContain('id="main"');
      expect(tag).toContain('tabIndex={-1}');
    }
  });

  test.each(pages)('page %s has one main with that id', (route, Page) => {
    setUrl(route);
    render(<SettingsProvider><Page /></SettingsProvider>);
    const mains = screen.getAllByRole('main');
    expect(mains).toHaveLength(1);
    expect(mains[0]).toHaveAttribute('id', 'main');
    expect(mains[0]).toHaveAttribute('tabindex', '-1');
  });

  test('the not-found page has it too', () => {
    render(<NotFoundPage />);
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main');
  });
});
