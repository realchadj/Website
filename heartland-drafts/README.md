# Heartland Bio Labs: calculator SEO drafts

Ready-to-paste pages for heartlandbiolabs.com. This repo does not deploy the
site. Everything here gets pasted into WordPress by hand.

## What the live site looks like (checked 2026-09-23)

- `/peptide-calculator/` is live, solid and RUO-safe. It links to bac water,
  BPC-157, TB-500, retatrutide, semaglutide, tirzepatide, GHK-Cu and
  sermorelin, and it supports hash presets like `#10mg-2ml-500mcg`.
- **The calculator is not in the header nav.** The header has Shop, About, FAQ,
  Contact, My Account and Research. The calculator appears only in the footer.
- **Conversion leak:** the calculator's product block shows **bac water, BPC-157
  and tirzepatide as "Back soon · Join waitlist"**. Bac water ($9) is the
  natural add-on for every calculator visitor. Restock it first. Until then,
  swap in in-stock products (semaglutide, retatrutide) at the top of that block.
- Retatrutide is in stock at 10 mg, 20 mg and 30 mg ($148 / $175 / $225), with
  published COAs.
- A supplier-vetting guide already exists:
  `/blog/how-to-vet-a-research-peptide-supplier/`. No "are peptides legal"
  page exists yet.

## Keyword data (Semrush US, pulled 2026-09-23)

| Cluster | Keywords (volume / KD) | Total/mo |
|---|---|---|
| **Retatrutide** | dosage calculator 5,400 / 11 · how much bac water for 10mg retatrutide 2,900 / 4 · how to reconstitute retatrutide 2,400 / 0 · reconstitution calculator 1,300 / 18 · retatrutide calculator 1,000 / 6 · reta calculator 590 / 2 | **~13,600** |
| Tirzepatide | reconstitution calculator 2,400 / 33 · tirzepatide calculator 1,300 / 23 · peptide calculator for tirzepatide 880 / 24 | ~4,600 |
| Semaglutide | reconstitution calculator 1,000 / 24 · semaglutide calculator 480 / 20 | ~1,500 |
| BPC-157 | reconstitution calculator 260 / 16 · bpc 157 reconstitution 260 / 8 · how to reconstitute bpc 157 170 / 0 · bpc 157 calculator 140 / 15 | ~830 |
| Main-page variants | peptide calc 4,400 / 24 · peptides calculator 2,900 / 9 · peptide reconstitution calculator 9,900 / 32 · peptide mixing calculator 880 / 31 · bac water calculator 390 / 30 | |
| Other | are peptides legal 6,600 / 19 · how to reconstitute peptides 5,400 / 24 · is glp1 a peptide 1,900 / 24 · best peptide reconstitution calculator 1,000 / 14 · where to buy peptides 6,600 / 43 | |

Retatrutide is the biggest and easiest cluster, and the product is in stock.
Its SERP is weak: peptideuniv, a clinic blog, a wiki, an exact-match domain,
Rite Aid and Cellgenic. Build order:

1. **`/peptide-calculator/retatrutide/`**: drafted (`peptide-calculator-retatrutide.html`).
2. `/peptide-calculator/semaglutide/`: in stock, ~1.5k/mo.
3. `/peptide-calculator/tirzepatide/`: wait until tirzepatide is back in stock.
   A calculator page funneling to a waitlist wastes the traffic.
4. BPC-157: skip the dedicated page for now (~830/mo, and out of stock).
   Cover it with an H2 on the main calculator instead.
5. "Are peptides legal" article, then the "how to reconstitute peptides" rebuild.

Sema/tirz caution: FDA enforcement against RUO sellers has focused on
semaglutide and tirzepatide. On those pages, keep to concentration math only
and never show titration or dose tables. The retatrutide page follows the same
rule.

## Publishing the retatrutide page

1. **Pages → Add New.** Title: `Retatrutide Calculator`. Parent: `Peptide
   Calculator`. Slug: `retatrutide`. That gives the URL
   `/peptide-calculator/retatrutide/`. Use the same full-width template as the
   main calculator.
2. Add **one Custom HTML block** and paste in the whole of
   `peptide-calculator-retatrutide.html`. It's self-contained (scoped CSS,
   vanilla JS, JSON-LD).
3. SEO fields (Rank Math or Yoast):
   - **SEO title:** `Retatrutide Calculator: 10, 20 & 30 mg Reconstitution Math`
   - **Meta description:** `Free retatrutide reconstitution calculator. See how much bac water to add to a 10, 20 or 30 mg vial, the mg/mL concentration and mcg per syringe unit. Research use only.`
   - **Focus keyword:** `retatrutide calculator`. Secondary: `retatrutide
     reconstitution calculator`, `how much bac water for 10mg retatrutide`,
     `retatrutide dosage calculator`.
   - The block already contains WebApplication and FAQPage JSON-LD. Don't add
     Rank Math's FAQ schema on this page, or it will be duplicated. Leave the
     plugin's breadcrumb and WebPage schema on.
4. Check it on a phone. The layout has no horizontal scroll at 390 px wide.
   Presets work: `/peptide-calculator/retatrutide/#20mg-3ml-1000mcg`.

## Internal links to add the same day

- **Main calculator** worked-example table, Retatrutide row: link "Retatrutide
  10 mg" to `/peptide-calculator/retatrutide/`. Also add a short "Compound
  calculators" list under the calculator, starting with retatrutide.
- **Retatrutide product page:** change "Open the peptide calculator with the
  10 mg + 2 mL worked example" to point at
  `/peptide-calculator/retatrutide/#10mg-2ml-500mcg`, with anchor text
  `retatrutide reconstitution calculator`.
- **Reta + tirz blend product page:** link to
  `/peptide-calculator/retatrutide/#rc-blend`.
- **Blog:** in `retatrutide-research-overview`,
  `buying-retatrutide-research-verification` and
  `retatrutide-vs-tirzepatide-research-comparison`, add one contextual link each
  with varied anchor text ("retatrutide calculator", "how much bac water for
  10 mg retatrutide", "reconstitution math for retatrutide").
- **Header nav:** add `Peptide Calculator` to the main menu (Appearance →
  Menus). It's currently in the footer only.

## After publishing

- GSC → URL Inspection → Request indexing for the new URL and the main
  calculator.
- IndexNow: Rank Math → Instant Indexing, or submit the URL through Bing
  Webmaster Tools.
- Track the six retatrutide keywords in Semrush Position Tracking, and check
  again in 2–3 weeks.
