import { splitHadis } from './hadisText';

// The core of a hadis for আজকের হাদীস: the saying itself, without the hadis number, the chain of
// narrators (up to and including its "... থেকে বর্ণিত" sentence, found by splitHadis) and a bare
// "তিনি বলেন," lead-in, which would leave the text starting oddly because "তিনি" points back to
// the chain. A sentence that names the speaker ("রাসূলুল্লাহ (সাঃ) বলেছেন, ...") carries meaning and
// stays. The full text with its chain is still on the hadis page.

// Under this many characters the core is too small to stand alone (a one-word answer), so the whole
// text is shown instead.
export const MIN_CORE_LENGTH = 8;

const BARE_LEAD_IN = /^তিনি\s+(?:বলেন|বলেছেন|বলতেন)\s*(?:,|:|ঃ)?\s*/;

// { core, hadChain, fellBack }. `core` is never empty unless the text is.
export function stripChain(text) {
  const { chain, body } = splitHadis(text ?? '');
  const lead = BARE_LEAD_IN.exec(body);
  const trimmed = lead && body.length > lead[0].length ? body.slice(lead[0].length).trim() : body;
  if (trimmed.length >= MIN_CORE_LENGTH) return { core: trimmed, hadChain: Boolean(chain), fellBack: false };
  // too little left: keep everything (after the number) rather than a stub
  const whole = [chain, body].filter(Boolean).join(' ').trim();
  return { core: whole || trimmed, hadChain: Boolean(chain), fellBack: whole.length > trimmed.length };
}
