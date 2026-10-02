import { render, screen } from '@testing-library/react';
import { renderToStaticMarkup as toMarkup } from 'react-dom/server';
import { SettingsProvider } from '../settings/SettingsProvider';
import { ToastProvider } from '../ui/Toast';
import { realText } from '../test/hadisFixtures';
import HadisPage from './HadisPage';

const wrap = (page) => (
  <SettingsProvider>
    <ToastProvider>{page}</ToastProvider>
  </SettingsProvider>
);

afterEach(() => {
  delete global.fetch;
});

test('the server markup already holds the saying, the h1 and the folded chain', () => {
  const text = realText('bukhari', 6628);
  const html = toMarkup(wrap(<HadisPage bookId="bukhari" number={6628} initialText={text} />));
  expect(html).toContain('তিনি বলেন, বর্তমান যুগের মুনাফিকরা');
  expect(html).toContain('আর আজ করে প্রকাশ্যে।');
  expect(html).toContain('<h1>বুখারী শরীফ - হাদীস নং ৬,৬২৮</h1>');
  expect(html).toContain('বর্ণনায়:');
  expect(html).not.toContain('লোড হচ্ছে');
});

test('the server markup has no <title> of its own: the route metadata sets the only one', () => {
  expect(toMarkup(wrap(<HadisPage bookId="bukhari" number={6628} initialText={realText('bukhari', 6628)} />))).not.toContain('<title');
  expect(toMarkup(wrap(<HadisPage bookId="bukhari" number={63} initialText={null} />))).not.toContain('<title');
});

test('a page that must fetch its own text still sets its title', () => {
  expect(toMarkup(wrap(<HadisPage bookId="bukhari" number={6628} />))).toContain('<title>বুখারী শরীফ - হাদীস নং ৬,৬২৮ - Alhashor</title>');
});

test('the server markup of a hadis with no file is the message page, with previous and next', () => {
  const html = toMarkup(wrap(<HadisPage bookId="bukhari" number={63} initialText={null} />));
  expect(html).toContain('এই হাদীসটি পাওয়া যায়নি');
  expect(html).toContain('/hadis/bukhari/62');
  expect(html).toContain('/hadis/bukhari/64');
});

test('with the text handed in the page shows it at once and does not fetch the hadis file', () => {
  global.fetch = vi.fn(() => Promise.resolve({ ok: false }));
  render(wrap(<HadisPage bookId="muslim" number={4} initialText={realText('muslim', 4)} />));
  expect(screen.getByText(/হাদিসটির উপরোক্ত হাদীসের অনুরূপ বর্ণনা করেছেন/)).toBeInTheDocument();
  const asked = global.fetch.mock.calls.map((call) => String(call[0]));
  expect(asked.filter((url) => url.includes('/json/hadis/'))).toEqual([]);
});
