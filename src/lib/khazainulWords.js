// Letters and their marks only, lower case, NFC; Arabic vowel signs are dropped so a plain spelling matches.
// Shared by scripts/build-khazainul-index.mjs (index) and src/app/khazainul (query), so they cannot disagree.
export const words = (text) => text.toLowerCase().normalize('NFC').replace(/[ً-ٰٟ]/g, '').match(/[\p{L}\p{M}]+/gu) ?? [];
