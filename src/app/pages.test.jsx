import { readFileSync } from 'node:fs';
import path from 'node:path';
import { render, screen } from '@testing-library/react';
import { renderToStaticMarkup as toMarkup } from 'react-dom/server';
import { SettingsProvider } from '../settings/SettingsProvider';
import { setUrl } from '../test/nextNavigation';
import RootLayout, { metadata } from './layout';
import HomePage from './page';
import SearchPage from './search/page';
import BooksPage from './books/page';
import TopicsPage from './topics/page';
import NotFoundPage from './not-found';
import SettingsRoute from './settings/page';

const pages = [
  ['/', HomePage],
  ['/search', SearchPage],
  ['/books', BooksPage],
  ['/topics', TopicsPage],
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
  ['/', 'BoiKotha - হাদীস সম্ভার', HomePage],
  ['/search', 'হাদীস সার্চ - BoiKotha', SearchPage],
  ['/search?q=রোজা', 'রোজা - হাদীস সার্চ - BoiKotha', SearchPage],
  ['/books', 'হাদীসের বই - BoiKotha', BooksPage],
  ['/topics', 'বিষয়ভিত্তিক হাদীস - BoiKotha', TopicsPage],
  ['/topics?topic=ঈমান', 'ঈমান - বিষয়ভিত্তিক হাদীস - BoiKotha', TopicsPage],
  ['/settings', 'পড়ার সেটিংস - BoiKotha', SettingsRoute],
])('%s is titled %s', (route, title, Page) => {
  setUrl(route);
  render(<SettingsProvider><Page /></SettingsProvider>);
  expect(document.title).toBe(title);
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
  expect(html).toContain('Back to top');
  expect(html).toContain('aria-label="নিচের মেনু"');
  expect(html).toContain('ছয়টি প্রধান গ্রন্থ');
});

test('site metadata names the site and describes it in Bengali', () => {
  // Every page sets its own <title> (see PageTitle); a layout title would overwrite it in the browser.
  expect(metadata.title).toBeUndefined();
  expect(metadata.description).toContain('হাদীস');
  expect(metadata.manifest).toBe('/manifest.json');
});

test('the layout loads every global stylesheet, in the order the pages were designed with', () => {
  const source = readFileSync(path.resolve(process.cwd(), 'src/app/layout.jsx'), 'utf8');
  const stylesheets = [...source.matchAll(/import '([^']*\.css)';/g)].map((match) => match[1]);
  expect(stylesheets).toEqual(['../index.css', 'bootstrap/dist/css/bootstrap.min.css', '../App.css', '../Helpers/HadisView.css', '../Helpers/Loading.css', '../Helpers/NextPrev.css', '../Topics/HadisIndex.css', '../Topics/Topics.css', '../styles/tokens.css', '../styles/base.css', '../styles/ui.css', '../styles/home.css', '../styles/hadis.css', '../styles/search.css', '../styles/books.css']);
});
