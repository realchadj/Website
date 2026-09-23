# Instant Quote — product and storefront

Three things live here:

- **`product/`** — the thing being sold: a self-hosted instant-quote and
  sample-intake page for an analytical lab. See `product/README.md`.
- **`store/`** + **`index.html`** — a storefront that sells it for Bitcoin,
  with no payment processor, no merchant account and no server.
- **`heartland/`** — the **Heartland Bio Labs** site: an SEO-structured
  landing page plus its own branded instance of the quote desk, separate
  from the Midwest Biolabs demo. Static, deploys anywhere. Tests:
  `cd heartland && node test.mjs`.

`index.html` at the root is **generated**. Edit `store/template.html` and
rebuild.

---

## Build and deploy

```
node build-store.mjs           # → index.html, dist/quote-desk.zip
```

The build refuses to produce a page if the Bitcoin address fails checksum
validation, if the package is missing a promised file, or if a template
placeholder went unreplaced. A broken storefront costs a sale; a storefront
pointed at a malformed address costs the buyer their money.

Deploy the repo root to GitHub Pages (Settings → Pages → deploy from branch,
`/` root). It's a static site — Netlify, Cloudflare Pages and any web host
work identically. `demo/` is the live product, served for try-before-buy.

To sell to a different address:

```
BTC_ADDRESS=bc1... node build-store.mjs
```

---

## How the checkout works

There is no Stripe, no Coinbase Commerce, no account anywhere. The mechanism
is four steps:

1. The page fetches the USD/BTC rate from a public API and prices the product.
2. It records which transactions already exist against the address, then
   generates a payment amount with a **random three-digit satoshi tag** so this
   order's payment is distinguishable from every other.
3. The buyer pays — by copying the amount and address, or by tapping *Open in
   wallet*, which hands their wallet app a `bitcoin:` URI with the amount
   pre-filled.
4. The page polls a public block explorer (mempool.space, falling back to
   blockstream.info) for a **new** transaction paying that exact amount. When
   one appears, the product downloads automatically.

The product itself is embedded in the page as base64 — the zip and the
single-file build both. Nothing is fetched at delivery time, so there is no
storage bucket to configure and no download link to expire.

### What this design does not do

Read this before relying on it for real money.

- **It cannot enforce payment.** The product is embedded in a page anyone can
  view the source of. A technically capable visitor can extract it without
  paying. This is unavoidable without a server — any purely client-side
  paywall is a courtesy lock. If that matters more than the zero-setup
  property, move the payload behind a small backend that releases it only
  after verifying payment server-side, and keep this page as the front end.
- **It unlocks on an unconfirmed transaction** by default (`confirmations: 0`
  in the checkout config). That is fast and correct for a low-priced digital
  product; a mempool transaction can in principle be replaced. Raise it to `1`
  if you'd rather wait for a block.
- **The address is reused for every sale.** That is why the txid snapshot in
  step 2 exists — without it an older payment of a coincidentally equal amount
  would settle a new order. It also means anyone with the address can see your
  whole sales history on-chain. Rotating addresses per order needs an xpub and
  a key derivation step, which needs a server.
- **There are no refunds.** Bitcoin payments are irreversible and there is no
  mechanism here to send anything back. The storefront says so plainly on the
  page, which is the honest way to sell this way.
- **Income is still income.** Being paid in Bitcoin does not change that it's
  taxable revenue in most jurisdictions. Keep the transaction records.

---

## Tests

```
node test-store.mjs            # storefront — 22 checks
cd product && node test.mjs    # the product — 22 checks
```

Both need `npm install playwright` first, and both run fully offline: the
storefront tests stub the block explorer and the price feed, so they never
touch a real API or a real address. They cover the cases that actually lose
money — underpayment, payment to a different address, and a pre-existing
transaction attempting to settle a fresh order — alongside explorer and
price-feed outages, which must fall back to the manual path rather than
opening an order that can never settle.

---

## Getting the first sale

The page is built. It won't sell itself, and no page does — organic traffic
is a consequence of distribution, not a substitute for it. The shortest paths
from here, roughly in order of effort:

1. **Put it in front of labs directly.** There are trade associations and
   directories for analytical labs. A short email with the demo link, sent to
   fifty small labs, is a better test of whether this sells than any amount of
   SEO.
2. **Post the demo where lab people already are** — r/labrats, LinkedIn lab
   groups, agronomy and food-safety forums. Lead with the demo, not the price.
3. **Search traffic is a months-long play, not a launch strategy.** If you
   want it, the terms to rank for are the ones a lab manager types when they're
   already shopping ("lab quoting software", "sample submission form").

The honest expectation: a $79 tool sold to a niche audience needs volume, and
volume needs distribution. This repo gives you a product that works and a
checkout that takes money. The part it doesn't give you is customers.
