# Handoff: everything from every session, in one branch

This branch (`claude/session-work-status-7kznr3`) merges all ten earlier
session branches. Nothing here has been deployed anywhere: the repo has no
Pages, Actions or hosting hooked up, and it is not connected to the live
WordPress site at heartlandbiolabs.com. Everything below is work waiting to
be installed.

## Pick this up on your computer

```
git clone https://github.com/realchadj/Website.git
cd Website
git checkout claude/session-work-status-7kznr3
npm install
```

Then open Claude Code in that folder and say "read HANDOFF.md". The next
session will have the full picture from this file.

To check the static parts still work (all three suites passed at merge time):

```
node build-store.mjs                 # regenerates index.html, robots.txt, sitemap.xml, dist/
node test-store.mjs                  # 49 storefront checks (needs Chromium via playwright)
node heartland/test.mjs
node product/test.mjs
```

## What is here and where it goes

### For the live WordPress site (heartlandbiolabs.com)

| Folder | What | How to install |
|---|---|---|
| `heartland-drafts/` | 4 compound calculator pages (retatrutide, BPC-157, tirzepatide, semaglutide), main-calculator upgrades + embed, reconstitution guide, 3 blog posts (GLP-1, are peptides legal, supplier vetting), outreach kit | Paste each file as a Custom HTML block. `heartland-drafts/README.md` is the step-by-step checklist with slugs, titles and metas |
| `blog-posts/` | 6 research posts: DSIP, thymosin alpha-1, oxytocin, GHRP-2 vs GHRP-6, glutathione, peptide storage | `bash blog-posts/import.sh` on the server with WP-CLI, or paste by hand. See `blog-posts/README.md` |
| `labels/` | Vial label printer for order fulfilment, plus a WordPress plugin that serves it at `/labels/` | Build the zip per `labels/wp-plugin/README.md`, upload in Plugins → Add New → Upload |

### Standalone static sites (host anywhere, e.g. GitHub Pages)

| Folder | What |
|---|---|
| `heartland/` | Heartland Bio Labs landing page + branded quote desk |
| `landing/` | Link-in-bio page for Instagram |
| `index.html` + `store/` | Storefront selling the quote tool. Bitcoin checkout, optional Stripe Payment Link (`STRIPE_LINK=... node build-store.mjs`), product catalog with stock status in `store/catalog.json`. `index.html` is generated: edit `store/template.html` and rebuild |
| `product/`, `demo/` | The quote tool itself and its try-before-buy demo |

### Strategy docs

| File | What |
|---|---|
| `strategy/instagram-audit.md` | Instagram profile audit and rebuild plan |
| `strategy/week-one.md` | Week-one execution kit |
| `heartland-drafts/outreach.md` | Backlink / outreach kit |

## Decisions made while merging

- **Stock status.** One branch (Sep 19) built a catalog with per-item
  out-of-stock handling for the storefront; a later branch (Sep 23) says
  the Heartland site should treat every product as available. Both are
  kept: the storefront catalog supports stock status (currently everything
  in stock), and the Heartland drafts never mention stock.
- **Fonts.** The Sep 11 branch removed Google Fonts from every page. That
  was kept; the newer SEO metadata was layered on top.
- **Two SEO passes** (Sep 1 and Sep 22) did the same job; the Sep 22
  version won.
- **Site URL** in the storefront template is now a `__SITE_URL__`
  placeholder filled by the build (default: the GitHub Pages URL). For a
  custom domain: `SITE_URL=https://example.com/ node build-store.mjs`.

## Suggested next steps, in order

1. Install the WordPress content (the calculator pages and blog posts are
   the SEO work with actual search volume behind them). Start with
   `heartland-drafts/README.md` Day 1.
2. Turn on GitHub Pages for this repo (Settings → Pages → deploy from this
   branch, `/` root) if you want the storefront, `heartland/` and
   `landing/` live without a host.
3. Make this branch the default on GitHub, or merge it into a `main`, so
   future sessions start from it instead of from the older branches.
