/* eslint-disable testing-library/no-node-access */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { clearNarratorCache, honorific } from '../lib/narrators';
import { groupTopics } from '../lib/topicBlocks';
import { SettingsProvider } from '../settings/SettingsProvider';
import { setUrl } from '../test/nextNavigation';
import { serveRealData } from '../test/publicJson';
import { ToastProvider } from '../ui/Toast';
import NarratorsPage from './NarratorsPage';

// (রাঃ) after each narrator's name is display only: the name itself, the search, the sorts and the address stay plain.
vi.setConfig({ testTimeout: 30000 });
const INDEX = JSON.parse(readFileSync(path.resolve(process.cwd(), 'public/json/narrators/index.json'), 'utf8'));
const NAMES = INDEX.map((row) => row[1]);

test('honorific gives (রাঃ), and nothing for a name that already ends with a bracketed honorific', () => {
  expect(honorific('আবূ হুরায়রা')).toBe('(রাঃ)');
  expect(honorific('আয়িশা (রাঃ)')).toBe('');
  expect(honorific('আয়িশা (রা.)')).toBe('');
  expect(honorific('আবূ বকর (রা)')).toBe('');
  expect(honorific('আয়িশা (রাঃ) ')).toBe('');
  expect(honorific('')).toBe('');
});

describe('on the page', () => {
  beforeEach(() => {
    clearNarratorCache();
    serveRealData();
    window.matchMedia = (query) => ({ matches: true, media: query, addEventListener() {}, removeEventListener() {} });
  });
  afterEach(async () => {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    delete window.matchMedia;
    delete global.fetch;
  });
  const show = (address) => {
    setUrl(address);
    return render(
      <SettingsProvider>
        <ToastProvider>
          <NarratorsPage />
        </ToastProvider>
      </SettingsProvider>
    );
  };
  const menu = () => screen.getByRole('navigation', { name: 'বর্ণনাকারীসূচি' });
  const rows = () => within(menu()).getAllByRole('link');
  const plain = (row) => row.querySelector('.narr-plain').textContent;

  test('a row shows the name followed by (রাঃ), and its link still goes to the plain id', async () => {
    show('/narrators');
    const link = await screen.findByRole('link', { name: /^আবূ হুরায়রা \(রাঃ\) [০-৯,]+$/ });
    const name = link.querySelector('.topics-row-name');
    expect(name.textContent).toBe('আবূ হুরায়রা (রাঃ)');
    expect(plain(link)).toBe('আবূ হুরায়রা');
    expect(link.getAttribute('href')).toBe('/narrators?name=abu-hurayrah');
  });

  test('searching the plain name finds it; typing the honorific alone does not match every row', async () => {
    show('/narrators');
    await screen.findAllByRole('link', { name: /\(রাঃ\)/ });
    fireEvent.change(screen.getByRole('textbox', { name: 'বর্ণনাকারী খুঁজুন' }), { target: { value: 'হুরায়রা' } });
    expect(rows().map(plain)).toContain('আবূ হুরায়রা');
    expect(rows().every((row) => row.textContent.includes('(রাঃ)'))).toBe(true);
  });

  test('the name sorts and the letter blocks are those of the plain names', async () => {
    show('/narrators?sort=name-asc');
    await screen.findAllByRole('link', { name: /\(রাঃ\)/ });
    const blocks = groupTopics(NAMES, 'asc');
    const wanted = blocks.flatMap((block) => block.names).slice(0, 5);
    expect(rows().slice(0, 5).map(plain)).toEqual(wanted);
    const shown = within(menu()).getAllByRole('heading', { level: 3 }).map((h) => h.textContent);
    expect(shown).toEqual(blocks.map((block) => block.letter));
  });

  test('the chosen narrator heading shows the name with (রাঃ) once, the page title stays plain', async () => {
    show('/narrators?name=abu-hurayrah');
    const heading = await screen.findByRole('heading', { level: 2, name: /আবূ হুরায়রা/ });
    expect(heading.textContent.match(/\(রাঃ\)/g)).toHaveLength(1);
    expect(heading.textContent).toMatch(/^আবূ হুরায়রা \(রাঃ\) /);
    expect(document.title).not.toMatch(/রাঃ/);
  });

  test('the row keeps the name in a part that can shrink, and the honorific in a part that cannot', async () => {
    show('/narrators');
    const link = await screen.findByRole('link', { name: /^আবূ হুরায়রা \(রাঃ\) [০-৯,]+$/ });
    expect(link.querySelector('.narr-hon').textContent.trim()).toBe('(রাঃ)');
    const css = readFileSync(path.resolve(process.cwd(), 'src/styles/topics.css'), 'utf8');
    expect(css).toMatch(/\.narr-plain\{[^}]*min-width:0[^}]*text-overflow:ellipsis/);
    expect(css).toMatch(/\.narr-hon\{[^}]*flex:none/);
    expect(css).toMatch(/\.topics-row\{[^}]*height:36px/);
  });
});
