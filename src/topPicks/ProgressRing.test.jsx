import { readFileSync } from 'node:fs';
import path from 'node:path';
import { render, screen } from '@testing-library/react';
import ProgressRing, { bandOf } from './ProgressRing';

const tokens = readFileSync(path.resolve(process.cwd(), 'src/styles/tokens.css'), 'utf8');
const ring = (percent) => {
  render(<ProgressRing percent={percent} label={`${percent} শতাংশ`} />);
  return screen.getByRole('img', { name: `${percent} শতাংশ` });
};

test.each([
  [0, 'red'],
  [1, 'red'],
  [32, 'red'],
  [33, 'yellow'],
  [50, 'yellow'],
  [65, 'yellow'],
  [66, 'green'],
  [99, 'green'],
  [100, 'green'],
])('%i%% is in the %s band', (percent, band) => {
  expect(bandOf(percent)).toBe(band);
  expect(ring(percent)).toHaveAttribute('data-band', band);
});

test('the arc length is proportional to the part read and starts at the top, clockwise', () => {
  ring(25);
  const arc = screen.getByTestId('ring-arc');
  const [shown, total] = arc.getAttribute('stroke-dasharray').split(' ').map(Number);
  expect(shown / total).toBeCloseTo(0.25, 5);
  expect(arc).toHaveAttribute('stroke-linecap', 'round');
  expect(arc.getAttribute('transform')).toMatch(/^rotate\(-90 /); // 12 o'clock, then clockwise by default
  expect(arc.getAttribute('stroke')).toBe('var(--progress-red)');
});

test('a bigger share gives a longer arc, in the colour of its band', () => {
  ring(50);
  const arc = screen.getByTestId('ring-arc');
  const [shown, total] = arc.getAttribute('stroke-dasharray').split(' ').map(Number);
  expect(shown / total).toBeCloseTo(0.5, 5);
  expect(arc.getAttribute('stroke')).toBe('var(--progress-yellow)');
});

test('at 0% only the faint red track is drawn, no arc', () => {
  ring(0);
  expect(screen.queryByTestId('ring-arc')).not.toBeInTheDocument();
  expect(screen.getByTestId('ring-track')).toHaveAttribute('stroke', 'var(--progress-red-track)');
});

test('at 100% there is a green disc with a tick instead of the arc', () => {
  const svg = ring(100);
  expect(screen.queryByTestId('ring-arc')).not.toBeInTheDocument();
  expect(svg).toHaveAttribute('data-full', 'true');
  expect(screen.getByTestId('ring-disc')).toHaveAttribute('fill', 'var(--progress-green)');
  expect(screen.getByTestId('ring-tick')).toBeInTheDocument();
  expect(screen.queryByTestId('ring-track')).not.toBeInTheDocument();
});

test('the ring is an image with the label it is given, about 20px', () => {
  const svg = ring(40);
  expect(svg).toHaveAttribute('width', '20');
  expect(svg).toHaveAttribute('height', '20');
});

test('the tokens exist in the light, dark and sepia themes and the automatic dark copy', () => {
  for (const name of ['--progress-label', '--progress-red-text', '--progress-yellow-text', '--progress-green-text', '--progress-red', '--progress-yellow', '--progress-green', '--progress-red-track', '--progress-yellow-track', '--progress-green-track']) {
    expect(tokens.split(`${name}:`).length - 1, name).toBe(4);
  }
});
