# Microsite Plan: hadis.feeham.com on Netlify

Goal: run this project as a standalone microsite (SaaS-style) deployed on Netlify, served under a custom domain such as `hadis.feeham.com` with clean URLs, and usable from other apps.

## 1. Serving it as hadis.feeham.com

Netlify serves a site under your own domain directly, so no proxy is needed for this.

1. Deploy the site to Netlify (Git-connected, build `npm run build`, publish `build`).
2. In Netlify, add `hadis.feeham.com` as a custom domain on the site.
3. In your DNS for `feeham.com`, add a `CNAME` record: `hadis` pointing to `<your-site>.netlify.app`. If Netlify hosts the DNS zone, it can create the record for you.
4. Netlify issues the HTTPS certificate automatically once DNS resolves.

Visitors then see `hadis.feeham.com/...` for every page. The `*.netlify.app` address keeps working, so add a redirect from it to the custom domain (Netlify's "primary domain" setting) to avoid duplicate URLs.

## 2. Netlify config (`netlify.toml`)

```toml
[build]
  command = "npm run build"
  publish = "build"

# Single-page app fallback: every path serves index.html so the router can handle it.
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

# Static data files: allow other origins to read them and cache them.
[[headers]]
  for = "/json/*"
  [headers.values]
    Access-Control-Allow-Origin = "*"
    Cache-Control = "public, max-age=86400"
```

The `/*` rule only applies where no real file exists, so `/json/...` and `/photos/...` are still served as files.

## 3. URL scheme

Clean, shareable URLs (the examples you gave, adapted to what the data supports):

| URL | Page |
|---|---|
| `/` | Home |
| `/search?q=রোজা&page=2` | Search results (query and page in the URL) |
| `/books` | Book list |
| `/books/bukhari` | One book, first page |
| `/books/bukhari?page=3` | One book, paged |
| `/hadis/buk-124` | Hadis detail (new page, one hadis) |
| `/topics` and `/topics/ঈমান` | Topic index and one topic |

Notes:
- The hadis detail page does not exist yet. Build it from `HadisView` plus a lookup by tag (`BUK-124` maps to `json/hadis/Bukhari/0124/text.txt`).
- Map the URL slug (`buk`, `bukhari`) to the tag prefix (`BUK`) in one shared helper.
- Some Bukhari numbers have no file (see [non-core.md](non-core.md)), so the detail page needs a proper "not found" state.

## 4. Code changes needed before this works

- **Absolute asset and data paths (blocker):** `fetch("json/tags/...")` and `src="../photos/..."` are relative. On `/books/bukhari/124` they resolve to `/books/bukhari/json/...`, which Netlify answers with `index.html`, so JSON parsing fails. Use `/json/...` and `/photos/...` (or `process.env.PUBLIC_URL`) everywhere.
- **Real routing:** put `NavBar` inside `<Router>`, use `<Link>`/`NavLink` instead of `href`, remove the `pushState` calls, and add the routes from section 3, including `*` for a 404 page.
- **URL as source of truth:** read the search query and page from `useSearchParams`, so links, refresh and the back button work.
- **Per-page metadata:** each route sets its own title and description. A client-rendered SPA gives crawlers and link previews the same `index.html` for every URL, so hadis pages won't preview well. Options: prerender the main pages at build time, or serve per-URL tags from a Netlify Edge Function.
- **Rename the boilerplate:** `manifest.json`, page title, description and `lang="bn"` (see [non-core.md](non-core.md)).

## 5. "Any app can use it"

Pick what "use" means; these can be combined, in order of effort:

1. **Link to it:** other apps just link to `hadis.feeham.com/hadis/buk-124`. This needs only sections 1 to 4.
2. **Embed it:** other sites show a page in an `<iframe>`. Add an `?embed=1` mode that hides the navbar and logo. Set the response header `Content-Security-Policy: frame-ancestors https://feeham.com https://*.feeham.com` (or `*` to allow anyone) in `netlify.toml`.
3. **Read the data directly:** the `/json/*` files are static and get CORS headers from the config above, so any web app can `fetch("https://hadis.feeham.com/json/hadis/Bukhari/0124/text.txt")`. Publish the file layout as the public contract, and version it (for example `/v1/json/...`) before others depend on it.
4. **Search API:** a Netlify Function (`/api/search?q=...`) that runs the same search server-side and returns JSON. It needs the search logic extracted from `Search.js` into a shared module. Do this only if other apps need search without loading the shard files themselves.
5. **Same-domain mounting:** if you later want `feeham.com/hadis/*` to show this site while keeping `feeham.com` on another host, use a Netlify rewrite (`status = 200`) from the main site. The app then needs a router `basename` and a `homepage`/`PUBLIC_URL` of `/hadis`. Skip this unless you need it, since a subdomain avoids it entirely.

## 6. Deployment risks

- **Size and file count:** `public/json` holds about 71 MiB of real content in 35.7k files (32,886 hadis text files, 1,645 word-tag shards, 1,164 substring shards). The file count, not the size, is the problem: Cloudflare's free plan allows 20,000 files per site. Bundle hadis into per-book chunk files, which also speeds up the site.
- **Bandwidth:** every search downloads several shard files. Enable compression (Netlify does gzip/brotli by default for text) and the cache headers above.
- **Data licensing and attribution:** if other apps will reuse the text, decide and state the terms on the site.

## 7. Suggested order

1. Fix the absolute paths and routing (section 4).
2. Add `netlify.toml` and deploy to a `*.netlify.app` URL.
3. Add the custom domain and DNS record.
4. Add the hadis detail page and per-page metadata.
5. Add embed mode, then the API, only if needed.

## 8. Decided setup

- **Host:** Netlify free plan, on a **new** site (the existing `boikotha` site is left untouched).
- **DNS:** Cloudflare, DNS only. Record: `CNAME hadis -> <new-site>.netlify.app`, proxy status "DNS only" (grey cloud).
- **Repo:** stays public, so GitHub Actions minutes are free.
- **CI/CD:** `.github/workflows/ci.yml` runs lint, tests and build on every pull request and on pushes to `main`. On `main`, after everything passes, it deploys `build/` to Netlify with the Netlify CLI. The Netlify site's own Git builds must stay off so it doesn't deploy twice.
- **GitHub secrets needed:** `NETLIFY_AUTH_TOKEN` (Netlify user settings, Applications, Personal access tokens) and `NETLIFY_SITE_ID` (site settings, Site information, "Project ID").
- **Config:** `netlify.toml` holds the single-page-app redirect and the cache/CORS headers. `.nvmrc` pins Node 20.
