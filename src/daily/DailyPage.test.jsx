import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { PLANS } from '../data/readingPlans';
import { SettingsProvider } from '../settings/SettingsProvider';
import { diskFetch } from '../test/hadisFixtures';
import { getUrl, setUrl } from '../test/nextNavigation';
import { ToastProvider } from '../ui/Toast';
import DailyPage from './DailyPage';
import { clearShortListCache } from './useShortList';

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

const tabs = () => within(screen.getByRole('navigation', { name: 'বিভাগ' }));

beforeEach(() => {
  clearShortListCache();
  global.fetch = vi.fn(diskFetch);
});

afterEach(async () => {
  await settle();
  delete global.fetch;
});

describe('the three sections', () => {
  test('open on today by default', async () => {
    show();
    expect(screen.getByRole('heading', { level: 1, name: 'আজকের হাদীস' })).toBeInTheDocument();
    expect(await screen.findByRole('article', { name: 'আজকের হাদীস' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'গত ৭ দিন' })).toBeInTheDocument();
  });

  test('?tab=plans shows the plans', () => {
    setUrl('/daily?tab=plans');
    show();
    expect(screen.getByRole('heading', { level: 1, name: 'পরিকল্পনা' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: new RegExp(PLANS[0].title) })).toBeInTheDocument();
  });

  test('?tab=khutbah shows the khutbah sheet', () => {
    setUrl('/daily?tab=khutbah&ids=muslim-5');
    show();
    expect(screen.getByRole('heading', { level: 1, name: 'খুতবার তালিকা' })).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'খুতবার হাদীস' })).toBeInTheDocument();
  });

  test('an unknown tab falls back to today', () => {
    setUrl('/daily?tab=nonsense');
    show();
    expect(screen.getByRole('heading', { level: 1, name: 'আজকের হাদীস' })).toBeInTheDocument();
  });
});

describe('the tab links', () => {
  test('are links to each section, with the open one marked current', () => {
    setUrl('/daily?tab=plans');
    show();
    const links = tabs().getAllByRole('link');
    expect(links.map((link) => link.getAttribute('href'))).toEqual(['/daily', '/daily?tab=plans', '/daily?tab=khutbah']);
    expect(tabs().getByRole('link', { name: 'পরিকল্পনা' })).toHaveAttribute('aria-current', 'page');
    expect(tabs().getByRole('link', { name: 'আজকের হাদীস' })).not.toHaveAttribute('aria-current');
    expect(links.filter((link) => link.hasAttribute('aria-current'))).toHaveLength(1);
  });

  test('today is current by default', () => {
    show();
    expect(tabs().getByRole('link', { name: 'আজকের হাদীস' })).toHaveAttribute('aria-current', 'page');
  });

  test('carry the khutbah list from tab to tab, and show how many are in it', () => {
    setUrl('/daily?tab=plans&ids=muslim-5,bukhari-1');
    show();
    expect(tabs().getByRole('link', { name: /আজকের হাদীস/ })).toHaveAttribute('href', '/daily?ids=muslim-5,bukhari-1');
    expect(tabs().getByRole('link', { name: /খুতবার তালিকা/ })).toHaveAttribute('href', '/daily?tab=khutbah&ids=muslim-5,bukhari-1');
    expect(tabs().getByRole('link', { name: /খুতবার তালিকা/ })).toHaveTextContent('২');
  });

  test('switch the section without reloading', async () => {
    show();
    fireEvent.click(tabs().getByRole('link', { name: 'খুতবার তালিকা' }));
    expect(getUrl().search).toBe('?tab=khutbah');
    expect(screen.getByRole('heading', { level: 1, name: 'খুতবার তালিকা' })).toBeInTheDocument();
    await settle();
  });
});

describe('page titles', () => {
  test.each([
    ['/daily', 'আজকের হাদীস - BoiKotha'],
    ['/daily?tab=plans', 'পরিকল্পনা - BoiKotha'],
    [`/daily?tab=plans&plan=${PLANS[0].id}`, `${PLANS[0].title} - পরিকল্পনা - BoiKotha`],
    ['/daily?tab=khutbah', 'খুতবার তালিকা - BoiKotha'],
    ['/daily?tab=nonsense', 'আজকের হাদীস - BoiKotha'],
  ])('%s is titled %s', (address, title) => {
    setUrl(address);
    show();
    expect(document.title).toBe(title);
  });
});
