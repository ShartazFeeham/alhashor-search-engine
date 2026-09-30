# Alhashor Search Engine

A Bengali hadis search site covering the six major hadis books: Bukhari, Muslim, Tirmidhi, Abu Dawud, Ibn Majah and Nasa'i. It runs entirely in the browser against static JSON files, so it needs no server or database.

Live at https://hadis.feeham.com

## Features

- **Search** by hadis number, narrator name, any word, or part of a hadis. Results are ranked by how many of the searched words a hadis contains, and the matched words are highlighted.
- **Topics**: a list of 100+ topics (prayer, fasting, faith, and so on). A topic shows every hadis that contains all of its words.
- **Books**: read any of the six books from the first hadis to the last, 20 per page.

All hadis text is in Bengali, so searches must be written in Bengali.

## Getting started

Requires Node 20.19 or newer (see `.nvmrc`). Built with Vite and tested with Vitest.

```sh
npm ci          # install dependencies
npm start       # dev server at http://localhost:3000
npm test        # tests in watch mode; add -- --run to run them once
npm run lint    # ESLint, zero warnings allowed
npm run build   # production build into build/
npm run preview # serve the production build locally
```

## How search works

The data lives in `public/json/` and is fetched on demand:

| Folder | Contents | Files |
|---|---|---|
| `hadis/<Book>/<0001>/text.txt` | The text of one hadis (a JSON string) | 32,886 |
| `tags/<first two letters>.json` | word → tags of the hadis containing it, e.g. `"BUK-124"` | 1,645 |
| `substring/<first two letters>.json` | word → longer words that contain it | 1,164 |

A tag is the book code and the hadis number: `BUK` Bukhari, `MUS` Muslim, `TIR` Tirmidhi, `DAU` Abu Dawud, `MAJ` Ibn Majah, `NAS` Nasa'i.

For each word in a query, [src/Search/searchIndex.js](src/Search/searchIndex.js) loads the matching `tags` file, and the `substring` file for longer words that contain it (for queries under eight words). It merges the hadis, ranks them by how many words matched, and the page shows 20 at a time. Data files are downloaded in parallel and cached in memory for the session.

## Project layout

```
src/
  Search/     search page and the shared search module (searchIndex.js)
  Topics/     topic list and topic results
  Books/      book list and paging (bookList.js holds the books and hadis counts)
  Helpers/    hadis card, paging buttons, highlighting, number and book-name helpers
  Home/       home page
  Navbar/     top navigation
public/
  json/       the hadis data (see above)
  photos/     images
```

## Deployment

Pushes to `main` deploy automatically through GitHub Actions ([.github/workflows/ci.yml](.github/workflows/ci.yml)):

1. Install, lint, test and build (this also runs on every pull request).
2. On `main` only, deploy `build/` to Netlify with the Netlify CLI.

[netlify.toml](netlify.toml) holds the single-page-app redirect and the cache and CORS headers for `/json/*` and `/photos/*`. The workflow needs two repository secrets: `NETLIFY_AUTH_TOKEN` and `NETLIFY_SITE_ID`.

## Notes

- Some hadis numbers have no data file (for example about 330 numbers in Bukhari's range). Those cards show a "could not be loaded" message.
- More ideas and known issues are in [docs/](docs/).
- Searches are matched by a normalized Bengali spelling, because the data spells some letters two ways. See [src/Search/searchIndex.js](src/Search/searchIndex.js).
