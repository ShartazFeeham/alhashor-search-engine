import { render } from '@testing-library/react';
import PageTitle, { pageTitle } from './PageTitle';

test('no parts gives the home title', () => {
  expect(pageTitle()).toBe('Alhashor - হাদীস সম্ভার');
});

test('parts are joined and followed by the site name; empty parts are skipped', () => {
  expect(pageTitle('হাদীস সার্চ')).toBe('হাদীস সার্চ - Alhashor');
  expect(pageTitle('রোজা', 'হাদীস সার্চ')).toBe('রোজা - হাদীস সার্চ - Alhashor');
  expect(pageTitle('', 'হাদীস সার্চ')).toBe('হাদীস সার্চ - Alhashor');
  expect(pageTitle(null, undefined, 'হাদীসের বই')).toBe('হাদীসের বই - Alhashor');
});

test('renders a real <title> that the browser shows', () => {
  render(<PageTitle parts={['হাদীসের বই']} />);
  expect(document.title).toBe('হাদীসের বই - Alhashor');
});

test('the title follows the parts when they change', () => {
  const { rerender } = render(<PageTitle parts={['এক']} />);
  rerender(<PageTitle parts={['দুই']} />);
  expect(document.title).toBe('দুই - Alhashor');
});

test('with no parts it is the home title', () => {
  render(<PageTitle />);
  expect(document.title).toBe('Alhashor - হাদীস সম্ভার');
});
