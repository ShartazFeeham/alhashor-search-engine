/* eslint-disable testing-library/no-node-access */
import { fireEvent, render, screen, within } from '@testing-library/react';
import { normalizeBengali } from '../Helpers/bengali';
import { getUrl, setUrl } from '../test/nextNavigation';
import { TOPICS } from '../lib/topics';
import { SettingsProvider } from '../settings/SettingsProvider';
import TopicIndex from './TopicIndex';

const show = (props = {}) =>
  render(
    <SettingsProvider>
      <TopicIndex topic="" {...props} />
    </SettingsProvider>
  );

const chips = () => screen.queryAllByRole('link').filter((link) => link.classList.contains('topics-chip'));
const box = () => screen.getByRole('textbox', { name: 'বিষয় খুঁজুন' });
const sortBox = () => screen.getByRole('combobox', { name: 'সাজান' });
const headings = () => screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent);

test('has a link for every topic, once each', () => {
  show();
  const names = chips().map((chip) => normalizeBengali(chip.textContent));
  expect(names).toHaveLength(TOPICS.length);
  expect(new Set(names).size).toBe(names.length);
});

test('each topic is a link to its topic, so it can be opened and shared', () => {
  show();
  const chip = screen.getByRole('link', { name: 'ঈমান' });
  expect(decodeURIComponent(chip.getAttribute('href'))).toBe('/topics?topic=ঈমান');
  expect(chip).toHaveAttribute('data-scroll', 'false'); // the page stays where it is
});

test('marks the chosen topic with aria-current="page", and only that one', () => {
  show({ topic: 'নামায' });
  expect(screen.getByRole('link', { name: 'নামায' })).toHaveAttribute('aria-current', 'page');
  expect(screen.getByRole('link', { name: 'ঈমান' })).not.toHaveAttribute('aria-current');
  expect(screen.getAllByRole('link').filter((link) => link.hasAttribute('aria-current'))).toHaveLength(1);
});

describe('the letter blocks', () => {
  test('are h3 headings with an id, first letters in Bangla alphabet order', () => {
    show();
    const shown = headings();
    expect(shown.slice(0, 3)).toEqual(['অ', 'আ', 'ই']);
    expect(shown.indexOf('ক')).toBeLessThan(shown.indexOf('খ'));
    expect(shown.indexOf('ও')).toBeLessThan(shown.indexOf('ক'));
    expect(screen.getByRole('heading', { level: 3, name: 'ক' })).toHaveAttribute('id');
  });

  test('hold their topics: কবর is in the ক block and not in খ', () => {
    show();
    const block = screen.getByRole('heading', { level: 3, name: 'ক' }).closest('section');
    expect(within(block).getByRole('link', { name: 'কবর' })).toBeInTheDocument();
    expect(within(block).queryByRole('link', { name: 'ঈমান' })).not.toBeInTheDocument();
    expect(block).toHaveAttribute('aria-labelledby', screen.getByRole('heading', { level: 3, name: 'ক' }).id);
  });

  test('empty letters are not shown', () => {
    show();
    expect(headings()).not.toContain('ঙ');
    expect(headings().length).toBeLessThan(60);
  });
});

describe('the filter box', () => {
  test('is the thin search of the top row, with its placeholder', () => {
    show();
    expect(box()).toHaveAttribute('placeholder', 'বিষয় খুঁজুন');
    expect(box().closest('.topics-menu-row')).toContainElement(sortBox());
  });

  test('narrows the topics to those containing the text and drops empty blocks', () => {
    show();
    fireEvent.change(box(), { target: { value: 'নামায' } });
    const names = chips().map((chip) => chip.textContent);
    expect(names).toContain('নামায');
    expect(names).toContain('ঈদের নামায');
    expect(names).not.toContain('ঈমান');
    expect(names.every((name) => name.includes('নামায'))).toBe(true);
    expect(headings()).toEqual(['ঈ', 'ন']);
  });

  test('announces how many topics match, and says "কোনো বিষয় পাওয়া যায়নি" when none do', () => {
    show();
    const live = screen.getByRole('status');
    expect(live).toBeEmptyDOMElement();

    fireEvent.change(box(), { target: { value: 'ঈদের' } });
    expect(live).toHaveTextContent('১টি বিষয় পাওয়া গেছে');

    fireEvent.change(box(), { target: { value: 'zzzz' } });
    expect(live).toHaveTextContent('কোনো বিষয় পাওয়া যায়নি');
    expect(screen.queryAllByRole('heading', { level: 3 })).toHaveLength(0);
    expect(chips()).toHaveLength(0);
  });

  test('clearing the text brings every topic back and the announcement goes away', () => {
    show();
    fireEvent.change(box(), { target: { value: 'ঈদের' } });
    fireEvent.change(box(), { target: { value: '' } });
    expect(chips()).toHaveLength(TOPICS.length);
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
  });

  test('keeps the chosen topic marked while filtering', () => {
    show({ topic: 'নামায' });
    fireEvent.change(box(), { target: { value: 'নামা' } });
    expect(screen.getByRole('link', { name: 'নামায' })).toHaveAttribute('aria-current', 'page');
  });

  test('is a Bengali text box, and Enter does nothing (the list follows the typing)', () => {
    show();
    expect(box()).toHaveAttribute('lang', 'bn');
    expect(fireEvent.keyDown(box(), { key: 'Enter' })).toBe(false); // false: the default was prevented
  });
});

describe('the sort select', () => {
  test('is a native select with two options, ascending by default', () => {
    show();
    expect(sortBox().tagName).toBe('SELECT');
    expect(within(sortBox()).getAllByRole('option').map((o) => o.textContent)).toEqual(['আরোহী (ক → হ)', 'অবরোহী (হ → ক)']);
    expect(sortBox()).toHaveValue('asc');
  });

  test('descending reverses the blocks and the topics inside them, and goes into the address', () => {
    setUrl('/topics?topic=ঈমান&page=2');
    const { rerender } = show({ topic: 'ঈমান', page: 1 });
    const up = headings();
    fireEvent.change(sortBox(), { target: { value: 'desc' } });
    expect(decodeURIComponent(getUrl().pathname + getUrl().search)).toBe('/topics?topic=ঈমান&page=2&sort=desc');
    rerender(
      <SettingsProvider>
        <TopicIndex topic="ঈমান" page={1} sort="desc" />
      </SettingsProvider>
    );
    expect(headings()).toEqual([...up].reverse());
    expect(sortBox()).toHaveValue('desc');
    expect(decodeURIComponent(screen.getByRole('link', { name: 'নামায' }).getAttribute('href'))).toBe('/topics?topic=নামায&sort=desc');
  });

  test('going back to ascending leaves &sort out', () => {
    setUrl('/topics?sort=desc');
    show({ sort: 'desc' });
    fireEvent.change(sortBox(), { target: { value: 'asc' } });
    expect(getUrl().search).toBe('');
  });
});

describe('the chosen topic in a long menu', () => {
  // jsdom has no layout: say where the scrolling box and the chip are, and watch where the box scrolls.
  function layout(chipTop) {
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function rect() {
      if (this.classList.contains('topics-scroll')) return { top: 100, bottom: 600, height: 500 };
      if (this.getAttribute('aria-current') === 'page') return { top: chipTop, bottom: chipTop + 36, height: 36 };
      return { top: 0, bottom: 0, height: 0 };
    });
  }
  afterEach(() => vi.restoreAllMocks());

  const scroller = () => document.querySelector('.topics-scroll');

  test('is brought into view when it is out of sight', () => {
    layout(900);
    show({ topic: 'ঈমান' });
    expect(scroller().scrollTop).toBe(900 - 100 - (500 - 36) / 2);
  });

  test('leaves the menu alone when it is already in sight', () => {
    layout(150);
    show({ topic: 'ঈমান' });
    expect(scroller().scrollTop).toBe(0);
  });
});
