import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { CompareProvider } from '../compare/CompareProvider';
import { SettingsProvider } from '../settings/SettingsProvider';
import { getUrl, setUrl } from '../test/nextNavigation';
import Footer from './Footer';
import TabBar from './TabBar';
import TopNav from './TopNav';

const show = (ui) => render(<SettingsProvider>{ui}</SettingsProvider>);

afterEach(() => sessionStorage.clear());

test.each([
  ['/', 'হোম'],
  ['/search', 'সার্চ'],
  ['/books', 'হাদীস বই'],
  ['/topics', 'বিষয়ভিত্তিক হাদীস'],
  ['/daily', 'আজকের হাদীস'],
  ['/daily?tab=plans', 'আজকের হাদীস'],
  ['/daily?tab=khutbah&ids=muslim-5', 'আজকের হাদীস'],
  ['/compare', 'তুলনা'],
  ['/compare?ids=bukhari-1,muslim-4774', 'তুলনা'],
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
  setUrl('/topics');
  show(<TabBar />);
  expect(screen.getByRole('link', { name: 'বিষয়' })).toHaveAttribute('aria-current', 'page');
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

test('the "more" menu links the daily hadis, the plans and the khutbah sheet', () => {
  show(<TabBar />);
  fireEvent.click(screen.getByRole('button', { name: 'আরও' }));
  expect(screen.getByRole('link', { name: 'আজকের হাদীস' })).toHaveAttribute('href', '/daily');
  expect(screen.getByRole('link', { name: 'পরিকল্পনা' })).toHaveAttribute('href', '/daily?tab=plans');
  expect(screen.getByRole('link', { name: 'খুতবার তালিকা' })).toHaveAttribute('href', '/daily?tab=khutbah');
});

test('choosing a link in the "more" menu goes there and closes the menu', () => {
  show(<TabBar />);
  fireEvent.click(screen.getByRole('button', { name: 'আরও' }));
  fireEvent.click(screen.getByRole('link', { name: 'পরিকল্পনা' }));
  expect(getUrl().pathname + getUrl().search).toBe('/daily?tab=plans');
  expect(screen.queryByRole('link', { name: 'পরিকল্পনা' })).not.toBeInTheDocument();
});

test('the top navigation links to the compare page', () => {
  show(<TopNav />);
  expect(screen.getByRole('link', { name: 'তুলনা' })).toHaveAttribute('href', '/compare');
});

test('the "more" menu links the compare page', () => {
  show(<TabBar />);
  fireEvent.click(screen.getByRole('button', { name: 'আরও' }));
  expect(screen.getByRole('link', { name: 'তুলনা' })).toHaveAttribute('href', '/compare');
});

test('with hadis chosen, both compare links carry them (so the page opens with that comparison)', () => {
  sessionStorage.setItem('alhashor.compare', 'bukhari-1,muslim-4774');
  show(
    <CompareProvider>
      <TopNav />
      <TabBar />
    </CompareProvider>
  );
  fireEvent.click(screen.getByRole('button', { name: 'আরও' }));
  const links = screen.getAllByRole('link', { name: 'তুলনা' });
  expect(links).toHaveLength(2);
  links.forEach((link) => expect(link).toHaveAttribute('href', '/compare?ids=bukhari-1,muslim-4774'));
});

test('on the compare page the "more" button is marked as holding the current page', () => {
  setUrl('/compare');
  show(<TabBar />);
  expect(screen.getByRole('button', { name: 'আরও' })).toHaveAttribute('aria-current', 'true');
});

test('on the daily page the "more" button is marked as holding the current page', () => {
  setUrl('/daily?tab=plans');
  show(<TabBar />);
  expect(screen.getByRole('button', { name: 'আরও' })).toHaveAttribute('aria-current', 'true');
});

test('elsewhere the "more" button is not marked', () => {
  setUrl('/books');
  show(<TabBar />);
  expect(screen.getByRole('button', { name: 'আরও' })).not.toHaveAttribute('aria-current');
});

test('the footer is a quiet landmark: one row of links and one muted line, no logo and no extra text', () => {
  show(<Footer />);
  const footer = screen.getByRole('contentinfo');
  const nav = within(footer).getByRole('navigation', { name: 'ফুটার মেনু' });
  expect(within(nav).getAllByRole('link').map((a) => [a.textContent, a.getAttribute('href')])).toEqual([
    ['হোম', '/'],
    ['সার্চ', '/search'],
    ['হাদীস বই', '/books'],
    ['বিষয়ভিত্তিক হাদীস', '/topics'],
    ['আজকের হাদীস', '/daily'],
    ['বর্ণনাকারী', '/narrators'],
  ]);
  expect(within(footer).getByText((_, el) => el.tagName === 'P' && el.textContent === 'Alhashor · ৩২,৮৮৬ হাদীস')).toBeInTheDocument();
  expect(footer.textContent).toBe(
    ['হোম', 'সার্চ', 'হাদীস বই', 'বিষয়ভিত্তিক হাদীস', 'আজকের হাদীস', 'বর্ণনাকারী'].join('') + 'Alhashor · ৩২,৮৮৬ হাদীস',
  );
  expect(within(footer).queryByTestId(/^icon-/)).not.toBeInTheDocument();
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

test('the top navigation has no narrators link (it would not fit beside the six it has at 641px); the footer and the more menu carry it', () => {
  setUrl('/narrators');
  show(<TopNav />);
  expect(screen.queryByRole('link', { name: 'বর্ণনাকারী' })).not.toBeInTheDocument();
  expect(screen.getAllByRole('link').filter((a) => a.getAttribute('aria-current') === 'page')).toHaveLength(0);
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
    const link = screen.getByRole('link', { name: 'তুলনা' });
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
    fireEvent.pointerDown(screen.getByRole('link', { name: 'তুলনা' }));
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
    expect(links).toHaveLength(6);
    links[0].focus();
    fireEvent.keyDown(links[0], { key: 'ArrowDown' });
    expect(links[1]).toHaveFocus();
    fireEvent.keyDown(links[1], { key: 'ArrowUp' });
    expect(links[0]).toHaveFocus();
    fireEvent.keyDown(links[0], { key: 'ArrowUp' });
    expect(links[5]).toHaveFocus();
    fireEvent.keyDown(links[5], { key: 'ArrowDown' });
    expect(links[0]).toHaveFocus();
    fireEvent.keyDown(links[0], { key: 'End' });
    expect(links[5]).toHaveFocus();
    fireEvent.keyDown(links[5], { key: 'Home' });
    expect(links[0]).toHaveFocus();
  });
});
