# Advisor 3: Bengali linguistics and search-UX view

Question: should the index gain a subsequence mapping (A/D), or fold equivalent letters and strip endings (B), or edit-distance-1 suggestions (C), or nothing (E)?

## Verdict

**Subsequence does not earn its place, either as a silent expansion (A) or as a last-resort did-you-mean (D).**
Do B, in two tiers, and add a small global "consonant skeleton" word list as the suggestion source. That list is the TODO item 5 word list, built on a better key than subsequence.

Ranked:

1. **B-silent.** A fold map for spelling variants the corpus itself writes both ways, plus lookup-time ending strip, vocabulary-verified.
2. **B-suggest.** A global consonant-skeleton map (about 400 KB raw, 75 KB gzipped) feeding "did you mean" and Roman-typing recovery. It fixes the first-two-letters problem because it is not sharded by prefix.
3. **C.** Keep the existing confusion table, `closeWords` and synonyms as the last fallback. No new work.
4. **E** for subsequence. Reject A and D.

All numbers below were computed from `public/json/tags` and `public/json/substring`. Scripts and raw outputs are in `scratchpad/decision/a3/` (`s1` to `s15`, `.mjs` and `.out`).

### Method and caveats

- Vocabulary: 80,587 raw tag keys become 77,393 after NFC and ZWJ/ZWNJ removal. Of these, 63,573 are pure-Bengali-block words, 12,946 are Arabic, and 766 are Bengali glued to something else.
- Hadis count per word is the frequency proxy. 27,734 Bengali words (44%) occur in only one hadis.
- The error model (section 1) is synthetic: uniform random positions on 4,000 sampled words. There are no query logs, so it ranks methods rather than predicting absolute rates.
- The 60 Roman test words and their "intended" Bengali spellings are my own annotations.
- The skeleton method was tuned on the same 38 Roman failures, so its recall there is optimistic.
- The "false inflection" rates come from reading 24 random pairs per band by eye.
- Aksara segmentation is a regex approximation.

## 0. Findings that change the framing

**a) The corpus spells the same word several ways, and the spelling follows the translator, which means the book.** Searching one spelling silently drops whole books.

| Pair | Hadis with first | Hadis with second | Hadis with both | Union |
|---|---|---|---|---|
| রাসূলুল্লাহ / রাসুলুল্লাহ | 9,290 | 7,550 | 90 | 16,750 |
| দোয়া / দুআ | 239 | 229 | 2 | 466 |
| সাওয়াব / সওয়াব | 170 | 212 | 5 | 377 |
| হাদীস / হাদিস | 1,588 | 197 | 29 | 1,756 |
| আবূ / আবু | 13,186 | 1,488 | 235 | 14,439 |

- রাসুলুল্লাহ is Muslim's convention: 4,627 of its 7,550 hadis are in book MUS. The other spelling is the Majah/Dawud/Bukhari convention.
- Typing either spelling of রাসূলুল্লাহ today returns about half the true family.
- The current did-you-mean only fires when results are fewer than 3. For দোয়া, which has 239 results, no suggestion is ever shown, so 227 hadis are silently invisible.
- Some pairs are not a problem. নামায / নামাজ share 1,886 of 2,923 hadis, so folding adds 2.

**b) A subsequence map is keyed by vocabulary words.**
- The current `substring/` files hold 22,418 keys. All 22,418 are vocabulary words, and every value is a longer vocabulary word containing the key.
- A precomputed subsequence map has the same shape. A typo that is not a vocabulary word is not a key, so it gets nothing.
- Rescuing a typo would need a live scan against a prefix-sharded file. That scan inherits the first-two-letters problem.

**c) Avro Roman typing rarely lands on the corpus spelling.**
- Avro treats "o" as inherent and never emits ো or া unless the user types O or aa.
- Avro inserts hasanta between consonants (মুস্লিম, তির্মিযি, কুর্বানি, মাঘ্রিব), where the corpus has none.
- Of 60 Roman words I tested, 22 produced a spelling that is the intended word. The other 38 did not.

## 1. Which mistakes are realistic, and what subsequence can and cannot find

Each row was measured on up to 4,000 sampled words. The typed key was required not to be a vocabulary word itself, and the mutation positions are random.

How to read the columns:
- **Subseq** is the proposed tiered list. It uses the stated weights and tiers (substring all, ≤1 gap top 20, ≤2 gaps top 10, score ≥0.4), bucketed by the typed key's first two characters, as the files are.
- **Edit-1** is `withinOneEdit` against the same bucket.
- **Conf table** is `confusionVariants` with up to 2 swaps.
- **Fold-safe** is the silent fold set of section 5, which is global (not prefix-bucketed) and so can reach into the first two letters.
- Values are the share of cases where the target word is recovered.

| Mistake | Realistic? | Typed key in a different data file than the target | Subseq | Edit-1 | Conf table | Fold-safe |
|---|---|---|---|---|---|---|
| ি/ী ু/ূ ই/ঈ উ/ঊ | very (and the corpus mixes both) | 41% | 0% | 59% | 100% | 100% |
| শ/ষ/স | very | 51% | 0% | 49% | 100% | 0% (by design, suggest tier) |
| ন/ণ | very | 24% | 0% | 76% | 100% | 100% |
| জ/য | very (Arabic z) | 36% | 0% | 64% | 100% | 0% (by design) |
| য়/য (dot dropped) | very | 8% | 63% | 92% | 100% | 100% |
| hasanta dropped (ক্ষ to কষ) | common | 16% | 84% | 84% | 0% | 94% |
| hasanta inserted (Avro) | common for Roman | 32% | 0% | 68% | 0% | 99% |
| aspirate ক/খ গ/ঘ চ/ছ ত/থ দ/ধ প/ফ ব/ভ | common among newer writers | 43% | 0% | 57% | 0% | 0% (unsafe) |
| ত/ট, দ/ড | moderate | 24% | 0% | 76% | 100% | 0% (unsafe) |
| ো/ু, ো/ও, ও/উ | very (কোরআন/কুরআন) | 30% | 0% | 70% | 32% | 0% (unsafe) |
| ঙ/ং | common | 57% | 0% | 39% | 0% | 100% |
| ত/ৎ, ঁ dropped | common | 33% | 44% | 67% | 0% | 100% |
| vowel sign া dropped | common (রাসূল to রসূল) | 31% | 69% | 69% | 0% | 0% (unsafe) |
| one letter deleted | typo | 15% | 85% | 85% | 0% | 0% |
| one letter inserted | typo | 20% | 0% | 80% | 0% | 0% |
| two letters swapped | typo | 52% | 0% | 48% | 0% | 0% |

What this shows:

- **Subsequence only finds omissions** (a deleted letter, vowel sign, hasanta or nukta): 84% to 85% for deletions, 44% to 69% for the marks.
- Edit-1 gets the same recall on deletions with half the candidates: an average list of 3.8 against 8 for subsequence. It also reaches insertions, transpositions and substitutions.
- It scores 0% on every substitution class, which is where Bengali spelling confusion actually lives: matra length, sibilants, ন/ণ, জ/য, aspirates, ত/ট and ো/ু.
- It scores 0% on insertions, transpositions and Avro's hasanta insertion.
- **The first-two-letters problem is large.** Between 15% and 57% of errors fall in the first two code points. For those, the target is in a different data file, so every prefix-bound method (subsequence, edit-1, the confusion table over loaded files) cannot reach it. A global fold or skeleton key can.
- Hasanta/conjunct handling: `ক্ষ ⇄ খ` (Roman "khoma" becomes খমা) and `ক্ব ⇄ ক` are handled by the fold and not by subsequence. They are rare in the data: ক্ষ→খ merges only 24 words, none above 30 hadis.

Things subsequence structurally cannot find, whatever the weights:
- Lexical synonyms such as নামায / সালাত / ছালাত, রোযা / সিয়াম, ওযু / উযূ / অজু. These are different letters, not a subset. They belong in `searchSynonyms.js`.
- Anything in the first-two-letter file boundary.
- Inflection in the typed-longer direction (section 2).

### Roman typing (60 test words, 38 where Avro's output is not the intended spelling)

| Method | Recovered (of 38) |
|---|---|
| Subsequence (tiered) | **1** (সাওাব→সাওয়াব) |
| Existing confusion table | 1 |
| Edit-1 in-prefix | 10 |
| Fold-safe (silent set) | 6 |
| Fold-safe plus edit-1 | 16 |
| Fold-wide plus edit-1 | 19 |
| **Consonant skeleton, found in group** | **26** |
| Consonant skeleton, in top 3 by frequency | 22 |

- 21 of the 38 differ from the intended word within the first two code points (রযা for রোযা, দআ for দোয়া, গসল for গোসল, তবা for তাওবা, ওুদু for ওযু). They reach the wrong data file, so prefix-bound methods cannot work.
- Consonant skeleton here means: fold the confusable letters, then drop vowels, vowel signs, hasanta and nukta, so only the consonant skeleton remains.
- Examples: রযা→{রোযা, রোজা}, গসল→গোসল, জাকাত→যাকাত, শায়্তান→শয়তান, মুস্লিম→মুসলিম, কাবর→কবর.
- The skeleton keys 4,662 groups when limited to words with ≥2 hadis. The map stored with top 5 words per group is 399 KB raw and 75 KB gzipped.
- Skeleton groups are larger than fold groups (mean 2.05 words per key over all words, 8,550 groups of size ≥2). So suggestions must be ranked by hadis count, shown as at most 3 chips, and each chip's count verified.

## 2. Inflection

### The 25 most common word-final endings

Counted as pairs where the vocabulary contains both the word and the word minus the ending, stem ≥2 code points. The "Raw ending" column is all vocabulary words ending that way.

| # | Ending | Pairs | Raw ending | Kind | Example |
|---|---|---|---|---|---|
| 1 | র | 4,204 | 10,714 | genitive | আল্লাহ→আল্লাহর |
| 2 | ের | 3,412 | 5,361 | genitive | হাদীস→হাদীসের, সালাত→সালাতের |
| 3 | ে | 2,550 | 8,644 | locative or verb | সালাত→সালাতে |
| 4 | কে | 2,153 | 2,610 | objective | তা→তাকে |
| 5 | ও | 1,979 | 2,192 | "also" | আমি→আমিও |
| 6 | ই | 1,625 | 1,896 | emphatic | সে→সেই |
| 7 | া | 1,166 | 5,352 | mixed, ambiguous | তার→তারা |
| 8 | ন | 856 | 3,311 | verb honorific | করে→করেন |
| 9 | দের | 731 | 1,122 | plural genitive | লোক→লোকদের |
| 10 | ী | 708 | 2,904 | mostly names and noise | আল→আলী |
| 11 | তে | 691 | 1,198 | locative or infinitive | তা→তাতে |
| 12 | য় | 687 | 1,398 | locative | বর্ণনা→বর্ণনায় |
| 13 | টি | 579 | 712 | classifier | এক→একটি |
| 14 | ি | 550 | 2,603 | noise | তিন→**তিনি** |
| 15 | ঃ | 533 | 583 | visarga glued by the source | বলেন→বলেনঃ |
| 16 | ার | 501 | 2,255 | genitive | করা→করার |
| 17 | কারী | 445 | 520 | agent derivation | বর্ণনা→বর্ণনাকারী |
| 18 | রা | 428 | 846 | plural | তা→তারা |
| 19 | েন | 425 | 878 | verb honorific | ছিল→ছিলেন |
| 20 | ো | 421 | 962 | verb or derivation | হল→হলো |
| 21 | ল | 402 | 1,598 | verb past | কর→করল |
| 22 | েই | 342 | 611 | emphatic | কাজ→কাজেই |
| 23 | ্ | 341 | 479 | hasanta artifact | আল্লাহ→আল্লাহ্ |
| 24 | ত | 335 | 2,741 | verb or noise | কর→করত |
| 25 | হ | 308 | 1,178 | Arabic ta-marbuta variant | আয়িশা→আয়িশাহ |

Next in line: েও 305, তা 289, গুলো 248, ভাবে 228, গণ 221, দেরকে 194, রূপে 174, টির 164, সমূহ 162, কেও 158. The listing also surfaced Bengali digits (৬ ১ ০ and so on, about 720 each) as vocabulary "stems"; ignore them.

Rows 1 to 6, 9, 11 to 13, 15, 16, 18, 22, 23 and the plural and classifier tail are true noun and clitic inflection. Rows 7, 10, 14, 17, 19 to 21 and 24 are verb conjugation, derivation, names or coincidence, and need a lexicon to separate.

### One stem with many endings (verified in the vocabulary, count in brackets)

- **সালাত** (4,175): ে 727, ের 1,056, কে 49, ই 23, ও 19, েই 12, েও 7, সমূহ 4, েরই 2, েরও, কেও, সমূহের, র 3
- **আয়াত** (1,064): টি 323, ের 152, ে 78, ঃ 35, গুলো 34, সমূহ 14, খানা 11, টির 7
- **স্থান** (543): ে 1,112, ের 132, টি 50, েই 31, কে 24, সমূহ 12, েও 8, গুলো 5
- **সন্তান** (564): ের 189, দের 123, কে 91, ও 22, টি 16, দেরকে 15, রা 14, েরা 11, গণ 9

### How many vocabulary words are inflected variants of another vocabulary word

Of 63,573 Bengali words (vocabulary-verified stem):

| Ending set | Stem ≥3 | Stem ≥4 | Stem ≥5 |
|---|---|---|---|
| Noun and clitic endings only | **18,862 (29.7%)** | 16,891 (26.6%) | 13,481 (21.2%) |
| Plus verb endings | 22,938 (36.1%) | 19,914 (31.3%) | not computed |

- The noun-ending set is 34 endings. It is the "proposed endings" list in section 5, longest match first.
- With noun endings and stem ≥3 there are 11,790 distinct stems, and 23.4% of all (word, hadis) occurrences are in inflected words.

### Does folding endings at lookup time cover it?

**Substring covers the stem-to-inflected direction and not the reverse.**

- Of 22,250 (inflected, stem) pairs, the substring index already links stem to inflected in 22,143 (99.5%).
- It links inflected to stem in **0** of 22,250. Typing the inflected form returns only words containing that exact string.
- True-family gap: for 3,000 pairs (stem ≥4, both ≥5 hadis), compare the hadis returned today for the typed inflected word with the hadis of the true family (stem plus its attested inflected forms). The family has a median of 5.4 times more, a 75th percentile of 17 times, at least 2 times more for 81% of pairs, and at least 5 times more for 52%. By ending: কে, ও, ই, টি, গণ and ঃ are 98% to 100% at least 2 times more, ের is 92%, and র is 74%.
- Typed stem today (substring) against the true family: median 1.03 times, 75th percentile 1.17 times, 90th percentile 1.75 times. Substring over-expands (পায়→পায়খানা, তিন→তিনি, কার→কারণ for short stems), but it is mostly right in the stem direction.

**Subsequence does not help with inflection.** Typed সালাতের is not a subsequence of সালাত. Subsequence maps a short key to longer words, which is the direction substring already covers.

**Lookup-time stripping is nearly free in fetch cost.** The stem, when ≥3 code points, shares the first two characters with the inflected word, so it lives in the same `tags/<xx>.json` already fetched. No new fetch is needed.

**Stem length is the over-stripping safeguard.** On 24 random vocabulary-verified pairs per stem length (both words with ≥20 hadis), judged by eye:

- Stem 3: about 5 of 24 are false (মিন→মিনার, বিন→বিনতে, কাত→কাতার, মার→মারার, দিত→দিতে).
- Stem 4: 1 of 24 (পায়→পায়খানা).
- Stem 5: 0 of 24.

So require stem ≥4 code points, or ≥3 with ≥50 hadis. Drop খানা from the list. Leave ি, ী, া, ন, ল, ত, হ, ম, ব out: they produce তিন→তিনি, আল→আলী, মা→মাল.

## 3. Code-point subsequence against aksara units

I took 150 vocabulary keys of 3 to 5 code points with ≥30 hadis, and listed every non-substring match with first-letter anchor and ≤2 gaps (1,298 matches).

Average matches per key by key length (code points):

| Key length | Avg substring | Avg subsequence, any gaps | Avg subsequence, anchored ≤2 gaps |
|---|---|---|---|
| 3 | 19.5 | 120.4 | 26.4 |
| 4 | 11.2 | 35.4 | 8.4 |
| 5 | 6.1 | 6.9 | 2.2 |

- 657 of 1,298 (**50.6%**) break an aksara. The breakdown: a vowel sign matched without its consonant 494, the first half of a conjunct matched alone 172, the second half 132, a hasanta matched alone 11.
- Aksara-level matching (compare syllable clusters, key cluster must equal the word's cluster or be a prefix of it) rejects 631 of those 657 (96%). It also wrongly rejects 19 of 641 clean matches.
- Of the 1,298, **622 remain aksara-clean yet mostly meaningless.** Examples that survive: বাহন~বাহিনী, পরম~পরামর্শ, মাস~মানসুর, হয়ে~হায়েযের, আশা~আয়শা, ভয়ে~ভাইয়ের, মুসা~মুরসাল, খুব~খুৎবা, ইশা~ইরশাদ.
- Only some survivors are real variants: বলেন~বললেন, করনি~করেননি, সালমা~সালামা, কথায়~কোথায়.

Ten real code-point matches that are linguistically meaningless (with a gloss):

1. মাস "month" ~ মীরাস "inheritance". The match takes the vowel sign া from রা without its consonant.
2. নিল "took" ~ নাযিলকৃত "revealed". The match takes ি from যি.
3. মুখে "in the mouth" ~ মুখাপেক্ষী "dependent". The match takes ে from পে.
4. পরম "supreme" ~ প্রথম "first". The match takes the র of the conjunct প্র alone.
5. আগত "arrived" ~ আগন্তুক "stranger". The ত is taken from inside the conjunct ন্তু.
6. আগত ~ আনুগত্য "obedience". The ত is taken from inside ত্য.
7. একমত "agreed" ~ একমাত্র "only". The ত is taken from inside ত্র.
8. বদর "Badr" ~ বিদীর্ণ "torn". The র is taken from inside র্ণ.
9. স্বাদ "taste" ~ সত্যবাদী "truthful". The match takes a hasanta alone.
10. মাস ~ মুহাম্মাদসাল্লাল্লাহু. ম, া, স are scattered over three morphemes of a name plus benediction.

Aksara-level matching fixes the splitting of syllables and kills about half of the garbage. It does not make the match semantically meaningful. Gap matching in Bengali has no morpheme boundary to anchor on.

Silent subsequence expansion of real, common words (typed key a vocabulary word; anchored, ≤2 gaps, score ≥0.4):

- Mostly empty for long keys: সালাত→3 words (সালামাত, সামলাতে, সাল্লাত), নামায→2, যাকাত 0, হজ্জ 0, গোসল 0, জান্নাত 0.
- Harmful for short keys:
  - কবর "grave" → কবীরা "major sin" (42 hadis), কবুতরের "of the pigeon"
  - সবর "patience" → সবার "of everyone" (72), সবের
  - সুদ "usury" → সুন্দর "beautiful" (152 hadis), সুন্দরী, সুন্দরভাবে

The short keys are the ones where a mapping would be most used. 2-letter keys average 912 matches by the stated sample, which would be capped to a handful of noise.

## 4. UX: what the visitor should see

Principles:
- Spelling variants the corpus itself writes both ways are the same query. Expand them silently, but never hide that.
- Typo and Roman rescues are visible suggestions.
- Never show more than three.

| Case | Treatment |
|---|---|
| Typed word has results. Fold or ending-family adds other spellings of the same word (রাসূল/রাসুল, নামায/নামাজ, দোয়া/দুআ, সালাত/সালাতের). | **Silent expansion.** Rank the typed spelling's hadis first (the existing `exact` ranking). Highlight variant words in snippets, so the user sees why (`matchPattern.js` must learn the fold). Add one muted line under the box, "Including spellings: নামাজ, নামায", only when a variant holds ≥30 hadis or adds ≥10% to the result. |
| Typed word has 0 hits (or ≪ the best candidate), and exactly one candidate returns ≥3 times the next. | **"Results for X, also showing Y"**, Google style, with "Search only for <typed>" link. Candidates: fold, confusion table, skeleton, edit-1, in that order. |
| Typed word has few hits (under 3), or several plausible candidates. | **"Did you mean"** chips with hadis counts, at most 3 (the current `MAX_SUGGESTIONS`). The count on the chip is the main trust cue. |
| Roman typing | Show the Bengali conversion as the searched query, with the skeleton candidates as chips (at most 3). If the Avro output has 0 hits, use the rule for 0 hits above. |
| Multi-word query with some word having no match | TODO item 1 (show hadis matching most words, mark missing words). Run did-you-mean for the missing word first, before marking it missing, so a typo is not mistaken for an absent word. |

- Three suggestions is the ceiling. A fourth is almost always noise from the skeleton or edit-1 sets. If more are wanted, put them behind "more spellings", not in the first row.
- Subsequence matches should never be shown silently. They should not be shown as chips either, since edit-1 and the skeleton cover what they find with less noise.

## 5. Concrete folding table and endings list

### Silent tier: fold into the lookup key (and into a small fold map)

Apply only to words of ≥4 code points. Words of 3 or fewer code points match exactly only. This one rule removes দিন/দীন (3,246 vs 75), কোন/কোণ (6,898 vs 11), আসা/আশা, মাস/মাশ, যা/জা, যান/জান, আয/আজ.

Apply in this order (the hasanta removal must come after every rule that mentions a hasanta):

| # | Rule | Vocabulary keys removed by this rule alone | Groups where 2nd-most-used spelling has ≥30 hadis | Examples |
|---|---|---|---|---|
| 1 | ী→ি, ূ→ু, ঈ→ই, ঊ→উ | 2,515 | 82 | রাসূল/রাসুল, আবূ/আবু, কি/কী, বেশী/বেশি, হাদীস/হাদিস |
| 2 | ণ→ন | 699 | 32 | বর্ণিত/বর্নিত, গ্রহণ/গ্রহন, কারণ/কারন |
| 3 | য়→য (dot dropped) | 240 | 1 | রোয়া/রোযা, আয়াত/আযাত |
| 4 | ঙ্ and ঙ→ং | 153 | 6 | সঙ্গে/সংগে, আশঙ্কা/আশংকা, রঙ/রং |
| 5 | ৎ→ত | 54 | 3 | সাক্ষাৎ/সাক্ষাত, খুৎবা/খুতবা |
| 6 | strip hasanta | 1,322 | 29 | আল্লাহ্/আল্লাহ, আব্দুল্লাহ/আবদুল্লাহ, ইব্রাহীম/ইবরাহীম |
| 7 | strip ঁ | 559 | 23 | তাঁর/তার, পৌঁছে/পৌছে, চাঁদর/চাদর |
| 8 | strip trailing ঃ, ্ and glued –, —, … | 874 | 56 | বলেনঃ/বলেন, আল্লাহ্/আল্লাহ |

Also fix in the build: 105 vocabulary words are Bengali glued to a dash or ellipsis (ওয়াসাল্লাম–এর, কর…পর্যন্ত) and 766 are Bengali glued to Arabic (সালাতেسَبِّحِ). Splitting at those boundaries would fix some of the dead keys.

The combined silent set with the ≥4 rule: 63,573 keys become 57,960 (-5,613, 8.8%), 4,747 groups, 10,360 words in groups. 176 groups have a second spelling with ≥30 hadis.

By eye those 176 are overwhelmingly one word spelled two ways. The genuinely distinct pairs are few, about 5 of 176 (3%):
- বাধা "obstacle" / বাঁধা "tied" (228 / 116)
- পূর্ণ "full" / পূরণ "fulfil" (628 / 99), via ণ plus hasanta
- আসতে "to come" / আস্তে "slowly" (233 / 32), via hasanta
- বেধে / বেঁধে (30 / 215)
- দাড়ি / দাঁড়ি (43 / 36)

Mitigation: exact spelling ranks first, and these are low-frequency.

Cost: a single non-sharded fold map of groups ≥2 is 374 KB raw JSON (5,198 groups, 11,353 words, without the ≥4 rule). It adds one request, and is needed because a fold can change the first two letters and therefore the file.

### Suggest tier only (offered as chips, never silent)

| Rule | Why not silent | Evidence |
|---|---|---|
| শ/ষ/স | distinct words | আসা 245/আশা 229, সোনা/শোনা, বিশ 94/বিষ 31, মাস/মাশ (4 groups ≥100 even for this one rule) |
| জ/য (not য়) | distinct words, and merges with য় via transitivity | নিয়ে 2,849/নিজে 260, **হাজ্জ "Hajj" / হায়য "menstruation"**, হাজ্জের/হায়যের, যা/জা, আয/আজ |
| ো→ু, ও→উ | collisions in short roots | যুগ/যোগ, উপর/ওপর (variant, fine) |
| ক্ষ→খ and ক্ব→ক | tiny (24 and 352 merges) | only matters for Roman "khoma"; handled by skeleton |

### Never fold

| Rule | Evidence |
|---|---|
| ছ→স | আছে 2,601 / আসে 626. Arabic ছালাত/সালাত belongs in `searchSynonyms.js`. |
| Aspirates (খ→ক, থ→ত, ধ→দ, ভ→ব...) | তাকে 5,350 / থাকে 1,669, মাথা/মাতা, খবর/কবর |
| ড়→র | পরে 2,033 / পড়ে 921 |
| ট→ত, ড→দ | দান 1,494 / ডান 499 |
| Dropping া | 4,436 words merge, 71 groups ≥100: আমার/আমরা/আমর, তার/তারা, তোমার/তোমরা |

### Endings to strip at lookup time (longest first, stem ≥4 code points, stem must be a vocabulary word)

- Genitive, locative, objective: ের, ে, কে, র, ার, ায়, য়, তে.
- Particles: ও, ই, েও, েই, েরও, েরই, কেও.
- Plural and number: দের, দেরকে, দেরকেও, রা, েরা, গণ, গুলো, গুলোর, গুলোকে, গুলোতে, সমূহ, সমূহের.
- Classifier: টি, টির, টিকে, টা.
- Source artifacts: ঃ, ্.

Pairs found with stem ≥3 (the stem ≥4 rule is a subset): র 4,130, ের 3,350, ে 2,470, কে 2,095, ও 1,934, ই 1,561, দের 713, য় 661, তে 648, টি 539, ার 453, ঃ 444, রা 393, েই 317, ্ 317, েও 281, গুলো 230, গণ 220, ায় 190, দেরকে 189, সমূহ 154, টির 153, কেও 147, টা 129, সমূহের 94, টিকে 86, গুলোর 72, েরও 62, েরই 56, েরা 49, গুলোকে 40, দেরকেও 20, গুলোতে 15.

Left out on purpose: খানা (পায়খানা), কারী, ভাবে, রূপে (derivational, still reachable by substring), and every verb ending (েন, েছে, লেন, লাম, ত, ল, ব...). Verb morphology (করে, করেন, করেছেন, করলেন) needs a lexicon, and substring already links the stem করে to its longer forms.

Over-folding risk is small under the rules above: stem ≥4 puts false inflections at about 1 in 24 (পায়→পায়খানা), against about 5 in 24 at stem 3.

## 6. Does subsequence earn its place?

No.

- **Recall.** It recovers only omissions (84% to 85% for deleted letters, 44% to 69% for deleted marks), the one case edit-1 already covers equally with half the candidates. It recovers 0% of every substitution class, which is where Bengali spelling confusion lives, and 0% of insertions, transpositions and Avro's hasanta insertion.
- **Roman typing.** On 38 Avro outputs that missed, subsequence recovers 1. The skeleton recovers 26.
- **Noise.** Half of its anchored matches break an aksara. Aksara-level matching removes those, but 622 clean matches remain, mostly unrelated words. Short keys give সুদ→সুন্দর, কবর→কবীরা, সবর→সবার.
- **Structure.** A precomputed map is keyed by vocabulary words, so it cannot serve a typo. A live scan is bound to the typed key's prefix file, so it cannot serve the 15% to 57% of errors that fall in the first two letters.
- **Inflection.** It does not touch it. It maps short to long, the direction substring already covers (99.5% of pairs). The gap is the reverse (0 of 22,250 pairs linked), where subsequence cannot help.
- **Cost.** 46 matches per key on average, 912 for 2-letter keys, all needing caps and a scoring function that has to be tuned.

If the weighted subsequence were built anyway, the only defensible slot is D, last-resort did-you-mean, capped at 3 chips, after fold, skeleton and edit-1 return nothing. At that point it would add a result for a typed key that is not in the first-two-letter file of its target only if the omission is inside the key. I measured no case where it adds a result the skeleton plus edit-1 does not.
