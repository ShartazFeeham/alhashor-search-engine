import { readFileSync } from 'node:fs';
import path from 'node:path';
import { act, render, screen } from '@testing-library/react';
import { SettingsProvider } from '../settings/SettingsProvider';
import { diskFetch } from '../test/hadisFixtures';
import { setUrl } from '../test/nextNavigation';
import { ToastProvider } from '../ui/Toast';
import DailyPage from './DailyPage';

const show = () =>
  render(
    <SettingsProvider>
      <ToastProvider>
        <DailyPage />
      </ToastProvider>
    </SettingsProvider>
  );

async function settle() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

beforeEach(() => {
  global.fetch = vi.fn(diskFetch);
});

afterEach(async () => {
  await settle();
  delete global.fetch;
});

describe('the daily page', () => {
  test('shows only the hadis of the day', async () => {
    show();
    expect(screen.getByRole('heading', { level: 1, name: 'আজকের হাদীস' })).toBeInTheDocument();
    expect(await screen.findByRole('article', { name: 'আজকের হাদীস' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'গত ৭ দিন' })).toBeInTheDocument();
  });

  test('has no tab switcher and no plans, whatever the address says', async () => {
    setUrl('/daily?tab=plans');
    show();
    expect(screen.queryByRole('navigation', { name: 'বিভাগ' })).not.toBeInTheDocument();
    expect(screen.queryByText('পরিকল্পনা')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'আজকের হাদীস' })).toBeInTheDocument();
    expect(screen.queryAllByRole('progressbar')).toHaveLength(0);
    await settle();
  });

  test('is titled আজকের হাদীস', () => {
    show();
    expect(document.title).toBe('আজকের হাদীস - Alhashor');
  });
});

// One look for the day's hadis and the hadis page: the same width and the same shared CSS.
describe('shared layout with the hadis page', () => {
  const css = (name) => readFileSync(path.resolve(process.cwd(), 'src/styles', name), 'utf8');

  test('the page is as wide as the hadis page, through the same token', () => {
    expect(css('daily.css')).toMatch(/\.daily\{max-width:var\(--list-w\)\}/);
    expect(css('hadis.css')).toMatch(/\.hadis-page\{max-width:var\(--list-w\)/);
  });

  test('daily.css has no article look of its own any more', () => {
    expect(css('daily.css')).not.toMatch(/\.daily-card\b|\.daily-text|\.daily-actions|\.daily-cite/);
  });
});
