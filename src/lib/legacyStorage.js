// The site's saved values used to live under keys with its old name. A visitor who saved reading
// settings, plan progress or a compare list then must not lose them, so a value is read from the
// current key, and when that key is absent from the old one, which is then copied to the current key.
// The old key is left in place (harmless, and an older cached page can still read it).
// Throws when the storage itself is blocked, like getItem does: callers already handle that.
export function readWithLegacy(storage, key, legacyKey) {
  const current = storage.getItem(key);
  if (current !== null) return current;
  const legacy = storage.getItem(legacyKey);
  if (legacy === null) return null;
  try {
    storage.setItem(key, legacy);
  } catch {
    // Storage can be full or read-only; the old value is still returned for this visit.
  }
  return legacy;
}
