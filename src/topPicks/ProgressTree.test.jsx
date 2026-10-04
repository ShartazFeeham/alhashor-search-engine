/* eslint-disable testing-library/no-node-access */
import { render, screen } from '@testing-library/react';
import { SettingsProvider } from '../settings/SettingsProvider';
import ProgressTree, { treeStage } from './ProgressTree';

const draw = (percent) => render(<SettingsProvider><ProgressTree percent={percent} /></SettingsProvider>);
const parts = (name) => screen.getByTestId('progress-tree').querySelectorAll(`[data-part="${name}"]`);
const fruits = (kind) => screen.getByTestId('progress-tree').querySelectorAll(`[data-part="fruit"]${kind ? `[data-kind="${kind}"]` : ''}`);

describe('treeStage', () => {
  test.each([
    [0, 0], [9, 0], [10, 10], [19, 10], [20, 20], [29, 20], [30, 30], [39, 30], [40, 40], [49, 40],
    [50, 50], [59, 50], [60, 60], [69, 60], [70, 70], [79, 70], [80, 80], [89, 80], [90, 90], [99, 90], [100, 100],
  ])('%i%% is stage %i', (percent, stage) => {
    expect(treeStage(percent)).toBe(stage);
  });

  test('stays inside 0 to 100', () => {
    expect(treeStage(-5)).toBe(0);
    expect(treeStage(140)).toBe(100);
    expect(treeStage(Number.NaN)).toBe(0);
  });
});

describe('the picture', () => {
  test('is an image with a Bengali label that names the percentage', () => {
    draw(40);
    const tree = screen.getByRole('img', { name: 'অগ্রগতির গাছ: ৪০%' });
    expect(tree).toBe(screen.getByTestId('progress-tree'));
    expect(tree).toHaveAttribute('data-stage', '40');
  });

  test('the label follows the exact percentage, not the stage', () => {
    draw(47);
    expect(screen.getByRole('img', { name: 'অগ্রগতির গাছ: ৪৭%' })).toHaveAttribute('data-stage', '40');
  });

  test('has a ground line at every stage', () => {
    for (const percent of [0, 55, 100]) {
      const { unmount } = draw(percent);
      expect(parts('ground')).toHaveLength(1);
      unmount();
    }
  });

  test('0%: nothing but the ground', () => {
    draw(0);
    for (const name of ['seed', 'sprout', 'trunk', 'branch', 'leaf', 'canopy', 'fruit']) expect(parts(name), name).toHaveLength(0);
  });

  test('10%: a dense cluster of green seeds on the soil', () => {
    draw(10);
    expect(parts('seed').length).toBeGreaterThanOrEqual(10);
    expect(parts('trunk')).toHaveLength(0);
    expect(parts('sprout')).toHaveLength(0);
  });

  test('20%: a baby tree with 1 leaf, 30%: with 3 leaves', () => {
    const view = draw(20);
    expect(parts('sprout')).toHaveLength(1);
    expect(parts('leaf')).toHaveLength(1);
    expect(parts('seed')).toHaveLength(0);
    view.unmount();
    draw(30);
    expect(parts('sprout')).toHaveLength(1);
    expect(parts('leaf')).toHaveLength(3);
  });

  test('40%: a tall thin tree with bare branches and no leaves', () => {
    draw(40);
    expect(parts('trunk')).toHaveLength(1);
    expect(parts('branch').length).toBeGreaterThanOrEqual(4);
    expect(parts('leaf')).toHaveLength(0);
    expect(parts('sprout')).toHaveLength(0);
    expect(screen.getByTestId('progress-tree')).toHaveAttribute('data-thick', 'false');
  });

  test('50%: the same thin tree with leaves', () => {
    draw(50);
    expect(parts('branch').length).toBeGreaterThanOrEqual(4);
    expect(parts('leaf').length).toBeGreaterThanOrEqual(10);
    expect(parts('canopy')).toHaveLength(0);
    expect(screen.getByTestId('progress-tree')).toHaveAttribute('data-thick', 'false');
  });

  test('60%: a complete, thick, full tree with no fruit', () => {
    draw(60);
    expect(screen.getByTestId('progress-tree')).toHaveAttribute('data-thick', 'true');
    expect(parts('canopy').length).toBeGreaterThanOrEqual(5);
    expect(parts('leaf').length).toBeGreaterThanOrEqual(10);
    expect(fruits()).toHaveLength(0);
  });

  test('70%: one or two green fruits; 80%: many more', () => {
    const view = draw(70);
    const few = fruits().length;
    expect(few).toBeGreaterThanOrEqual(1);
    expect(few).toBeLessThanOrEqual(2);
    expect(fruits('green')).toHaveLength(few);
    view.unmount();
    draw(80);
    expect(fruits().length).toBeGreaterThanOrEqual(8);
    expect(fruits('green')).toHaveLength(fruits().length);
  });

  test('90%: the fruits are colourful (varied, always the same) and some lie on the ground', () => {
    const view = draw(90);
    const colours = [...fruits('colorful')].map((fruit) => fruit.getAttribute('fill'));
    expect(new Set(colours).size).toBeGreaterThanOrEqual(4);
    expect(fruits('ground').length).toBeGreaterThanOrEqual(3);
    expect(fruits('green')).toHaveLength(0);
    expect(fruits().length).toBeGreaterThan(8);
    view.unmount();
    draw(90);
    expect([...fruits('colorful')].map((fruit) => fruit.getAttribute('fill'))).toEqual(colours);
  });

  test('100%: everything is golden and shiny', () => {
    draw(100);
    const tree = screen.getByTestId('progress-tree');
    expect(tree).toHaveAttribute('data-golden', 'true');
    expect(tree.querySelector('linearGradient, lineargradient')).not.toBeNull();
    expect(parts('shine').length).toBeGreaterThanOrEqual(fruits().length);
    expect(fruits('golden')).toHaveLength(fruits().length);
    expect(fruits().length).toBeGreaterThan(8);
    expect([...parts('canopy')].every((canopy) => canopy.getAttribute('fill').startsWith('url(#'))).toBe(true);
  });

  test('is not golden before 100%', () => {
    draw(99);
    expect(screen.getByTestId('progress-tree')).toHaveAttribute('data-golden', 'false');
  });

  test('each stage draws something different from the one before', () => {
    const seen = [];
    for (let percent = 0; percent <= 100; percent += 10) {
      const { unmount } = draw(percent);
      seen.push(screen.getByTestId('progress-tree').innerHTML);
      unmount();
    }
    expect(new Set(seen).size).toBe(11);
  });

  test('leaves, fruits and canopy only ever grow with the stage (until the tree turns gold)', () => {
    const counts = [];
    for (let percent = 0; percent <= 100; percent += 10) {
      const { unmount } = draw(percent);
      counts.push([parts('leaf').length, fruits().length]);
      unmount();
    }
    for (let i = 5; i < counts.length; i += 1) {
      expect(counts[i][0]).toBeGreaterThanOrEqual(counts[i - 1][0]);
      expect(counts[i][1]).toBeGreaterThanOrEqual(counts[i - 1][1]);
    }
  });
});

describe('the ghost placeholder', () => {
  test('draws the whole tree as an outline: no fruit, no leaves, not golden', () => {
    render(<SettingsProvider><ProgressTree percent={0} ghost /></SettingsProvider>);
    const tree = screen.getByTestId('progress-tree');
    expect(tree).toHaveClass('progress-tree-ghost');
    expect(tree).toHaveAttribute('data-golden', 'false');
    expect(parts('trunk')).toHaveLength(1);
    expect(parts('canopy').length).toBeGreaterThan(0);
    expect(parts('leaf')).toHaveLength(0);
    expect(fruits()).toHaveLength(0);
  });
});
