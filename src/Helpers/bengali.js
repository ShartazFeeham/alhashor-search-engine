const JOINERS = /[‌‍]/g;

// One spelling for text the data writes in several ways. NFC gives য়, ড়, ঢ় as letter + nukta
// and ো, ৌ as a single character, whichever way they were typed. The invisible joiner
// characters (ZWNJ, ZWJ) are dropped because writers add them inconsistently.
export function normalizeBengali(text) {
    return text.normalize("NFC").replace(JOINERS, "");
}
