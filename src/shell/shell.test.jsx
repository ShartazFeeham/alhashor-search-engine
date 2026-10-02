import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { SettingsProvider } from '../settings/SettingsProvider';
import { getUrl, setUrl } from '../test/nextNavigation';
import TabBar from './TabBar';
import TopNav from './TopNav';

const show = (ui) => render(<SettingsProvider>{ui}</SettingsProvider>);

test.each([
  ['/', 'হোম'],
  ['/search', 'সার্চ'],
  ['/books', 'হাদীস বই'],
  ['/topics', 'বিষয়ভিত্তিক হাদীস'],
  ['/daily', 'আজকের হাদীস'],
  ['/top-picks', 'জনপ্রিয় হাদীস'],
  ['/top-picks/ramadan-30', 'জনপ্রিয় হাদীস'],
  ['/narrators', 'বর্ণনাকারী'],
  ['/narrators?name=abu-hurayrah&page=2', 'বর্ণনাকারী'],
])('on %s the top navigation marks %s as the current page', (path, label) => {
  setUrl(path);
  show(<TopNav />);
  expect(screen.getByRole('link', { name: label })).toHaveAttribute('aria-current', 'page');
  expect(screen.getAllByRole('link').filter((a) => a.getAttribute('aria-current') === 'page')).toHaveLength(1);
});

test('a hadis page keeps the books link current', () => {
  setUrl('/hadis/bukhari/124');
  show(<TopNav />);
  expect(screen.getByRole('link', { name: 'হাদীস বই' })).toHaveAttribute('aria-current', 'page');
});

test('a search with a query still marks search as current', () => {
  setUrl('/search?q=abc');
  show(<TopNav />);
  expect(screen.getByRole('link', { name: 'সার্চ' })).toHaveAttribute('aria-current', 'page');
});

test('the top navigation links to the daily hadis page', () => {
  show(<TopNav />);
  expect(screen.getByRole('link', { name: 'আজকের হাদীস' })).toHaveAttribute('href', '/daily');
});

test('the brand links home and a settings link exists', () => {
  show(<TopNav />);
  expect(screen.getByRole('link', { name: /Alhashor/ })).toHaveAttribute('href', '/');
  expect(screen.getByRole('link', { name: 'পড়ার সেটিংস' })).toHaveAttribute('href', '/settings');
});

test('the tab bar has four links and a more button, and navigates without reloading', () => {
  show(<TabBar />);
  expect(screen.getAllByRole('link')).toHaveLength(4);
  expect(screen.getByRole('button', { name: 'আরও' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('link', { name: 'সার্চ' }));
  expect(getUrl().pathname).toBe('/search');
});

test('the tab bar marks the current page too', () => {
  setUrl('/top-picks/ramadan-30');
  show(<TabBar />);
  expect(screen.getByRole('link', { name: 'জনপ্রিয় হাদীস' })).toHaveAttribute('aria-current', 'page');
});

test('the tab bar has Home, Books, Search, Top picks and More, in that order, with জনপ্রিয় as the short label', () => {
  show(<TabBar />);
  const links = screen.getAllByRole('link');
  expect(links.map((link) => link.getAttribute('href'))).toEqual(['/', '/books', '/search', '/top-picks']);
  const top = screen.getByRole('link', { name: 'জনপ্রিয় হাদীস' });
  expect(top).toHaveTextContent('জনপ্রিয়');
  expect(top).toHaveAttribute('href', '/top-picks');
  expect(within(top).getByTestId('icon-list')).toHaveAttribute('aria-hidden', 'true');
  expect(screen.queryByRole('link', { name: 'বিষয়' })).not.toBeInTheDocument();
});

test('on a topics page the "more" button is marked, and the topics link is in its menu (and not twice)', () => {
  setUrl('/topics');
  show(<TabBar />);
  const more = screen.getByRole('button', { name: 'আরও' });
  expect(more).toHaveAttribute('aria-current', 'true');
  fireEvent.click(more);
  expect(screen.getAllByRole('link', { name: 'বিষয়ভিত্তিক হাদীস' })).toHaveLength(1);
  expect(screen.getByRole('link', { name: 'বিষয়ভিত্তিক হাদীস' })).toHaveAttribute('href', '/topics');
  expect(screen.getAllByRole('link', { name: 'জনপ্রিয় হাদীস' })).toHaveLength(1);
});

test('the tab bar "more" button opens and closes a menu with the settings link', () => {
  show(<TabBar />);
  const more = screen.getByRole('button', { name: 'আরও' });
  expect(more).toHaveAttribute('aria-expanded', 'false');
  expect(screen.queryByRole('link', { name: 'পড়ার সেটিংস' })).not.toBeInTheDocument();
  fireEvent.click(more);
  expect(more).toHaveAttribute('aria-expanded', 'true');
  expect(screen.getByRole('link', { name: 'পড়ার সেটিংস' })).toBeInTheDocument();
  fireEvent.click(more);
  expect(screen.queryByRole('link', { name: 'পড়ার সেটিংস' })).not.toBeInTheDocument();
});

test('the "more" menu links the daily hadis and the topics (the top picks have their own tab)', () => {
  show(<TabBar />);
  fireEvent.click(screen.getByRole('button', { name: 'আরও' }));
  expect(screen.getByRole('link', { name: 'আজকের হাদীস' })).toHaveAttribute('href', '/daily');
  expect(screen.getByRole('link', { name: 'বিষয়ভিত্তিক হাদীস' })).toHaveAttribute('href', '/topics');
  expect(screen.queryByRole('link', { name: 'খুতবার তালিকা' })).not.toBeInTheDocument();
  expect(screen.queryByRole('link', { name: 'তুলনা' })).not.toBeInTheDocument();
});

test('choosing a link in the "more" menu goes there and closes the menu', () => {
  show(<TabBar />);
  fireEvent.click(screen.getByRole('button', { name: 'আরও' }));
  fireEvent.click(screen.getByRole('link', { name: 'বিষয়ভিত্তিক হাদীস' }));
  expect(getUrl().pathname + getUrl().search).toBe('/topics');
  expect(screen.queryByRole('link', { name: 'বিষয়ভিত্তিক হাদীস' })).not.toBeInTheDocument();
});

test('the top navigation has the narrators link in the last place and no compare link', () => {
  show(<TopNav />);
  expect(screen.getAllByRole('link').slice(1, -1).map((a) => [a.textContent, a.getAttribute('href')])).toEqual([
    ['হোম', '/'],
    ['সার্চ', '/search'],
    ['হাদীস বই', '/books'],
    ['বিষয়ভিত্তিক হাদীস', '/topics'],
    ['আজকের হাদীস', '/daily'],
    ['জনপ্রিয় হাদীস', '/top-picks'],
    ['বর্ণনাকারী', '/narrators'],
  ]);
  expect(screen.queryByRole('link', { name: 'তুলনা' })).not.toBeInTheDocument();
});

test.each(['/daily', '/narrators'])('on %s the "more" button is marked as holding the current page', (path) => {
  setUrl(path);
  show(<TabBar />);
  expect(screen.getByRole('button', { name: 'আরও' })).toHaveAttribute('aria-current', 'true');
});

test('the top bar and the phone "more" menu each have one entry for the daily hadis and one for the top picks', () => {
  show(<TopNav />);
  expect(screen.getAllByRole('link', { name: 'আজকের হাদীস' })).toHaveLength(1);
  expect(screen.getAllByRole('link', { name: 'জনপ্রিয় হাদীস' })).toHaveLength(1);
  expect(screen.queryByRole('link', { name: 'পরিকল্পনা' })).not.toBeInTheDocument();
});

test('elsewhere the "more" button is not marked', () => {
  setUrl('/books');
  show(<TabBar />);
  expect(screen.getByRole('button', { name: 'আরও' })).not.toHaveAttribute('aria-current');
});

test('the "more" menu links the narrators page', () => {
  show(<TabBar />);
  fireEvent.click(screen.getByRole('button', { name: 'আরও' }));
  expect(screen.getByRole('link', { name: 'বর্ণনাকারী' })).toHaveAttribute('href', '/narrators');
});

test('choosing the narrators link in the "more" menu goes there and closes the menu', () => {
  show(<TabBar />);
  fireEvent.click(screen.getByRole('button', { name: 'আরও' }));
  fireEvent.click(screen.getByRole('link', { name: 'বর্ণনাকারী' }));
  expect(getUrl().pathname).toBe('/narrators');
  expect(screen.queryByRole('link', { name: 'বর্ণনাকারী' })).not.toBeInTheDocument();
});

test.each(['/narrators', '/narrators?name=abu-hurayrah&page=2'])('on %s the "more" button is marked as holding the current page', (path) => {
  setUrl(path);
  show(<TabBar />);
  expect(screen.getByRole('button', { name: 'আরও' })).toHaveAttribute('aria-current', 'true');
});

describe('the "more" menu is operable by keyboard', () => {
  const open = () => {
    show(
      <>
        <button type="button">before</button>
        <TabBar />
        <button type="button">after</button>
      </>
    );
    const more = screen.getByRole('button', { name: 'আরও' });
    fireEvent.click(more);
    return more;
  };

  test('the menu follows the button in the page, so Tab goes from the button into it', () => {
    const more = open();
    const first = screen.getByRole('link', { name: 'আজকের হাদীস' });
    expect(more.compareDocumentPosition(first) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    // Every focusable control, in document order: nothing sits between the button and the first
    // link, and the control after the menu comes after its last link.
    const focusable = [...screen.getAllByRole('link'), ...screen.getAllByRole('button')].sort((a, b) =>
      a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1
    );
    expect(focusable.indexOf(first)).toBe(focusable.indexOf(more) + 1);
    const lastLink = screen.getByRole('link', { name: 'পড়ার সেটিংস' });
    expect(focusable.indexOf(screen.getByRole('button', { name: 'after' }))).toBe(focusable.indexOf(lastLink) + 1);
  });

  test('the button names the menu it opens', () => {
    const more = open();
    const menu = screen.getByRole('group', { name: 'আরও মেনু' });
    expect(menu).toHaveAttribute('id', more.getAttribute('aria-controls'));
    expect(within(menu).getByRole('link', { name: 'পড়ার সেটিংস' })).toBeInTheDocument();
  });

  test('Escape closes the menu and puts focus back on the button', () => {
    const more = open();
    const link = screen.getByRole('link', { name: 'বিষয়ভিত্তিক হাদীস' });
    link.focus();
    fireEvent.keyDown(link, { key: 'Escape' });
    expect(more).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('link', { name: 'পড়ার সেটিংস' })).not.toBeInTheDocument();
    expect(more).toHaveFocus();
  });

  test('Escape does nothing while the menu is closed (focus stays where it is)', () => {
    show(
      <>
        <button type="button">other</button>
        <TabBar />
      </>
    );
    const other = screen.getByRole('button', { name: 'other' });
    other.focus();
    fireEvent.keyDown(other, { key: 'Escape' });
    expect(other).toHaveFocus();
  });

  test('clicking or touching outside closes it', () => {
    const more = open();
    fireEvent.pointerDown(screen.getByRole('button', { name: 'after' }));
    expect(more).toHaveAttribute('aria-expanded', 'false');
  });

  test('touching inside the menu or on the button does not close it by itself', () => {
    const more = open();
    fireEvent.pointerDown(screen.getByRole('link', { name: 'বিষয়ভিত্তিক হাদীস' }));
    fireEvent.pointerDown(more);
    expect(more).toHaveAttribute('aria-expanded', 'true');
  });

  test('it closes when the page changes, even when the link was not one of its own', () => {
    const more = open();
    act(() => setUrl('/books'));
    expect(more).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('link', { name: 'পড়ার সেটিংস' })).not.toBeInTheDocument();
  });

  test('the arrow keys, Home and End move between the links', () => {
    open();
    const links = within(screen.getByRole('group', { name: 'আরও মেনু' })).getAllByRole('link');
    expect(links).toHaveLength(4);
    links[0].focus();
    fireEvent.keyDown(links[0], { key: 'ArrowDown' });
    expect(links[1]).toHaveFocus();
    fireEvent.keyDown(links[1], { key: 'ArrowUp' });
    expect(links[0]).toHaveFocus();
    fireEvent.keyDown(links[0], { key: 'ArrowUp' });
    expect(links[3]).toHaveFocus();
    fireEvent.keyDown(links[3], { key: 'ArrowDown' });
    expect(links[0]).toHaveFocus();
    fireEvent.keyDown(links[0], { key: 'End' });
    expect(links[3]).toHaveFocus();
    fireEvent.keyDown(links[3], { key: 'Home' });
    expect(links[0]).toHaveFocus();
  });
});
