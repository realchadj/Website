# Heartland Bio Labs: SEO drafts, ready to paste

Everything here is pasted into WordPress by hand. This repo does not deploy heartlandbiolabs.com.
Work through the checklist top to bottom in the Cowork session.

## Implementation checklist

### Day 1
- [ ] **Remove Retatrutide and Tirzepatide from the live site entirely.** WordPress won't do this
      from here. Trash every product with either name (including the blend), plus the
      `/peptide-calculator/retatrutide/` and `/peptide-calculator/tirzepatide/` pages and the
      `retatrutide-*` / `tirzepatide-*` blog posts. Then 301-redirect those URLs to
      `/peptide-calculator/` or `/shop/` (Rank Math → Redirections), remove them from menus and
      widgets, clear the cache, and use GSC → Removals to drop them from search results.
- [ ] **Stock status:** the live site shows bac water, BPC-157 and others as
      "Back soon · Join waitlist". Per the owner, set every product to available and in stock
      (per the order sheet). The drafts assume that and never mention stock.
- [ ] **Header menu:** Appearance → Menus. Add `Peptide Calculator` (it's footer-only today).
- [ ] **Product-page title mismatches:** semaglutide's title says "(2-20mg)", but the copy lists
      2/5/10 mg.

### Compound calculator pages: ALREADY LIVE (don't paste the drafts)
Another session published compound calculators today (first at 08:57 UTC, last updated
13:22 UTC): semaglutide, BPC-157, TB-500 and GHK-Cu, each under
/peptide-calculator/. They report mg/mL, mcg per 0.1 mL and molarity, and they do not
convert to syringe units, which is the lower-risk framing after FDA's March 2026 warning
letter. **Keep the live pages.** The drafts from this session are in `superseded/` for
reference only. Pasting them would overwrite the live pages.

### Main calculator upgrades: `main-calculator-additions.html`
Seven numbered sections, each marked with where to paste it: compound calculator links; a
**reconstitution chart** (7 vial sizes × 4 volumes, for "peptide reconstitution chart", 1k/mo);
a variants section covering "peptide dosage calculator" (8.1k, KD 21), "peptide reconstitution
calculator" (9.9k), "peptides calculator", "peptide calc", "mixing calculator" and "bac water
calculator"; the **embed section with copy button**; 5 new FAQs; their schema; and fallback styles.
It also has a suggested new SEO title and meta for the main page.

### Embeddable calculator: `embed/peptide-calculator-embed.html`
- Upload it to the site root as **`/tools/peptide-calculator-embed.html`** (hosting file manager
  or SFTP; the `tools` folder sits next to `wp-content`). The embed code on the main page
  already points there.
- It's `noindex` with a canonical to /peptide-calculator/, so it can't compete with the real page.
- The credit link sits *outside* the iframe in the embed code. That's the link that counts as a
  backlink; links inside an iframe don't pass value to your site.
- **Check framing is allowed.** If a security plugin or host sends `X-Frame-Options: SAMEORIGIN`
  or a CSP `frame-ancestors` rule, the embed won't load on other sites. Test by pasting the
  embed code into any HTML page on another domain, or a CodePen. If it's blocked, exempt `/tools/`.

### Articles
| File | URL | Target |
|---|---|---|
| `blog-are-peptides-legal.html` | /blog/are-peptides-legal/ | are peptides legal (6.6k, KD 19) |
| `page-how-to-reconstitute-peptides.html` | /how-to-reconstitute-peptides/ (replace in place) | how to reconstitute peptides (5.4k, KD 24) |
| `blog-is-glp-1-a-peptide.html` | /blog/is-glp-1-a-peptide/ | is glp1 a peptide (1.9k, KD 24) |
| `blog-how-to-vet-a-research-peptide-supplier-REVISED.html` | existing URL (replace content) | where to buy peptides cluster |
| `blog-best-peptide-reconstitution-calculator.html` | /blog/best-peptide-reconstitution-calculator/ | best peptide reconstitution calculator (1k, KD 14) |

Paste each into a Custom HTML block (or switch the editor to code view). The header comment in
each file lists its SEO fields and **the internal links to add on other pages**. Do those the
same day; for a site with little authority, internal links are the fastest lever.

### Internal links for the calculator pages
- Main calculator's worked-example table: link the Semaglutide and BPC-157 rows to their
  compound calculators.
- Each product page's "Open the peptide calculator…" link → its compound calculator
  (e.g. `/peptide-calculator/semaglutide/#rc-calc`), anchor
  `<compound> reconstitution calculator`.
- BPC-157 + TB-500, GLOW, KLOW → `/peptide-calculator/bpc-157/#rc-blend`.
- Each compound's research-overview and buying-guide posts: one contextual link to its
  calculator, varying the anchor text.

### After publishing
- [ ] GSC → URL Inspection → Request indexing: the compound calculator pages, the main calculator
      and each article.
- [ ] IndexNow (Rank Math Instant Indexing, or Bing Webmaster Tools URL submission).
- [ ] Semrush Position Tracking: add the focus and secondary keywords from each file's header.
- [ ] Start the outreach in `outreach.md`.
- [ ] Re-check rankings in 2–3 weeks.

## Keyword data (Semrush US, 2026-09-23)

| Keyword | Vol | KD |
|---|---|---|
| peptide calculator | 201,000 | 25 |
| peptide reconstitution calculator | 9,900 | 32 |
| peptide dosage calculator | 8,100 | 21 |
| are peptides legal / where to buy peptides | 6,600 each | 19 / 43 |
| how to reconstitute peptides | 5,400 | 24 |
| bpc 157 dosage calculator | 4,400 | 17 |
| peptide calc | 4,400 | 24 |
| reconstitution calculator | 3,600 | 29 |
| peptides calculator | 2,900 | 9 |
| peptide dose calculator | 2,400 | 20 |
| is glp1 a peptide | 1,900 | 24 |
| semaglutide reconstitution calculator / peptide reconstitution chart / best peptide reconstitution calculator | ~1,000 each | 6–24 |

## Compliance line all of this follows
Concentration and volume math only: no dose tables, no titration schedules, no injection guidance
and no benefit claims. Every "dosage calculator" query is answered honestly: the page does the
arithmetic and recommends no dose. Aliquot examples deliberately avoid approved-label and
clinical-trial dose steps.
