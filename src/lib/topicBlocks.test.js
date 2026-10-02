import { TOPICS } from './topics';
import { LETTER_ORDER, firstLetter, groupTopics } from './topicBlocks';

const letters = (blocks) => blocks.map((block) => block.letter);

describe('firstLetter', () => {
  test('is the first Bangla letter of the normalised name, spaces ignored', () => {
    expect(firstLetter('কবর')).toBe('ক');
    expect(firstLetter('  খুতবা ')).toBe('খ');
    expect(firstLetter('ঈমান')).toBe('ঈ');
  });
});

describe('groupTopics with the real topic names', () => {
  const blocks = groupTopics(TOPICS);

  test('holds every topic exactly once', () => {
    expect(blocks.flatMap((block) => block.names).sort()).toEqual([...TOPICS].sort());
  });

  test('puts a name starting with ক under ক, and ক before খ', () => {
    const ka = blocks.find((block) => block.letter === 'ক');
    expect(ka.names).toContain('কবর');
    expect(ka.names.every((name) => firstLetter(name) === 'ক')).toBe(true);
    expect(letters(blocks).indexOf('ক')).toBeLessThan(letters(blocks).indexOf('খ'));
  });

  test('vowels come before consonants, in the alphabet order', () => {
    const shown = letters(blocks);
    expect(shown.indexOf('অ')).toBeLessThan(shown.indexOf('আ'));
    expect(shown.indexOf('ঈ')).toBeLessThan(shown.indexOf('উ'));
    expect(shown.indexOf('ও')).toBeLessThan(shown.indexOf('ক'));
    const positions = shown.map((letter) => LETTER_ORDER.indexOf(letter));
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
  });

  test('shows no empty letter', () => {
    expect(blocks.every((block) => block.names.length > 0)).toBe(true);
    expect(letters(blocks)).not.toContain('ঘ'.repeat(2));
  });

  test('descending reverses the blocks and the names inside them', () => {
    const down = groupTopics(TOPICS, 'desc');
    expect(letters(down)).toEqual(letters(blocks).reverse());
    const up = groupTopics(TOPICS);
    expect(down.find((block) => block.letter === 'ক').names).toEqual([...up.find((block) => block.letter === 'ক').names].reverse());
  });

  test('anything that is not a Bangla letter goes last', () => {
    const mixed = groupTopics(['zeta', 'কবর', 'অহংকার']);
    expect(letters(mixed)).toEqual(['অ', 'ক', 'z']);
  });
});
