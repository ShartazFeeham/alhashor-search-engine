import { readFileSync } from 'node:fs';
import path from 'node:path';

const read = (name) => readFileSync(path.resolve(process.cwd(), 'src/styles', name), 'utf8');
const home = read('home.css');
const daily = read('daily.css');
const tokens = read('tokens.css');
const phone = /@media \(max-width: 640px\)\{((?:[^{}]|\{[^}]*\})*)\}/.exec(home)?.[1] ?? '';
const rule = (css, selector) => css.slice(css.indexOf(`${selector}{`) + selector.length + 1, css.indexOf('}', css.indexOf(`${selector}{`)));

describe('home achievements styles', () => {
  test('on a phone the block is ordered after the shelf (order 3, the shelf is 2)', () => {
    expect(phone).toMatch(/\.home-shelf-wrap\{order:2\}/);
    expect(phone).toMatch(/\.home-achv\{order:3/);
  });

  test('the text and the tree share a row (the tree is after the text, so at the right), also on a phone', () => {
    expect(rule(home, '.home-achv-body')).toMatch(/display:flex/);
    expect(rule(home, '.home-achv-body')).not.toMatch(/flex-direction|row-reverse|order/);
    expect(rule(home, '.home-achv-text')).toMatch(/flex:1;min-width:0/);
    expect(phone).not.toMatch(/\.home-achv-body|flex-direction|column/);
  });

  test('the big number is large (66px; 44px before) and the ribbon count 21px (14px before), and neither can overflow the text column', () => {
    expect(rule(home, '.home-achv-num')).toMatch(/font-size:66px/);
    expect(rule(home, '.home-achv-num')).toMatch(/overflow-wrap:anywhere/);
    expect(rule(home, '.home-achv-ribbon')).toMatch(/font-size:21px/);
    expect(rule(home, '.home-achv-text')).toMatch(/min-width:0/);
  });

  test('the slider is a 44px target above the stretched link, with a gold track and thumb, and no transition', () => {
    const range = rule(home, '.home-achv-range');
    expect(range).toMatch(/position:relative;z-index:2/);
    expect(range).toMatch(/height:44px/);
    expect(range).toMatch(/width:100%;min-width:0/);
    expect(range).not.toMatch(/transition|animation/);
    expect(home).toMatch(/\.home-achv-range::-webkit-slider-thumb\{[^}]*var\(--ach-gold-/);
    expect(home).toMatch(/\.home-achv-range::-moz-range-track\{[^}]*var\(--ach-gold-/);
    expect(phone).toMatch(/\.home-achv-side\{flex-basis/);
  });

  test('the block has no hover effect (only the keyboard focus ring), and nothing in it is clipped', () => {
    expect(home).not.toMatch(/\.home-achv[^{]*:hover/);
    expect(rule(home, '.home-achv')).not.toMatch(/transition|transform|overflow/);
    expect(home).toMatch(/\.home-achv:has\(\.home-achv-go:focus-visible\)\{outline/);
    expect(rule(home, '.home-achv')).toMatch(/isolation:isolate/);
  });

  test('the glow spills out of its box: big halo and rays behind the content, never taking a click, and the page cannot scroll sideways', () => {
    const glow = rule(home, '.home-achv-halo,.home-achv-rays');
    expect(glow).toMatch(/z-index:-1/);
    expect(glow).toMatch(/pointer-events:none/);
    expect(home).toMatch(/\.home-achv-halo\{width:calc\(190px \+ 190px\*var\(--shine\)\)/);
    expect(home).toMatch(/\.home-achv-rays\{width:calc\(230px \+ 230px\*var\(--shine\)\)/);
    expect(rule(home, '.home-achv-spark')).toMatch(/pointer-events:none/);
    expect(rule(home, '.screen.home')).toMatch(/overflow-x:clip/);
    expect(rule(home, '.home-achv-stage')).not.toMatch(/overflow/);
  });

  test('the full level has its own vivid styling (the hot amber, a wider halo, stronger rays), pulsing only when motion is allowed', () => {
    expect(home).toMatch(/\.home-achv-stage\[data-full="true"\] \.home-achv-halo\{width:460px[^}]*var\(--ach-hot\)[^}]*opacity:1/);
    expect(home).toMatch(/\.home-achv-stage\[data-full="true"\] \.home-achv-rays\{width:560px[^}]*opacity:\.85/);
    expect(home).toMatch(/\.home-achv-stage\[data-full="true"\] \.progress-tree-gold\{filter:saturate/);
    expect(home).not.toMatch(/data-full[^}]*animation/);
    expect(daily).toMatch(/@media \(prefers-reduced-motion:no-preference\)\{[^@]*data-full="true"\] \.home-achv-halo\{animation:achv-pulse/);
    expect(tokens).toMatch(/--ach-hot:/);
  });

  test('only the max-level number is golden, with a black outline under the fill and a glow, a plain colour under forced colours; the crown is sized from the number', () => {
    expect(rule(home, '.home-achv-num')).not.toMatch(/stroke|text-shadow/);
    const max = rule(home, '.home-achv-num[data-max="true"]');
    expect(max).toMatch(/color:var\(--ach-gold-2\)/);
    expect(max).toMatch(/-webkit-text-stroke:1\.5px #000/);
    expect(max).toMatch(/paint-order:stroke fill/);
    expect(max).toMatch(/text-shadow:/);
    expect(home).toMatch(/@media \(forced-colors:active\)\{[^@]*data-max="true"\]\{color:CanvasText;-webkit-text-stroke:0/);
    expect(rule(home, '.home-achv-crown')).toMatch(/width:\.5em/);
    expect(daily).toMatch(/@media \(prefers-reduced-motion:no-preference\)\{[^@]*\.home-achv-crown\{animation:achv-bob/);
    expect(home).not.toMatch(/\.home-achv-crown\{[^}]*animation/);
  });

  test('the button is a 44px target and its ::after stretches over the whole block', () => {
    expect(rule(home, '.home-achv-go')).toMatch(/min-height:44px/);
    expect(rule(home, '.home-achv')).toMatch(/position:relative/);
    expect(home).toMatch(/\.home-achv-go::after\{content:"";position:absolute;inset:0/);
    expect(rule(home, '.home-achv-text')).not.toMatch(/position/);
  });

  test('the glow grows with --shine and nothing moves unless motion is allowed', () => {
    expect(rule(home, '.home-achv-halo,.home-achv-rays')).not.toMatch(/animation/);
    expect(home).toMatch(/\.home-achv-halo\{[^}]*calc\([^)]*var\(--shine\)/);
    expect(daily).toMatch(/@media \(prefers-reduced-motion:no-preference\)\{\s*\.home-achv-rays\{animation/);
    expect(home).not.toMatch(/achv[^}]*animation:/);
  });

  test('every theme has the ghost outline and the glow colour', () => {
    expect(tokens.match(/--tree-ghost:/g)).toHaveLength(4);
    expect(tokens.match(/--ach-glow:/g)).toHaveLength(4);
  });
});
