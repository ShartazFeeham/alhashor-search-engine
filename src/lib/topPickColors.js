// The colour of each set's list tile, from one map. The names are tokens in styles/tokens.css
// (--pick-NAME-bg for the tile, --pick-NAME-fg for the icon). Sets 1 to 4 (about the Prophet and
// his family) get the soft loving colours; every other set, and the three older plans, a calmer one.
export const LOVING_COLORS = ['rose', 'green', 'teal', 'magenta'];
export const CALM_COLORS = ['amber', 'orange', 'grey', 'slate', 'sand', 'brown', 'yellow'];

// By set number for the twelve sets, by id for the older plans.
export const PICK_COLORS = {
  1: 'rose',
  2: 'green',
  3: 'teal',
  4: 'magenta',
  5: 'amber',
  6: 'slate',
  7: 'orange',
  8: 'grey',
  9: 'sand',
  10: 'brown',
  11: 'yellow',
  12: 'slate',
  'ramadan-30': 'amber',
  'short-40': 'grey',
  'character-7': 'orange',
};

export const colorOf = (set) => PICK_COLORS[set.number] ?? PICK_COLORS[set.id] ?? 'grey';
