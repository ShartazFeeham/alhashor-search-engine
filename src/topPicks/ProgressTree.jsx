'use client';

import { useId } from 'react';
import { useDigits } from '../lib/useDigits';

// A tree that grows with the reader's progress through a set. Eleven stages, chosen by
// floor(percent / 10) * 10; drawn with plain shapes (no images) in a 100 x 120 box, the ground at y = 108.
//
//   0 nothing but the ground      60 a complete, thick, tall tree
//  10 a cluster of green seeds    70 one or two green fruits
//  20 a baby tree, 1 leaf         80 many green fruits
//  30 a baby tree, 3 leaves       90 colourful fruits, some on the ground
//  40 a thin tall bare tree      100 the whole tree and its fruits turn golden and shiny
//  50 the same, with leaves
//
// The colours are tokens (--tree-* in styles/tokens.css) so the tree reads on light, dark and sepia;
// the fruit colours and the gold are constants, and all positions are fixed lists, so a tree looks
// the same on every render.

export const treeStage = (percent) => {
  const value = Number.isFinite(percent) ? Math.min(100, Math.max(0, percent)) : 0;
  return Math.floor(value / 10) * 10;
};

const GROUND_Y = 108;
const SEEDS = [[31, 106.5], [36, 105], [40, 107], [44, 105.2], [48, 106.8], [52, 105.4], [56, 107], [60, 105.2], [64, 106.6], [68, 105.4], [42, 103.6], [50, 103.2], [58, 103.8], [34, 103.4]];
const THIN_TRUNK = 'M48.6 108 Q49.4 90 49.2 40 L50.8 40 Q50.6 90 51.4 108 Z';
const THICK_TRUNK = 'M43.5 108 Q47.5 96 47 78 L47 56 L53 56 L53 78 Q52.5 96 56.5 108 Z';
const BRANCHES = [
  'M50 90 Q40 84 30 72', 'M50 84 Q60 78 70 64', 'M50 72 Q40 64 34 50', 'M50 66 Q60 58 66 44',
  'M50 56 Q44 46 42 32', 'M50 50 Q56 38 58 26', 'M50 42 Q50 28 50 16',
  'M30 72 Q24 68 20 60', 'M70 64 Q76 60 80 52', 'M34 50 Q28 44 26 36', 'M66 44 Q72 38 74 30',
];
const LEAVES = [
  [30, 72], [20, 60], [26, 36], [34, 50], [42, 32], [50, 16], [58, 26], [66, 44], [74, 30],
  [80, 52], [70, 64], [24, 66], [36, 40], [44, 22], [56, 36], [62, 32], [76, 44], [40, 60],
];
const CANOPY = [[50, 34, 20], [32, 50, 15], [68, 50, 15], [40, 24, 13], [60, 24, 13], [50, 52, 16], [24, 62, 10], [76, 62, 10]];
const TREE_FRUITS = [[42, 40], [60, 48], [50, 26], [30, 54], [70, 56], [46, 56], [58, 34], [36, 30], [64, 24], [52, 44]];
const GROUND_FRUITS = [[32, 106.4], [42, 107], [62, 107], [72, 106.4]];
const FRUIT_COLORS = ['#e5484d', '#f08a24', '#f2c230', '#8e4ec6', '#e5589b'];
const GREEN_FRUIT = '#b5e04a';
const GOLD_EDGE = '#9a6408';

// How many tree fruits (and ground fruits) a stage shows, and of which kind.
function fruitsOf(stage) {
  if (stage < 70) return [];
  const count = stage === 70 ? 2 : TREE_FRUITS.length;
  const onTree = TREE_FRUITS.slice(0, count).map(([x, y], index) => ({ x, y, r: 3.4, index }));
  const onGround = stage >= 90 ? GROUND_FRUITS.map(([x, y], index) => ({ x, y, r: 2.7, index: TREE_FRUITS.length + index, ground: true })) : [];
  return [...onTree, ...onGround];
}

// `ghost` draws the full tree as a plain grey dashed outline: the empty placeholder of the home page's
// achievements (no colour, no fruit; the look comes from .progress-tree-ghost in styles/daily.css).
export default function ProgressTree({ percent, ghost = false }) {
  const digits = useDigits();
  const stage = ghost ? 60 : treeStage(percent);
  const gold = stage === 100;
  const thick = stage >= 60;
  const hasTree = stage >= 40;
  const uid = useId().replace(/:/g, '');
  const body = `url(#${uid}-gold)`;
  const light = `url(#${uid}-goldlight)`;
  const shown = Math.round(Math.min(100, Math.max(0, Number.isFinite(percent) ? percent : 0)));
  const fruits = ghost ? [] : fruitsOf(stage);

  const fruitFill = (fruit) => (gold ? body : stage >= 90 ? FRUIT_COLORS[fruit.index % FRUIT_COLORS.length] : GREEN_FRUIT);
  const fruitKind = (fruit) => (gold ? 'golden' : fruit.ground ? 'ground' : stage >= 90 ? 'colorful' : 'green');

  return (
    <svg
      className={gold ? 'progress-tree progress-tree-gold' : ghost ? 'progress-tree progress-tree-ghost' : 'progress-tree'}
      data-testid="progress-tree"
      data-stage={stage}
      data-golden={gold ? 'true' : 'false'}
      data-thick={thick ? 'true' : 'false'}
      viewBox="0 0 100 120"
      preserveAspectRatio="xMidYMax meet"
      role="img"
      aria-label={`অগ্রগতির গাছ: ${digits(shown)}%`}
    >
      {gold && (
        <defs>
          <linearGradient id={`${uid}-gold`} gradientUnits="userSpaceOnUse" x1="0" y1="8" x2="0" y2="110">
            <stop offset="0" stopColor="#ffe680" />
            <stop offset="0.5" stopColor="#f0b323" />
            <stop offset="1" stopColor="#b9770b" />
          </linearGradient>
          <linearGradient id={`${uid}-goldlight`} gradientUnits="userSpaceOnUse" x1="0" y1="8" x2="0" y2="110">
            <stop offset="0" stopColor="#fff3b0" />
            <stop offset="1" stopColor="#f6c945" />
          </linearGradient>
        </defs>
      )}
      <path data-part="ground" d={`M10 ${GROUND_Y} H90`} stroke="var(--tree-ground)" strokeWidth="2" strokeLinecap="round" fill="none" />

      {stage === 10 && SEEDS.map(([x, y], index) => (
        <ellipse key={index} data-part="seed" cx={x} cy={y} rx="2" ry="1.3" fill="var(--tree-seed)" transform={`rotate(${index % 2 ? 20 : -20} ${x} ${y})`} />
      ))}

      {(stage === 20 || stage === 30) && (
        <>
          <path data-part="sprout" d={stage === 20 ? 'M50 108 Q49 99 50 91' : 'M50 108 Q49 96 50 82'} stroke="var(--tree-leaf)" strokeWidth="2.2" strokeLinecap="round" fill="none" />
          <ellipse data-part="leaf" cx="55.5" cy={stage === 20 ? 90 : 86} rx="5.2" ry="2.8" fill="var(--tree-leaf)" transform={`rotate(-28 55.5 ${stage === 20 ? 90 : 86})`} />
          {stage === 30 && (
            <>
              <ellipse data-part="leaf" cx="44" cy="92" rx="5" ry="2.7" fill="var(--tree-leaf)" transform="rotate(28 44 92)" />
              <ellipse data-part="leaf" cx="50" cy="80" rx="2.7" ry="5" fill="var(--tree-leaf)" />
            </>
          )}
        </>
      )}

      {hasTree && (
        <>
          <path data-part="trunk" d={thick ? THICK_TRUNK : THIN_TRUNK} fill={gold ? body : 'var(--tree-trunk)'} stroke={gold ? GOLD_EDGE : 'none'} strokeWidth="0.5" />
          {BRANCHES.map((d, index) => (
            <path key={d} data-part="branch" d={d} stroke={gold ? body : 'var(--tree-trunk)'} strokeWidth={thick ? 2.4 : 1.6} strokeLinecap="round" fill="none" data-index={index} />
          ))}
        </>
      )}

      {thick && CANOPY.map(([x, y, r], index) => (
        <circle key={index} data-part="canopy" cx={x} cy={y} r={r} fill={gold ? body : 'var(--tree-canopy)'} stroke={gold ? GOLD_EDGE : 'none'} strokeWidth="0.5" />
      ))}

      {stage >= 50 && !ghost && LEAVES.map(([x, y], index) => (
        <ellipse
          key={index}
          data-part="leaf"
          cx={x}
          cy={y}
          rx="4.6"
          ry="2.5"
          fill={gold ? light : thick ? 'var(--tree-canopy2)' : 'var(--tree-leaf)'}
          transform={`rotate(${index % 2 ? -35 : 35} ${x} ${y})`}
        />
      ))}

      {fruits.map((fruit) => (
        <g key={fruit.index}>
          <circle
            data-part="fruit"
            data-kind={fruitKind(fruit)}
            cx={fruit.x}
            cy={fruit.y}
            r={fruit.r}
            fill={fruitFill(fruit)}
            stroke={gold ? GOLD_EDGE : stage >= 90 ? 'rgba(0,0,0,.25)' : '#5d8f12'}
            strokeWidth="0.5"
          />
          {gold && (
            <ellipse
              data-part="shine"
              cx={fruit.x - fruit.r * 0.35}
              cy={fruit.y - fruit.r * 0.4}
              rx={fruit.r * 0.32}
              ry={fruit.r * 0.2}
              fill="#ffffff"
              opacity="0.85"
              transform={`rotate(-35 ${fruit.x - fruit.r * 0.35} ${fruit.y - fruit.r * 0.4})`}
              style={{ animationDelay: `${(fruit.index % 5) * 0.45}s` }}
            />
          )}
        </g>
      ))}
    </svg>
  );
}
