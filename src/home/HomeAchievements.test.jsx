/* eslint-disable testing-library/no-node-access */
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { renderToString as toHtml } from 'react-dom/server';
import { STORAGE_KEY } from '../lib/planProgress';
import { TOP_PICKS } from '../lib/topPicks';
import { SettingsProvider } from '../settings/SettingsProvider';
import { getUrl } from '../test/nextNavigation';
import HomeAchievements from './HomeAchievements';

const all = (set) => set.days.map((_, index) => index);
const save = (ids) => localStorage.setItem(STORAGE_KEY, JSON.stringify(Object.fromEntries(ids.map((id) => [id, all(TOP_PICKS.find((set) => set.id === id))]))));
const renderIt = (props) => render(<SettingsProvider><HomeAchievements {...props} /></SettingsProvider>);
const block = () => screen.getByRole('region', { name: 'অ্যাচিভমেন্ট' });
const stage = () => screen.getByTestId('achv-stage');
const ghost = () => block().querySelector('.progress-tree-ghost');
const golden = () => block().querySelector('[data-golden="true"]');
// n small sets of one day each, with the first `done` of them read
const sets = (n) => Array.from({ length: n }, (_, index) => ({ id: `s${index}`, days: [{}] }));
const saveDone = (done) => localStorage.setItem(STORAGE_KEY, JSON.stringify(Object.fromEntries(Array.from({ length: done }, (_, index) => [`s${index}`, [0]]))));

describe('with no golden tree', () => {
  test('shows a big শূন্য and a grey placeholder tree, no golden tree and no ribbon', () => {
    renderIt();
    expect(within(block()).getByText('শূন্য')).toHaveClass('home-achv-zero');
    expect(ghost()).not.toBeNull();
    expect(golden()).toBeNull();
    expect(block().querySelector('.home-achv-ribbon')).toBeNull();
    expect(screen.queryAllByTestId('achv-spark')).toHaveLength(0);
    expect(stage()).toHaveAttribute('data-shine', '0');
    expect(block()).toHaveTextContent('আপনার কোনো গাছ এখনও সোনালি হয়নি');
  });

  test('a set that is only partly read does not count', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ [TOP_PICKS[0].id]: [0] }));
    renderIt();
    expect(golden()).toBeNull();
    expect(within(block()).getByText('শূন্য')).toBeInTheDocument();
  });
});

describe('with golden trees', () => {
  test('one: a golden tree with "এক" on a ribbon, and no big শূন্য', () => {
    save([TOP_PICKS[0].id]);
    renderIt();
    expect(golden()).not.toBeNull();
    expect(ghost()).toBeNull();
    expect(block().querySelector('.home-achv-ribbon')).toHaveTextContent('এক');
    expect(within(block()).queryByText('শূন্য')).not.toBeInTheDocument();
    expect(block()).toHaveTextContent('আপনার ১টি গাছ সোনালি হয়েছে');
  });

  test('three: the ribbon shows Bengali digits', () => {
    save(TOP_PICKS.slice(0, 3).map((set) => set.id));
    renderIt();
    expect(block().querySelector('.home-achv-ribbon')).toHaveTextContent('৩');
  });

  test('English digits when chosen', () => {
    localStorage.setItem('alhashor.settings', JSON.stringify({ digits: 'en' }));
    save(TOP_PICKS.slice(0, 1).map((set) => set.id));
    renderIt();
    expect(block().querySelector('.home-achv-ribbon')).toHaveTextContent('1');
  });
});

describe('the shine', () => {
  test('goes up one step for each golden tree, with a sparkle more each time', () => {
    const levels = [1, 2, 3, 4].map((done) => {
      saveDone(done);
      const { unmount } = renderIt({ sets: sets(8) });
      const level = [Number(stage().dataset.shine), Number(stage().style.getPropertyValue('--shine')), screen.getAllByTestId('achv-spark').length];
      unmount();
      return level;
    });
    expect(levels).toEqual([[1, 1 / 8, 1], [2, 2 / 8, 2], [3, 3 / 8, 3], [4, 4 / 8, 4]]);
  });

  test('has one level for each set that can be won, and stops there', () => {
    saveDone(6);
    renderIt({ sets: sets(6) });
    expect(stage()).toHaveAttribute('data-shine', '6');
    expect(stage().style.getPropertyValue('--shine')).toBe('1');
  });

  test('the real page: every listed set golden is the top level', () => {
    save(TOP_PICKS.map((set) => set.id));
    renderIt();
    expect(stage()).toHaveAttribute('data-shine', String(TOP_PICKS.length));
    expect(stage().style.getPropertyValue('--shine')).toBe('1');
    expect(screen.getAllByTestId('achv-spark').length).toBeLessThanOrEqual(TOP_PICKS.length);
  });
});

describe('the best reader line', () => {
  test('is the number of sets minus two, in Bengali digits, worked out from the sets', () => {
    renderIt({ sets: sets(9) });
    expect(block()).toHaveTextContent('আমাদের ইউজার বেসে সর্বোচ্চ অ্যাচিভমেন্ট: সারতাজ ফিহাম (৭ টি)');
  });

  test('below the record it names সারতাজ ফিহাম; at the record and above it says আপনি with the reader\'s own count', () => {
    // 9 sets: the record is 7
    const lines = [6, 7, 8, 9].map((done) => {
      saveDone(done);
      const { unmount } = renderIt({ sets: sets(9) });
      const line = block().querySelector('.home-achv-best').textContent;
      unmount();
      return line;
    });
    expect(lines).toEqual([
      'আমাদের ইউজার বেসে সর্বোচ্চ অ্যাচিভমেন্ট: সারতাজ ফিহাম (৭ টি)',
      'আমাদের ইউজার বেসে সর্বোচ্চ অ্যাচিভমেন্ট: আপনি (৭ টি)',
      'আমাদের ইউজার বেসে সর্বোচ্চ অ্যাচিভমেন্ট: আপনি (৮ টি)',
      'আমাদের ইউজার বেসে সর্বোচ্চ অ্যাচিভমেন্ট: আপনি (৯ টি)',
    ]);
  });

  test('uses every listed set on /top-picks', () => {
    renderIt();
    const best = TOP_PICKS.length - 2;
    expect(best).toBeGreaterThan(0);
    expect(block()).toHaveTextContent(`সারতাজ ফিহাম (${String(best).replace(/\d/g, (d) => '০১২৩৪৫৬৭৮৯'[d])} টি)`);
  });
});

describe('the block', () => {
  test('puts the text on the left and the tree with its banner on the right, in the markup and on a phone', () => {
    save([TOP_PICKS[0].id]);
    renderIt();
    const text = block().querySelector('.home-achv-text');
    expect(text.contains(screen.getByRole('heading', { name: 'অ্যাচিভমেন্ট' }))).toBe(true);
    expect(text.compareDocumentPosition(stage()) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(stage().contains(block().querySelector('.home-achv-ribbon'))).toBe(true);
    expect(text.parentElement).toBe(stage().parentElement.parentElement);
  });

  test('has the description, a heading that names it and a sentence for screen readers', () => {
    renderIt();
    expect(screen.getByRole('heading', { name: 'অ্যাচিভমেন্ট' })).toBeInTheDocument();
    expect(block()).toHaveTextContent('টপ লিস্টের জনপ্রিয় হাদীস সেটগুলো নিয়মিত পড়ে অ্যাচিভমেন্ট সংগ্রহ করুন।');
    expect(stage()).toHaveAttribute('aria-hidden', 'true');
  });

  test('has one link, to /top-picks, labelled "জনপ্রিয় তালিকা থেকে পড়ুন"; the whole block is its click area', () => {
    renderIt();
    const links = within(block()).getAllByRole('link');
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAccessibleName('জনপ্রিয় তালিকা থেকে পড়ুন');
    expect(links[0]).toHaveAttribute('href', '/top-picks');
    expect(links[0]).toHaveClass('home-achv-go');
    fireEvent.click(links[0]);
    expect(getUrl().pathname).toBe('/top-picks');
  });

  test('first render (the pre-built page) is the zero state, whatever is saved', () => {
    save([TOP_PICKS[0].id]);
    const html = toHtml(<SettingsProvider><HomeAchievements /></SettingsProvider>);
    expect(html).toContain('শূন্য');
    expect(html).not.toContain('home-achv-ribbon');
    expect(html).toContain('progress-tree-ghost');
  });
});

describe('the preview slider', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());
  const slider = () => screen.getByRole('slider', { name: 'শাইন লেভেল দেখুন' });
  const drag = (value) => fireEvent.change(slider(), { target: { value: String(value) } });
  const shine = () => Number(stage().dataset.shine);
  const wait = (ms) => act(() => { vi.advanceTimersByTime(ms); });

  test('goes from 0 to the number of sets, in steps of one, starting at the reader\'s own level, with a Bengali name and value text', () => {
    saveDone(2);
    renderIt({ sets: sets(8) });
    expect(slider()).toHaveAttribute('min', '0');
    expect(slider()).toHaveAttribute('max', '8');
    expect(slider()).toHaveAttribute('step', '1');
    expect(slider()).toHaveValue('2');
    expect(slider()).toHaveAttribute('aria-valuetext', 'লেভেল ২, সর্বোচ্চ ৮');
    expect(block().querySelector('.home-achv-side').lastElementChild).toBe(slider());
  });

  test('dragging raises the shine at once, and 3 seconds later the tree and the slider are back at the own level', () => {
    saveDone(2);
    renderIt({ sets: sets(8) });
    drag(6);
    expect(shine()).toBe(6);
    expect(stage().style.getPropertyValue('--shine')).toBe('0.75');
    expect(screen.getAllByTestId('achv-spark')).toHaveLength(6);
    expect(slider()).toHaveValue('6');
    expect(slider()).toHaveAttribute('aria-valuetext', 'লেভেল ৬, সর্বোচ্চ ৮');
    wait(2999);
    expect(shine()).toBe(6);
    wait(1);
    expect(shine()).toBe(2);
    expect(slider()).toHaveValue('2');
  });

  test('every touch restarts the 3 seconds (a key press too)', () => {
    saveDone(1);
    renderIt({ sets: sets(8) });
    drag(3);
    wait(2000);
    drag(4);
    wait(2000);
    expect(shine()).toBe(4);
    fireEvent.change(slider(), { target: { value: '5' } });
    fireEvent.keyDown(slider(), { key: 'ArrowRight' });
    wait(2999);
    expect(shine()).toBe(5);
    wait(1);
    expect(shine()).toBe(1);
  });

  test('the big number, the ribbon and the spoken count follow the preview, and go back to the real count after 3 seconds; the best-reader line keeps the real count', () => {
    saveDone(1);
    renderIt({ sets: sets(8) });
    const number = () => block().querySelector('.home-achv-num');
    expect(number()).toHaveTextContent('এক');
    drag(7);
    expect(number()).toHaveTextContent('৭');
    expect(block().querySelector('.home-achv-ribbon')).toHaveTextContent('৭');
    expect(block()).toHaveTextContent('আপনার ৭টি গাছ সোনালি হয়েছে');
    expect(block().querySelector('.home-achv-best')).toHaveTextContent('সারতাজ ফিহাম (৬ টি)');
    wait(3000);
    expect(number()).toHaveTextContent('এক');
    expect(block().querySelector('.home-achv-ribbon')).toHaveTextContent('এক');
    expect(block()).toHaveTextContent('আপনার ১টি গাছ সোনালি হয়েছে');
  });

  test('with nothing golden, dragging previews the golden tree and 3 seconds later the grey placeholder is back', () => {
    renderIt({ sets: sets(8) });
    expect(slider()).toHaveValue('0');
    drag(3);
    expect(golden()).not.toBeNull();
    expect(ghost()).toBeNull();
    expect(shine()).toBe(3);
    expect(within(block()).queryByText('শূন্য')).not.toBeInTheDocument();
    expect(block().querySelector('.home-achv-num')).toHaveTextContent('৩');
    expect(block().querySelector('.home-achv-ribbon')).toHaveTextContent('৩');
    wait(3000);
    expect(within(block()).getByText('শূন্য')).toBeInTheDocument();
    expect(block().querySelector('.home-achv-ribbon')).toBeNull();
    expect(golden()).toBeNull();
    expect(ghost()).not.toBeNull();
    expect(slider()).toHaveValue('0');
  });

  test('never goes past the number of sets', () => {
    renderIt({ sets: sets(4) });
    drag(99);
    expect(shine()).toBe(4);
  });

  test('is not part of the link: still one link to /top-picks, and operating the slider does not navigate', () => {
    renderIt({ sets: sets(8) });
    drag(5);
    fireEvent.click(slider());
    expect(within(block()).getAllByRole('link')).toHaveLength(1);
    expect(within(block()).getByRole('link')).not.toContainElement(slider());
    expect(getUrl().pathname).not.toBe('/top-picks');
  });

  test('leaves no timer behind when the block goes away', () => {
    const { unmount } = renderIt({ sets: sets(8) });
    drag(5);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe('the full level', () => {
  test('only the top level (every set golden) is vivid, with extra sparkles; one step below is not', () => {
    saveDone(8);
    renderIt({ sets: sets(8) });
    expect(stage()).toHaveAttribute('data-full', 'true');
    expect(screen.getAllByTestId('achv-spark-full').length).toBeGreaterThan(0);
  });

  test.each([0, 1, 7])('level %i is not vivid', (done) => {
    saveDone(done);
    renderIt({ sets: sets(8) });
    expect(stage()).toHaveAttribute('data-full', 'false');
    expect(screen.queryAllByTestId('achv-spark-full')).toHaveLength(0);
  });

  test('previewing the top level with the slider shows it too, and it ends with the preview', () => {
    vi.useFakeTimers();
    saveDone(2);
    renderIt({ sets: sets(8) });
    fireEvent.change(screen.getByRole('slider'), { target: { value: '8' } });
    expect(stage()).toHaveAttribute('data-full', 'true');
    act(() => { vi.advanceTimersByTime(3000); });
    expect(stage()).toHaveAttribute('data-full', 'false');
    vi.useRealTimers();
  });
});

describe('the golden number and the crown', () => {
  const number = () => block().querySelector('.home-achv-num');

  test('only the max level has the golden-number styling and the crown (which is hidden from screen readers)', () => {
    saveDone(8);
    renderIt({ sets: sets(8) });
    expect(number()).toHaveAttribute('data-max', 'true');
    expect(screen.getByTestId('achv-crown')).toHaveAttribute('data-testid', 'achv-crown');
    expect(number()).toHaveAttribute('aria-hidden', 'true');
  });

  test.each([0, 1, 7])('level %i has neither', (done) => {
    saveDone(done);
    renderIt({ sets: sets(8) });
    expect(number()).toHaveAttribute('data-max', 'false');
    expect(screen.queryByTestId('achv-crown')).not.toBeInTheDocument();
  });

  test('a preview that reaches the max shows them, and they go with the preview', () => {
    vi.useFakeTimers();
    saveDone(0);
    renderIt({ sets: sets(8) });
    fireEvent.change(screen.getByRole('slider'), { target: { value: '8' } });
    expect(number()).toHaveAttribute('data-max', 'true');
    expect(screen.getByTestId('achv-crown')).toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(3000); });
    expect(number()).toHaveAttribute('data-max', 'false');
    expect(screen.queryByTestId('achv-crown')).not.toBeInTheDocument();
    vi.useRealTimers();
  });
});

describe('pausing the animations while far off screen', () => {
  let observers;
  class FakeObserver {
    constructor(callback, options) { this.callback = callback; this.options = options; this.targets = new Set(); this.disconnected = false; observers.push(this); }
    observe(target) { this.targets.add(target); }
    disconnect() { this.disconnected = true; this.targets.clear(); }
  }
  const see = (observer, isIntersecting) => act(() => { observer.callback([...observer.targets].map((target) => ({ target, isIntersecting }))); });

  beforeEach(() => {
    observers = [];
    window.IntersectionObserver = FakeObserver;
  });
  afterEach(() => { delete window.IntersectionObserver; });

  test('no attribute at first; set when it leaves the screen, removed when it comes back', () => {
    renderIt();
    expect(block()).not.toHaveAttribute('data-offscreen');
    expect(observers).toHaveLength(1);
    expect(observers[0].options.rootMargin).toBe('300px');
    expect(observers[0].targets.has(block())).toBe(true);
    see(observers[0], false);
    expect(block()).toHaveAttribute('data-offscreen', 'true');
    see(observers[0], true);
    expect(block()).not.toHaveAttribute('data-offscreen');
  });

  test('re-renders (slider, progress) keep the state, and the observer is made once', () => {
    saveDone(0);
    renderIt({ sets: sets(8) });
    see(observers[0], false);
    fireEvent.change(screen.getByRole('slider'), { target: { value: '3' } });
    expect(block()).toHaveAttribute('data-offscreen', 'true');
    expect(observers).toHaveLength(1);
  });

  test('the observer is disconnected on unmount', () => {
    const { unmount } = renderIt();
    expect(observers[0].disconnected).toBe(false);
    unmount();
    expect(observers[0].disconnected).toBe(true);
  });

  test('without IntersectionObserver nothing is set and nothing breaks', () => {
    delete window.IntersectionObserver;
    renderIt();
    expect(block()).not.toHaveAttribute('data-offscreen');
  });

  test('the server markup has no attribute', () => {
    expect(toHtml(<SettingsProvider><HomeAchievements /></SettingsProvider>)).not.toContain('data-offscreen');
  });
});
