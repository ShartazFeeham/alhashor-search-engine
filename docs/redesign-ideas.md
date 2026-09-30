# Redesign Ideas

Ideas for a redesign with more features and a better look, collected from five independent advisors. Each advisor was told only what content and data exist (not the current design or features) and looked at it from a different angle: everyday reader, student and scholar, phones and accessibility, visual design, and sharing and growth. Their 50 ideas were merged into 32 unique ones, and 8 of those were rejected, leaving the 24 below.

## How to read the table

"Front end only" means code running in the browser plus the static files, with no server and no outside service.

| Mark | Meaning |
|---|---|
| ✅ Easy | Straightforward in the browser with the data you already have |
| ⚠️ Hard | Possible in the browser, but complex, heavy or slow, or it works best with data prepared once by a script |
| ❌ Impossible | Can't be done in the front end alone: it needs a server, an outside service, or work done before the site is built |

The `#` column keeps the numbers from the original list of 32, so a gap means that idea was rejected.

## The 24 ideas

| # | Idea | Brief description | Front end only | Reality check | Needs beyond front end |
|---|---|---|---|---|---|
| 1 | Reading comfort | Font size and spacing, light/dark/sepia, Bengali font, Bengali/English digits | ✅ Easy | Styling plus a saved setting | Nothing |
| 2 | Narrator chain collapsed | Saying shown first, chain of names folded | ✅ Easy | Pattern match with a "show full text" fallback; the chain is found in about 86% of texts | Nothing |
| 3 | Long-hadis aids | Reading time and progress bar | ✅ Easy | The section outline is dropped, since texts have no paragraph breaks | Nothing |
| 5 | Book colours, bookshelf home | One colour and badge per book, six home tiles | ✅ Easy | Design work only | Nothing |
| 6 | App-style mobile navigation | Bottom tab bar, thumb-reachable controls | ✅ Easy | Layout and styling | Nothing |
| 7 | Hadis full page | Permanent link, breadcrumb, book link, previous/next, swipe | ✅ Easy | The route and the text lookup already exist | Nothing |
| 8 | Jump to number | "Go to" box, "বুখারী ১২৩৪" parsing, range grid | ✅ Easy | Book totals and missing-number lists are already in the code | Nothing |
| 9 | Related hadis | Similar hadis, including the same report in other books | ⚠️ Hard | In the browser it means fetching several index files per hadis and counting overlaps: heavy and approximate | A one-time script writing static lists is far better |
| 10 | Compare view | Two to four hadis side by side, differences highlighted | ✅ Easy | Free diff library, selection kept in the address | Nothing |
| 11 | Narrator index | Hadis grouped by narrator, with counts | ❌ Impossible | Needs a pass over all 32,886 texts (about 42 MB), which can't happen on a visitor's phone | One-time script plus hand-made name variants |
| 12 | Curated topic pages | Hand-picked "start here" lists per topic | ✅ Easy | A plain list file in the code | Your curation time |
| 13 | Collection filters and counts | Narrow results by book, with counts | ✅ Easy | Hadis tags already carry the book code | Nothing |
| 14 | Highlighted snippets | Result cards show context around the match | ✅ Easy | The texts of the shown results are already fetched | Nothing |
| 15 | Forgiving search | "Did you mean" for typos, synonyms | ⚠️ Hard | Typo hints only scan the loaded file's word list, so a typo in the first two letters fails. Synonyms need a list | Hand-made synonym list |
| 17 | Word-proximity search | "Words within N words of each other" | ⚠️ Hard | Possible only for the top few hundred results, by fetching their texts | Nothing (limited) |
| 18 | Roman-letter (Banglish) typing | Type phonetically, get Bengali | ✅ Easy | Use an open-source phonetic library. Accuracy is imperfect and its licence needs checking | Nothing |
| 19 | Search in a Web Worker | Keeps phones smooth while searching | ⚠️ Hard | The worker is moderate. "Instant as you type" needs the whole index on the device (about 31 MB raw) | Nothing |
| 22 | Daily hadis, seasonal picks | A short hadis of the day by date | ✅ Easy | Pick by date, fetch it, move to the next if too long. About 18k hadis are 60 words or shorter | Your list for seasonal picks |
| 23 | Reminders and channels *(future scope)* | Push, email, RSS, Telegram/Facebook auto-post | ❌ Impossible | Push needs a push server; email and Telegram need accounts and a scheduler | A server or outside service |
| 24 | Reading plans and khutbah sheet | "30 hadis for Ramadan", printable list with citations | ✅ Easy | A list file and a print layout; a list built in the address works as a saved list | Your curation time |
| 25 | Copy citation and share text | Reference and link, clean text | ✅ Easy | Clipboard and share sheet | Nothing |
| 26 | Quote-card image | Typeset image of a hadis for WhatsApp/Facebook | ✅ Easy | Render a styled card to an image in the browser; test Bengali fonts on Safari; long hadis share an excerpt | Nothing |
| 27 | Link previews | Rich preview when a hadis link is pasted in chat | ❌ Impossible | Chat crawlers don't run JavaScript, so each link needs server-made HTML | Netlify edge function or prerendered pages |
| 28 | SEO pages | A static page per hadis, sitemaps | ❌ Impossible | Google does run some JavaScript, but per-page titles and sitemaps need generated files | Build-time prerender step |

**Tally:** ✅ 16, ⚠️ 4, ❌ 4.

**What this means for the redesign**
- **Buildable now:** every Easy row. That covers the whole reading experience, the hadis page and its navigation, sharing, daily hadis and the visual redesign.
- **Gets easier with a one-time script:** related hadis (9) and search hints (15).
- **Won't work without a server or build step:** narrator index (11), link previews (27), SEO pages (28) and reminders (23).
- **Suggested start:** rows 7, 8, 1 and 13.

## Rejected ideas

These came up but were rejected, and are kept here so they aren't proposed again by accident.

| # | Idea |
|---|---|
| 4 | Accessibility and low-data mode |
| 16 | Search operators (exact phrase, AND, OR, NOT) |
| 20 | Bookmarks, lists, notes, history |
| 21 | Memorisation and quiz mode |
| 29 | Reader-reported corrections |
| 30 | Open data and embed widget |
| 31 | Installable app (PWA) |
| 32 | Offline packs per book |

## If the app moved from React to Next.js

**Hosting**
- **Netlify:** Next.js 13.5 and newer is fully supported (App Router, server rendering, static pages, incremental regeneration, middleware, image handling) through the OpenNext adapter, with no setup. Server-rendered pages run as Netlify functions, so on the free plan they use credits. Every page view rendered live costs compute, so pages would need caching.
- **Vercel:** Next.js's home, with the newest features first. Its limits page says CLI deployments on the free Hobby plan are capped at 15,000 source files and 100 MB. The project has about 35.7k files, so that route would likely fail. Deploying from Git may avoid it, but that wasn't confirmed. Hobby is also meant for personal, non-commercial use, which should be checked in Vercel's terms.
- **Recommendation:** stay on Netlify, where everything is already set up.

**What changes in the hard and impossible rows**

| # | Idea | Was | With Next.js | Note |
|---|---|---|---|---|
| 27 | Link previews | ❌ | ⚠️ | Per-hadis HTML with title and description is easy. Preview images with Bengali text are risky, because the image generator handles Bengali conjuncts poorly |
| 28 | SEO pages | ❌ | ✅ | Render each hadis page on demand and cache it, with a sitemap. No 33k extra files |
| 11 | Narrator index | ❌ | ⚠️ | It could be computed at build time, but the name cleanup still needs you |
| 23 | Reminders and channels | ❌ | ⚠️ | RSS and a daily Telegram post work with a scheduled function. Email and push still need an outside service and storage |
| 9, 15, 17 | Related hadis, typo hints, proximity | ⚠️ | easier | Server code can do the heavy work, so the phone doesn't have to |

**Before deciding:** moving to Next.js means reworking routing and data loading, and adds credit use on the free plan. A cheaper alternative for link previews (27) is a small Netlify edge function that adds the tags while keeping the current Vite app.

## Facts found in the data while checking these ideas

- All 32,886 texts are a single block with no paragraph breaks.
- 86% mention "বর্ণিত" (narrated) in their first 350 characters, which is how the narrator chain can be spotted. About 18% show a clear "narrated ... he said" pattern.
- 18,091 texts are 60 words or shorter, and 10,127 are 40 words or shorter. Only 329 are 400 words or longer.
- Ibn Majah texts don't start with a hadis number like the other books do (6 of 4,341 do), so anything that reads the number from the text needs to handle that.
- One file, Nasa'i 435, contains a raw control character and fails strict JSON parsing, so that hadis shows "could not load" today. It is a one-line data fix.
