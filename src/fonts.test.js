import { existsSync } from 'node:fs';
import path from 'node:path';

const fontFiles = [
  'HindSiliguri-Regular.ttf',
  'HindSiliguri-Medium.ttf',
  'HindSiliguri-SemiBold.ttf',
  'HindSiliguri-Bold.ttf',
  'NotoSerifBengali.ttf',
  'PlusJakartaSans.ttf',
  'OFL.txt',
];

test.each(fontFiles)('the font file %s is in the repository', (file) => {
  expect(existsSync(path.resolve(process.cwd(), 'src/assets/fonts', file))).toBe(true);
});

test('the fonts module names the three CSS variables', async () => {
  vi.doMock('next/font/local', () => ({
    default: (options) => ({ variable: options.variable, className: 'c', options }),
  }));
  const { uiFont, readFont, latinFont } = await import('./fonts.js');
  expect(uiFont.variable).toBe('--f-ui');
  expect(readFont.variable).toBe('--f-read');
  expect(latinFont.variable).toBe('--f-lat');
});

test('only the interface font is preloaded; the reading serif and Latin font load when used', async () => {
  vi.resetModules();
  vi.doMock('next/font/local', () => ({
    default: (options) => ({ variable: options.variable, className: 'c', options }),
  }));
  const { uiFont, readFont, latinFont } = await import('./fonts.js');
  expect(readFont.options.preload).toBe(false);
  expect(latinFont.options.preload).toBe(false);
  expect(uiFont.options.preload).not.toBe(false);
  for (const font of [uiFont, readFont, latinFont]) expect(font.options.display).toBe('swap');
});

test('the preloaded interface font carries only the weights the pages use (no Medium)', async () => {
  vi.resetModules();
  vi.doMock('next/font/local', () => ({
    default: (options) => ({ variable: options.variable, className: 'c', options }),
  }));
  const { uiFont } = await import('./fonts.js');
  expect(uiFont.options.src.map((face) => face.weight)).toEqual(['400', '600', '700']);
});
