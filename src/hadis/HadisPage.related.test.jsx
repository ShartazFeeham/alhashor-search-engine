import { render, screen } from '@testing-library/react';
import { clearRelatedCache } from '../lib/related';
import { clearHadisTextCache } from '../lib/useHadisText';
import { SettingsProvider } from '../settings/SettingsProvider';
import { ToastProvider } from '../ui/Toast';
import { realHadisText, serveRealData } from '../test/publicJson';
import HadisPage from './HadisPage';

const show = (bookId, number) =>
  render(
    <SettingsProvider>
      <ToastProvider>
        <HadisPage bookId={bookId} number={number} />
      </ToastProvider>
    </SettingsProvider>
  );

const serveShard = (shard) =>
  serveRealData((url) =>
    url === '/json/related/NAS-9.json' ? Promise.resolve({ ok: true, json: () => Promise.resolve(shard) }) : undefined
  );

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  clearRelatedCache();
  clearHadisTextCache();
  // fetch is not deleted here: the page of a finished test may still start a late request when it unmounts
});

test('the hadis page lists related hadis below previous and next', async () => {
  serveShard({ '903': [['TIR', 243, 's'], ['NAS', 902, 'w', 'اسْمُكَ جَدُّكَ']] });
  show('nasai', 903);
  const region = await screen.findByRole('region', { name: 'এই বিষয়ে আরও হাদীস' });
  const prevNext = screen.getByRole('navigation', { name: 'আগের ও পরের হাদীস' });
  expect(prevNext.compareDocumentPosition(region) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(screen.getByRole('link', { name: 'তিরমিযী ২৪৩' })).toHaveAttribute('href', '/hadis/tirmidhi/243');
  // the page's own hadis is still the one in the article
  expect(realHadisText('Nasae', 903)).toBeTruthy();
});

test('a hadis with nothing related has no related heading', async () => {
  serveShard({});
  show('nasai', 903);
  
  await screen.findByRole('navigation', { name: 'আগের ও পরের হাদীস' });
  await new Promise((resolve) => setTimeout(resolve, 20));
  expect(screen.queryByText('এই বিষয়ে আরও হাদীস')).not.toBeInTheDocument();
});
