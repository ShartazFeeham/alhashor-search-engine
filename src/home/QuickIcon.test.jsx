import { readFileSync } from 'node:fs';
import path from 'node:path';
import { render, screen } from '@testing-library/react';
import QuickIcon, { QUICK_ICON_COLORS } from './QuickIcon';

const css = readFileSync(path.resolve(process.cwd(), 'src/styles/daily.css'), 'utf8');

test('each of the four cards has its own filled icon colour: pink, blue, green, purple', () => {
  expect(QUICK_ICON_COLORS).toEqual({ heart: 'pink', speaker: 'blue', tag: 'green', clock: 'purple' });
});

test.each(['heart', 'speaker', 'tag', 'clock'])('the %s icon is filled, hidden from screen readers and coloured by its token', (kind) => {
  render(<QuickIcon kind={kind} />);
  const svg = screen.getByTestId(`quick-icon-${kind}`);
  expect(svg).toHaveAttribute('aria-hidden', 'true');
  expect(svg).toHaveAttribute('data-filled', 'true');
  expect(svg.getAttribute('style')).toContain(`var(--qi-${QUICK_ICON_COLORS[kind]})`);
});

test('the speaker has sound waves', () => {
  render(<QuickIcon kind="speaker" />);
  expect(screen.getByTestId('quick-icon-speaker').querySelectorAll('[data-wave]').length).toBeGreaterThanOrEqual(2); // eslint-disable-line testing-library/no-node-access
});

test('an unknown kind draws nothing', () => {
  const { container } = render(<QuickIcon kind="nope" />);
  expect(container).toBeEmptyDOMElement();
});

test('the card stylesheet no longer paints these icons with the line-icon accent', () => {
  expect(css).not.toMatch(/\.home-quick-links \.ui-icon\{color:var\(--accent2\)\}/);
});
