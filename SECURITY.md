# Security

## Reporting a problem

If you find a way to make the storefront show a different payment address,
settle an order without paying, or run code on either page, please don't open
a public issue. Email **midwestbiolabs@proton.me** with the details and a way
to reproduce it.

## What the site does to protect buyers

Both pages are static and served from GitHub Pages, which cannot set response
headers, so the protections live in the pages themselves:

- **Content-Security-Policy** (meta tag). Only the page's own scripts run —
  pinned by SHA-256 hash at build time — so injected script is refused. The
  storefront may only connect to the price feed and the two block explorers.
  `base-uri`, `form-action` and `object-src` are locked to `'none'`.
- **No referrer** is sent from the storefront to the block explorers.
- **Frame protection.** The checkout refuses to run inside another site's
  frame, where an overlay could show a different address or amount.
  (`frame-ancestors` is ignored in a meta tag, so this is done in script.)
- **Stored state is untrusted.** Everything on `realchadj.github.io` shares
  one origin and one `localStorage`. A saved order is only resumed if it
  pays this build's address an amount the page could have generated; a saved
  quote draft is filtered to values the catalog and form could produce.
- **External data is validated.** A USD/BTC rate outside a plausible band is
  refused (the buyer is sent to the manual path rather than overpaying), and
  explorer responses are type-checked before they can settle an order.
- **The payment address is checksum-validated at build time**, and the build
  refuses to produce a page otherwise.

`node test-store.mjs` covers each of these.

## What it cannot do

The product is embedded in a public page and the repository is public, so a
client-side paywall cannot stop someone who reads the source. See
*What this design does not do* in the README.
