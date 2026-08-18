# Instant Quote & Sample Intake

A self-contained quoting and sample-submission page for an analytical lab.
A customer picks their tests, enters a sample count, and sees an itemised
price immediately — then submits the request and prints a quote with a
chain-of-custody form attached.

No build step, no framework, no server required. Three files and a stylesheet.

---

## Why this exists

Small labs lose work at the quote stage. A prospect emails "what would it cost
to run a full soil panel on 40 samples?", waits two days for a reply, and by
then has already sent the box to whoever answered first. This page answers that
question in about eight seconds and captures the submission while the customer
is still deciding.

It also removes a second leak: quoting by hand is slow enough that most labs
don't chase small jobs, and inconsistent enough that volume discounts get
applied by memory. Here the rules are in one file and applied identically
every time.

---

## Run it

Open `index.html` in a browser. That's the whole setup — it works from the
filesystem, no local server needed.

## Deploy it

**GitHub Pages** — Settings → Pages → Source: *Deploy from a branch* → pick
your branch and `/ (root)`. Live in about a minute at
`https://<user>.github.io/<repo>/`.

**Netlify / Cloudflare Pages / Vercel** — drag the folder in, or connect the
repo. No build command, publish directory `/`.

**Your existing site** — copy `index.html` and `assets/` anywhere and link to
it. Nothing depends on being at the domain root.

---

## Make it yours — the three things to change

### 1. Prices and tests — `assets/catalog.js`

This is the only file you need to touch to change what you sell. Everything
in it is commented. The prices shipped are market-typical placeholders for a
small US lab; **replace them with yours before going live.**

You can edit:

| What | Where |
|---|---|
| Test names, codes, prices, methods, turnaround | `categories[].tests[]` |
| Whole service lines (add or delete) | `categories[]` |
| Rush pricing multipliers | `turnaround[]` |
| Volume discount tiers | `volumeBreaks[]` |
| Add-ons (kits, pickup, interpretation) | `addOns[]` |
| Minimum order value | `minimumOrder` |
| How long a quote stays valid | `quoteValidDays` |

Nothing else in the codebase hardcodes a price.

### 2. Your lab's details — top of `assets/app.js`

```js
const CONFIG = {
  labName:  'Midwest Biolabs',
  labEmail: 'midwestbiolabs@proton.me',
  ...
};
```

### 3. Where submissions go — `CONFIG.submitMode`

- **`'mailto'`** (default) — opens the customer's mail client with the full
  submission pre-filled. Zero setup, works the moment you deploy. The catch:
  delivery depends on the customer pressing send, and you have no record if
  they don't.

- **`'post'`** — sends the submission as JSON to `CONFIG.endpoint`. Set this
  up when you have five minutes. [Formspree](https://formspree.io) or
  [Basin](https://usebasin.com) both give you a URL to paste in and will
  forward submissions to your inbox on a free tier. Point it at your own
  server later if you'd rather.

Either way the customer always gets a download and a clipboard copy as a
fallback, so a submission is never silently lost.

---

## What the customer gets

- **A running estimate** that updates as they select, with every line itemised
  — testing, rush surcharge, volume discount, add-ons — so the number is
  legible rather than a mystery.
- **A nudge toward larger orders.** When they're near a discount tier the page
  says so: *"Add 9 more samples to reach 10+ samples and save 10%."*
- **A printable quote and chain of custody** on one page, ready to sign and
  drop in the box with the samples.
- **A reference number** (`Q-260818-4471`) on the quote, the email and the
  downloads, so the paperwork in the box matches the email in your inbox.
- **A saved draft.** Selections and contact details survive a page reload, so
  a customer who leaves to go count samples doesn't start over.

---

## Testing

Browser tests cover pricing arithmetic (volume breaks, rush multipliers,
minimum-order floor, cross-category selection), form validation, submission,
draft persistence and mobile layout. To run them you'll need Playwright:

```
npm install playwright
node test.mjs
```

---

## Notes before you take money with it

- **Set your real prices.** The placeholders are plausible, not yours.
- **Check your accreditation claims.** The method references in the catalog
  (EPA, AOAC, Standard Methods) are the correct references for those analyses,
  but only list what you're actually accredited or qualified to run.
- **Taxes** are excluded and mentioned as such in the footer. If you need to
  collect them, add the rule in `computeQuote()` in `assets/app.js`.
- **This quotes, it does not charge.** There's no payment processing. If you
  want card payment on submission, a Stripe Payment Link keyed to the total is
  the shortest path.
