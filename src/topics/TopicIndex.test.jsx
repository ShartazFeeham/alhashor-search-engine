import { fireEvent, render, screen, within } from '@testing-library/react';
import { normalizeBengali } from '../Helpers/bengali';
import { TOPICS } from '../lib/topics';
import { SettingsProvider } from '../settings/SettingsProvider';
import TopicIndex from './TopicIndex';

const show = (props = {}) =>
  render(
    <SettingsProvider>
      <TopicIndex topic="" {...props} />
    </SettingsProvider>
  );

const chips = () => within(screen.getByRole('list', { name: 'বিষয়' })).getAllByRole('link');
const box = () => screen.getByRole('textbox', { name: 'বিষয় খুঁজুন' });

test('has a chip for every topic, once each, and says how many there are', () => {
  show();
  const names = chips().map((chip) => normalizeBengali(chip.textContent));
  expect(names).toHaveLength(TOPICS.length);
  expect(new Set(names).size).toBe(names.length);
  expect(screen.getByText(/টি বিষয়/)).toHaveTextContent('১৩৮টি বিষয়');
});

test('each chip is a link to its topic, so it can be opened and shared', () => {
  show();
  const chip = screen.getByRole('link', { name: 'ঈমান' });
  expect(decodeURIComponent(chip.getAttribute('href'))).toBe('/topics?topic=ঈমান');
  expect(chip).toHaveAttribute('data-scroll', 'false'); // the page stays where it is
});

test('marks the chosen topic, and only that one', () => {
  show({ topic: 'নামায' });
  expect(screen.getByRole('link', { name: 'নামায' })).toHaveAttribute('aria-current', 'true');
  expect(screen.getByRole('link', { name: 'ঈমান' })).not.toHaveAttribute('aria-current');
  expect(screen.getAllByRole('link').filter((link) => link.hasAttribute('aria-current'))).toHaveLength(1);
});

describe('the filter box', () => {
  test('narrows the chips to topics containing the text', () => {
    show();
    fireEvent.change(box(), { target: { value: 'নামায' } });
    const names = chips().map((chip) => chip.textContent);
    expect(names).toContain('নামায');
    expect(names).toContain('বিতর নামায');
    expect(names).not.toContain('ঈমান');
    expect(names.every((name) => name.includes('নামায'))).toBe(true);
  });

  test('announces how many topics match, and says so when none do', () => {
    show();
    const live = screen.getByRole('status');
    expect(live).toBeEmptyDOMElement();

    fireEvent.change(box(), { target: { value: 'বিতর' } });
    expect(live).toHaveTextContent('১টি বিষয় পাওয়া গেছে');

    fireEvent.change(box(), { target: { value: 'zzzz' } });
    expect(live).toHaveTextContent('কোনো বিষয় মেলেনি');
    expect(screen.queryByRole('list', { name: 'বিষয়' })).not.toBeInTheDocument();
  });

  test('clearing the text brings every chip back and the announcement goes away', () => {
    show();
    fireEvent.change(box(), { target: { value: 'বিতর' } });
    fireEvent.change(box(), { target: { value: '' } });
    expect(chips()).toHaveLength(TOPICS.length);
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
  });

  test('keeps the chosen topic marked while filtering', () => {
    show({ topic: 'নামায' });
    fireEvent.change(box(), { target: { value: 'নামা' } });
    expect(screen.getByRole('link', { name: 'নামায' })).toHaveAttribute('aria-current', 'true');
  });

  test('is a Bengali text box, and Enter does nothing (the chips follow the typing)', () => {
    show();
    expect(box()).toHaveAttribute('lang', 'bn');
    expect(fireEvent.keyDown(box(), { key: 'Enter' })).toBe(false); // false: the default was prevented
  });
});

describe('the chosen chip', () => {
  // jsdom has no layout: say where the list and the chip are, and watch where the list scrolls.
  function layout(chipTop) {
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function rect() {
      if (this.tagName === 'UL') return { top: 100, bottom: 276, height: 176 };
      if (this.getAttribute('aria-current') === 'true') return { top: chipTop, bottom: chipTop + 44, height: 44 };
      return { top: 0, bottom: 0, height: 0 };
    });
  }
  afterEach(() => vi.restoreAllMocks());

  test('is brought into view in the scrolling list when it is out of sight', () => {
    layout(700);
    show({ topic: 'ঈমান' });
    expect(screen.getByRole('list', { name: 'বিষয়' }).scrollTop).toBe(700 - 100 - (176 - 44) / 2);
  });

  test('leaves the list alone when it is already in sight', () => {
    layout(150);
    show({ topic: 'ঈমান' });
    expect(screen.getByRole('list', { name: 'বিষয়' }).scrollTop).toBe(0);
  });
});

describe('the clear link', () => {
  test('appears with a topic chosen and goes to the plain topics page', () => {
    show({ topic: 'ঈমান' });
    expect(screen.getByRole('link', { name: 'বাছাই মুছুন' })).toHaveAttribute('href', '/topics');
  });

  test('is not there with nothing chosen', () => {
    show();
    expect(screen.queryByRole('link', { name: 'বাছাই মুছুন' })).not.toBeInTheDocument();
  });
});
