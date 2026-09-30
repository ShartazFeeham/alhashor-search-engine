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
    default: (options) => ({ variable: options.variable, className: 'c' }),
  }));
  const { uiFont, readFont, latinFont } = await import('./fonts.js');
  expect(uiFont.variable).toBe('--f-ui');
  expect(readFont.variable).toBe('--f-read');
  expect(latinFont.variable).toBe('--f-lat');
});
