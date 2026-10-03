import { readFileSync } from 'node:fs';
import path from 'node:path';
import { render, screen, within } from '@testing-library/react';
import { SettingsProvider } from '../settings/SettingsProvider';
import TopPicksPage from './TopPicksPage';

/* eslint-disable testing-library/no-node-access */
const css = readFileSync(path.resolve(process.cwd(), 'src/styles/daily.css'), 'utf8');
const escape = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const rule = (selector) => css.match(new RegExp(`(?:^|\\n)\\s*${escape(selector)}\\{([^}]*)\\}`))?.[1] ?? '';
const value = (declarations, property) => declarations.match(new RegExp(`(?:^|;)${property}:([^;]*)`))?.[1].trim() ?? null;

const LONG = 'উম্মতের মাঝে শ্রেষ্ঠতম: আহলে বায়াত ও তাঁদের ফজিলত';
const days = (n) => Array.from({ length: n }, (_, index) => ({ book: 'bukhari', number: index + 1 }));
const sets = [
  { id: 'empty', title: LONG, description: 'ক', days: days(4) },
  { id: 'all', title: 'সম্পূর্ণ', description: 'খ', days: days(4) },
  { id: 'half', title: 'অর্ধেক', description: '', days: days(4) },
];
const cards = () => screen.getAllByRole('link').filter((link) => link.classList.contains('plan-card'));

beforeEach(() => {
  localStorage.setItem('alhashor.plan-progress', JSON.stringify({ all: [0, 1, 2, 3], half: [0, 1] }));
  render(<SettingsProvider><TopPicksPage sets={sets} /></SettingsProvider>);
});

test('every card holds a tree for its own set: ground only at 0, golden when all is read, half-way', () => {
  const stages = cards().map((card) => card.querySelector('[data-testid="progress-tree"]').getAttribute('data-stage'));
  expect(stages).toEqual(['0', '100', '50']);
  expect(cards()[1].querySelector('[data-testid="progress-tree"]')).toHaveAttribute('data-golden', 'true');
  expect(cards()[0].querySelector('[data-part="ground"]')).not.toBeNull();
  expect(cards()[0].querySelector('[data-part="trunk"]')).toBeNull();
});

test('the tree is decoration: hidden from screen readers, the progress text and ring still read', () => {
  cards().forEach((card) => {
    expect(card.querySelector('[data-testid="progress-tree"]').closest('[aria-hidden="true"]')).toHaveClass('plan-card-tree');
    expect(within(card).queryByRole('img', { name: /অগ্রগতির গাছ/ })).toBeNull();
  });
  expect(screen.queryAllByRole('img', { name: /অগ্রগতির গাছ/ })).toHaveLength(0);
  expect(screen.getAllByText(/আপনি পড়েছেন/)).toHaveLength(3);
});

test('a card is still one link with the full title, and the tree sits last (at the right)', () => {
  expect(cards()).toHaveLength(3);
  expect(cards()[0].querySelectorAll('a')).toHaveLength(0);
  expect(within(cards()[0]).getByText(LONG).textContent).toBe(LONG);
  expect(cards()[0].lastElementChild).toHaveClass('plan-card-tree');
});

test('the tree column is a fifth of the card, between 64 and 140px, and the tree scales to it', () => {
  const column = rule('.plan-card-tree');
  expect(value(column, 'flex')).toBe('0 0 20%');
  expect(value(column, 'min-width')).toBe('64px');
  expect(value(column, 'max-width')).toBe('140px');
  expect(value(rule('.plan-card-tree .progress-tree'), 'width')).toBe('100%');
  expect(rule('.plan-card-tree')).not.toMatch(/(?:^|;)width:\d/);
});

test('with the tree a card stays 84 to 110px tall at every width; the text column still shrinks', () => {
  const card = rule('.plan-card');
  const [top, , bottom] = value(card, 'padding').split(/\s+/).map(parseFloat);
  const frame = top + bottom + parseFloat(value(card, 'border')) * 2;
  const tall = [value(rule('.plan-card-tree .progress-tree'), 'height'), css.match(/min-width: 641px\)\{\s*\.plan-card-tree \.progress-tree\{height:(\d+px)/)[1]];
  tall.forEach((height) => {
    expect(frame + parseFloat(height)).toBeGreaterThanOrEqual(84);
    expect(frame + parseFloat(height)).toBeLessThanOrEqual(110);
  });
  expect(value(rule('.plan-card-body'), 'min-width')).toBe('0');
});
