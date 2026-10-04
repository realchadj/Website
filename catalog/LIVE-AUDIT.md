# heartlandbiolabs.com audit — 2026-10-04

Source: the store's public WooCommerce Store API (38 products, 81 variations)
and the rendered BPC-157 and Glutathione product pages. Re-run any time with
`node pricing/audit-live.mjs`.

Ordered by money at stake. "Import" means a file in `catalog/import/` fixes it; "Plugin" means
`dist/peptide-store.zip` (1.2.0) fixes it once uploaded; "Admin" means it
still takes a change in WP Admin; "Theme" means it's in
`heartland-bio-labs-v2`, which isn't in this repo. How to apply both is in
`catalog/import/README.md`.

## Fix this week

| # | Problem | Why it costs money | Fix | Where |
|---|---|---|---|---|
| 1 | **Tesamorelin 5mg ($87.00) costs more than 10mg ($79.99).** | Nobody should ever buy the 5mg, and anyone who notices wonders what else is wrong. | `2-prices.csv` sets 5mg to $47.99 ($9.60/mg, above the 10mg's $8.00/mg). | Import |
| 2 | **Semaglutide 20mg is $315.00**, while 10mg is $64.99 ($15.75/mg vs $6.50/mg). | Probably a typo for $115 or $125. It's out of stock now, so it'll be wrong the day it comes back. | `2-prices.csv` sets it to $119.99 ($6.00/mg). Supplier cost is about $4.50 per 10mg, so the margin is still wide. | Import |
| 3 | **CJC-1295 with DAC 10mg is $135.00**, while 5mg is $52.99 ($13.50/mg vs $10.60/mg). | Same as above. The 10mg is out of stock. | `2-prices.csv` sets it to $99.99 ($10.00/mg). Supplier cost is about $13 per 5mg. | Import |
| 4 | **7 variations have no SKU**: Cagrilintide 10mg, DSIP 5mg, Semaglutide 2mg, Sermorelin 5mg and 10mg, Thymosin Alpha-1 5mg and 10mg. | These are the newest products. The offers in their schema, any Merchant Center or ad feed, and your inventory reports go out without an identifier. | `1-skus.csv` sets only those 7 SKUs, matched by ID, using the store's `HBL-NAME-STRENGTH` pattern. | Import |
| 5 | **The Product schema has no `brand`.** | Google lists brand as recommended for merchant listings. The plugin added it through WooCommerce's schema filter, but Rank Math replaces that schema, so it never ran on this site. | The plugin adds brand to Rank Math's schema too. | Plugin |
| 6 | **Out-of-stock product pages still say "Same-day shipping if you order today"** (seen on Glutathione, where every strength is out of stock). | It's a broken promise right next to an unavailable product. | The plugin hides that line on out-of-stock products, and on a variable product whenever the chosen strength is out of stock. A theme fix would be cleaner, but this works now. | Plugin |

## Fix this month

| # | Problem | Fix | Where |
|---|---|---|---|
| 7 | **15 thin descriptions** (800–1,050 characters, against 3,500–5,000 on the strong pages): Glutathione, GHRP-2, GHRP-6, Adamax, MOTS-c, AOD-9604, Kisspeptin, Oxytocin, Epithalon, L-Carnitine, AICAR, 5-Amino-1MQ, LIPO-C, IGF-1 LR3 and PEG MGF. GHRP-6, MOTS-c and AOD-9604 are **in stock**, so start with those. | `3-descriptions.csv` rewrites those three (3,500–3,700 characters each, BPC-157 structure, links only to pages that exist). `5-descriptions-out-of-stock.csv` covers the other 12. | Import |
| 8 | **"target COA-verified purity"** appears in the FAQ ("tested by HPLC for purity (target COA-verified purity)") and in the BPC-157 schema description. It reads like a find-and-replace leftover. | The plugin removes the placeholder from the page. Put a real figure in the theme when you have one. | Plugin |
| 9 | **The BPC-157 title says "(2-10mg)" and the schema description says "Available in 2mg, 5mg, and 10mg"**, but only 5mg and 10mg exist. | `4-bpc157-title.csv` fixes the title. The plugin rewrites the schema's "Available in …" sentence from the strengths on sale. | Import + Plugin |
| 10 | **5 product images have no alt text**: Thymosin Alpha-1 (2), DSIP, Cagrilintide and Sermorelin. These are also the newest products. | The plugin falls back to the product name when alt is empty. Set real alt text in the Media Library when convenient: "<Name> <strength> 3D vial mockup". | Plugin + Admin |
| 11 | **No variation has a shipping weight.** | This is harmless while shipping is a flat rate or free over $200. Add weights before switching to carrier-calculated rates. | Admin |
| 12 | **Partial stock gaps on best-sellers**: TB-500 5mg, KPV 10mg, KLOW 5mg, BPC-157 + TB-500 10mg, GLOW 5mg and Bac Water 30ml. | Check that the default strength each product opens on is one that's in stock. It is today; the audit fails if that changes. | Admin |

## Decide

- **Volume pricing isn't on the live site.** The `peptide-store.php` plugin
  (10% off 3+ vials, 15% off 5+) isn't installed. The footer already says the
  welcome code "cannot be combined with bulk-order discount tiers". That
  matches how the plugin behaves, but the site has no tiers to point to.
  Installing the plugin gives the site those tiers and an "add N more to save"
  nudge in the cart, which is the most direct way to raise order value.
  `pricing/reprice.mjs --check` confirms the 15% tier still clears the margin
  floor on the CSV's costs. Check it against the live prices before turning it on.
- **Reviews.** Every product has 0 reviews and there is no reviews tab.
  Reviews would help conversion and could put star ratings in search results.
  The catch: for research-use-only products, a customer review that describes
  personal use is a compliance and payment-processor risk on a page you
  publish. If you turn reviews on, moderate every one before it's published.
- **NAP consistency.** The top bar says "ships today from Tulsa, OK". The
  footer address is Broken Arrow, OK. Use one city in both places and in
  Google Business Profile.

## What's already strong

Each product page has its own Rank Math title and description, plus a
canonical URL and Open Graph and Twitter cards. The Product schema includes
offers, shipping details and a return policy. There's a COA portal, a
reconstitution calculator, internal "Further reading" links to the blog, a
waitlist on out-of-stock products, and research-use-only language on every
page. The fixes above are the gaps around that.
