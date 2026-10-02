import { readFileSync } from 'node:fs';
import path from 'node:path';
import { render, screen } from '@testing-library/react';
import PickTile from '../topPicks/PickTile';
import { CALM_COLORS, LOVING_COLORS, PICK_COLORS, colorOf } from './topPickColors';
import { ALL_SETS } from './topPicks';
import { PLANS } from '../data/readingPlans';

const tokens = readFileSync(path.resolve(process.cwd(), 'src/styles/tokens.css'), 'utf8');

test('every set and older plan has a colour entry', () => {
  for (const set of [...ALL_SETS, ...PLANS]) expect(PICK_COLORS[set.number] ?? PICK_COLORS[set.id], set.id).toBeDefined();
  for (let number = 1; number <= 12; number += 1) expect(PICK_COLORS[number]).toBeDefined();
});

test('sets 1 to 4 use the loving group, all others the calm group, and sets 1 to 4 differ from each other', () => {
  for (let number = 1; number <= 4; number += 1) expect(LOVING_COLORS).toContain(PICK_COLORS[number]);
  expect(new Set([1, 2, 3, 4].map((number) => PICK_COLORS[number])).size).toBe(4);
  for (const key of [5, 6, 7, 8, 9, 10, 11, 12, 'ramadan-30', 'short-40', 'character-7']) {
    expect(CALM_COLORS, String(key)).toContain(PICK_COLORS[key]);
    expect(LOVING_COLORS).not.toContain(PICK_COLORS[key]);
  }
});

test('neighbouring sets never share a colour', () => {
  const order = [...Array.from({ length: 12 }, (_, i) => i + 1), 'ramadan-30', 'short-40', 'character-7'];
  for (let i = 1; i < order.length; i += 1) expect(PICK_COLORS[order[i]]).not.toBe(PICK_COLORS[order[i - 1]]);
});

test('every colour used has tokens in all three themes (and the automatic dark copy)', () => {
  const used = new Set(Object.values(PICK_COLORS));
  for (const colour of used) {
    const count = tokens.split(`--pick-${colour}-bg:`).length - 1;
    expect(count, colour).toBe(4); // light, dark, sepia, automatic dark
  }
});

test('colorOf reads the number, then the id', () => {
  expect(colorOf({ number: 1, id: 'x' })).toBe('rose');
  expect(colorOf({ id: 'short-40' })).toBe('grey');
});

test('the tile holds an aria-hidden list icon and the colour tokens', () => {
  render(<PickTile set={{ number: 2, id: 'x' }} />);
  expect(screen.getByTestId('icon-list')).toHaveAttribute('aria-hidden', 'true');
  const tile = screen.getByTestId('pick-tile');
  expect(tile).toHaveAttribute('data-color', 'green');
  expect(tile.style.getPropertyValue('--tile-bg')).toBe('var(--pick-green-bg)');
  expect(tile.style.getPropertyValue('--tile-fg')).toBe('var(--pick-green-fg)');
});
