import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fireEvent, render, screen } from '@testing-library/react';
import { renderToStaticMarkup as toMarkup } from 'react-dom/server';
import { setUrl } from '../test/nextNavigation';
import RootLayout, { metadata } from './layout';
import HomePage from './page';
import SearchPage from './search/page';
import BooksPage from './books/page';
import TopicsPage from './topics/page';
import NotFoundPage from './not-found';

const pages = [
  ['/', HomePage],
  ['/search', SearchPage],
  ['/books', BooksPage],
  ['/topics', TopicsPage],
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
  render(<Page />);
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
])('%s is titled %s', (route, title, Page) => {
  setUrl(route);
  render(<Page />);
  expect(document.title).toBe(title);
});

test('choosing a book puts its name in the title', () => {
  render(<BooksPage />);
  fireEvent.click(screen.getByText('মুসলিম শরীফ'));
  expect(document.title).toBe('মুসলিম শরীফ - হাদীসের বই - BoiKotha');
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
});

test('site metadata names the site and describes it in Bengali', () => {
  expect(metadata.title).toBe('BoiKotha - হাদীস সম্ভার');
  expect(metadata.description).toContain('হাদীস');
  expect(metadata.manifest).toBe('/manifest.json');
});

test('the layout loads every global stylesheet, in the order the pages were designed with', () => {
  const source = readFileSync(path.resolve(process.cwd(), 'src/app/layout.jsx'), 'utf8');
  const stylesheets = [...source.matchAll(/import '([^']*\.css)';/g)].map((match) => match[1]);
  expect(stylesheets).toEqual(['../index.css', 'bootstrap/dist/css/bootstrap.min.css', '../App.css', '../Helpers/HadisView.css', '../Helpers/Loading.css', '../Helpers/NextPrev.css', '../Search/Search.css', '../Search/suggestions.css', '../Navbar/Navbar.css', '../Books/Book.css', '../Topics/HadisIndex.css', '../Topics/Topics.css', '../Home/Home.css']);
});
