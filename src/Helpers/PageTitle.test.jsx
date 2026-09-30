import { render } from '@testing-library/react';
import PageTitle, { pageTitle } from './PageTitle';

test('no parts gives the home title', () => {
  expect(pageTitle()).toBe('BoiKotha - হাদীস সম্ভার');
});

test('parts are joined and followed by the site name; empty parts are skipped', () => {
  expect(pageTitle('হাদীস সার্চ')).toBe('হাদীস সার্চ - BoiKotha');
  expect(pageTitle('রোজা', 'হাদীস সার্চ')).toBe('রোজা - হাদীস সার্চ - BoiKotha');
  expect(pageTitle('', 'হাদীস সার্চ')).toBe('হাদীস সার্চ - BoiKotha');
  expect(pageTitle(null, undefined, 'হাদীসের বই')).toBe('হাদীসের বই - BoiKotha');
});

test('renders a real <title> that the browser shows', () => {
  render(<PageTitle parts={['হাদীসের বই']} />);
  expect(document.title).toBe('হাদীসের বই - BoiKotha');
});

test('the title follows the parts when they change', () => {
  const { rerender } = render(<PageTitle parts={['এক']} />);
  rerender(<PageTitle parts={['দুই']} />);
  expect(document.title).toBe('দুই - BoiKotha');
});

test('with no parts it is the home title', () => {
  render(<PageTitle />);
  expect(document.title).toBe('BoiKotha - হাদীস সম্ভার');
});
