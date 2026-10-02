import { act, render, screen, within } from '@testing-library/react';
import { SettingsProvider } from '../settings/SettingsProvider';
import { ToastProvider } from '../ui/Toast';
import { realHadisText, serveRealData } from '../test/publicJson';
import StartHere from './StartHere';

const entries = [
  { book: 'bukhari', number: 8, note: 'ইসলামের ভিত্তি কী, তা এখান থেকে শুরু।' },
  { book: 'muslim', number: 45, note: 'দ্বিতীয় ধাপের টীকা।' },
  { book: 'tirmidhi', number: 2610, note: 'তৃতীয় ধাপের টীকা।' },
];

// The block is switched off by the owner (see TopicsPage.test.jsx): these tests are skipped.
beforeEach(() => serveRealData());

// Cards load their text after the test body; let those loads finish inside act().
afterEach(async () => {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  delete global.fetch;
});

const show = (props = {}) =>
  render(
    <SettingsProvider>
      <ToastProvider>
        <StartHere entries={entries} {...props} />
      </ToastProvider>
    </SettingsProvider>
  );

test.skip('is a section named "এখান থেকে শুরু করুন", marked as the editor\'s pick', async () => {
  show();
  const section = screen.getByRole('region', { name: 'এখান থেকে শুরু করুন' });
  expect(within(section).getByText('সম্পাদকের বাছাই')).toBeInTheDocument();
  await screen.findByText(/হাদীস নং ৮$/);
});

test.skip('lists the items in order, each numbered, with its note above its hadis card', async () => {
  show();
  const items = screen.getAllByRole('listitem');
  expect(items).toHaveLength(3);
  ['১', '২', '৩'].forEach((no, i) => expect(within(items[i]).getByText(no, { selector: '.topics-start-no' })).toBeInTheDocument());
  expect(within(items[0]).getByText(entries[0].note)).toBeInTheDocument();
  expect(within(items[1]).getByText(entries[1].note)).toBeInTheDocument();
  expect(within(items[0]).getByRole('heading', { name: 'বুখারী শরীফ - হাদীস নং ৮' })).toBeInTheDocument();
  expect(within(items[1]).getByRole('heading', { name: 'মুসলিম শরীফ - হাদীস নং ৪৫' })).toBeInTheDocument();
  expect(within(items[2]).getByRole('heading', { name: 'তিরমিযী শরীফ - হাদীস নং ২,৬১০' })).toBeInTheDocument();
  await screen.findAllByRole('button', { name: /কপি/ });
});

test.skip('shows the real text of each hadis in its shared card', async () => {
  show();
  const first = realHadisText('Bukhari', 8).replace(/^[০-৯]+।\s*/, '');
  const fragment = first.split(' ').slice(3, 7).join(' ');
  expect(await screen.findByText(new RegExp(fragment))).toBeInTheDocument();
});

test.skip('numbers follow the visitor\'s digit style', async () => {
  localStorage.setItem('alhashor.settings', JSON.stringify({ digits: 'en' }));
  show();
  const items = screen.getAllByRole('listitem');
  ['1', '2', '3'].forEach((no, i) => expect(within(items[i]).getByText(no, { selector: '.topics-start-no' })).toBeInTheDocument());
  expect(within(items[0]).getByRole('heading', { name: 'বুখারী শরীফ - হাদীস নং 8' })).toBeInTheDocument();
  await screen.findAllByRole('button', { name: /কপি/ });
});

test.skip('shows nothing when there are no entries', () => {
  show({ entries: [] });
  expect(screen.queryByRole('region')).not.toBeInTheDocument();
});
