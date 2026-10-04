# Applying the live-store fixes

About ten minutes in WP Admin. Back up first: most hosts have a one-click
backup, or export everything under Products → Export.

## 1. Import the five CSVs

For each file, in order: **Products → Import → choose file → tick "Update
existing products" → Continue → Run the importer.** Leave the column mapping
as it's detected.

| File | Changes | Rows |
|---|---|---|
| `1-skus.csv` | Adds SKUs to the 7 variations that have none | 7 |
| `2-prices.csv` | Tesamorelin 5mg $87.00 → $47.99; Semaglutide 20mg $315.00 → $119.99; CJC-1295 with DAC 10mg $135.00 → $99.99 | 3 |
| `3-descriptions.csv` | Replaces the thin descriptions on GHRP-6, MOTS-c and AOD-9604 | 3 |
| `4-bpc157-title.csv` | BPC-157 SEO title "(2-10mg)" → "(5-10mg)" | 1 |
| `5-descriptions-out-of-stock.csv` | Full descriptions for the 12 out-of-stock products (Glutathione, GHRP-2, Adamax, Kisspeptin, Oxytocin, Epithalon, L-Carnitine, AICAR, 5-Amino-1MQ, LIPO-C, IGF-1 LR3, PEG MGF), so they're ready when restocked | 12 |

Each file matches rows by product ID and holds only the columns it changes.
Nothing else on those products, or any other product, is touched.

If you'd rather set different prices, edit `2-prices.csv` before importing,
or skip it and change the three variations by hand.

## 2. Install the plugin

**Plugins → Add New → Upload Plugin → `dist/peptide-store.zip` → Install →
Activate.** It switches on:

- Brand in Rank Math's Product schema, and its "Available in …" sentence
  rewritten from the strengths actually on sale (fixes BPC-157's "2mg").
- The "(target COA-verified purity)" placeholder removed from the product FAQ.
- No "Same-day shipping" line on out-of-stock items.
- The product name as alt text on images that have none.
- A required 21+ / research-use checkbox at checkout.
- Volume pricing: 10% off 3+ vials and 15% off 5+, excluding Supplies, with a
  cart nudge. A coupon replaces the discount rather than stacking with it,
  which matches the footer's wording.
- A reorder reminder email 35 days after a completed order.

If you don't want volume pricing yet, set `PS_VOLUME_TIERS` to `[]` at the
top of the file before uploading.

## 3. Check

Run `node pricing/audit-live.mjs`. With everything applied it should report
no errors. Then paste a product URL into Google's Rich Results Test and
confirm the Product shows a brand.
