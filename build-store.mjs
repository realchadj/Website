/* Builds the storefront at ./index.html.

   Packages product/ into dist/quote-desk.zip, then embeds that zip and the
   single-file build as base64 inside the page, so delivery needs no server,
   no storage bucket and no account anywhere.

   Usage:  node build-store.mjs
           BTC_ADDRESS=bc1... node build-store.mjs
           SITE_URL=https://example.com/ node build-store.mjs
           STRIPE_LINK=https://buy.stripe.com/... node build-store.mjs     */

import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const ADDRESS = process.env.BTC_ADDRESS || '3ER42NnuB41VoPduKCPKUE1Dh1j17gzKqx';
/* Absolute URL the site is served from — canonical link, social cards and the
   sitemap all need it. Trailing slash enforced so path concatenation works.  */
const SITE_URL = (process.env.SITE_URL || 'https://realchadj.github.io/website/')
  .replace(/\/*$/, '/');
const ROOT = new URL('./', import.meta.url);
const path = p => new URL(p, ROOT).pathname;

/* CATALOG_PATH and OUT_PATH exist so the tests can build a fixture store
   without touching the real catalog or the real index.html.               */
const CATALOG_PATH = process.env.CATALOG_PATH || path('store/catalog.json');
const OUT_PATH = process.env.OUT_PATH || path('index.html');

/* A malformed address means a buyer's payment is unrecoverable, so a bad one
   fails the build rather than reaching a customer. Covers base58check (1…,
   3…) and bech32 (bc1…), which are the address forms a wallet will produce. */
function validBase58Check(addr) {
  const A = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  let n = 0n;
  for (const c of addr) {
    const i = A.indexOf(c);
    if (i < 0) return false;
    n = n * 58n + BigInt(i);
  }
  const bytes = [];
  for (let v = n; v > 0n; v >>= 8n) bytes.unshift(Number(v & 0xffn));
  while (bytes.length < 25) bytes.unshift(0);
  if (bytes.length !== 25) return false;
  const body = Buffer.from(bytes.slice(0, 21));
  const sum = Buffer.from(bytes.slice(21));
  const h = createHash('sha256')
    .update(createHash('sha256').update(body).digest()).digest().subarray(0, 4);
  return h.equals(sum);
}

function validBech32(addr) {
  const CHARSET = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';
  const s = addr.toLowerCase();
  if (s !== addr && addr.toUpperCase() !== addr) return false;   // no mixed case
  const pos = s.lastIndexOf('1');
  if (pos < 1 || pos + 7 > s.length || s.length > 90) return false;
  const hrp = s.slice(0, pos);
  const data = [];
  for (const c of s.slice(pos + 1)) {
    const i = CHARSET.indexOf(c);
    if (i < 0) return false;
    data.push(i);
  }
  const polymod = values => {
    const GEN = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];
    let chk = 1;
    for (const v of values) {
      const b = chk >> 25;
      chk = ((chk & 0x1ffffff) << 5) ^ v;
      for (let i = 0; i < 5; i++) if ((b >> i) & 1) chk ^= GEN[i];
    }
    return chk >>> 0;
  };
  const expand = h => [...[...h].map(c => c.charCodeAt(0) >> 5), 0,
                       ...[...h].map(c => c.charCodeAt(0) & 31)];
  const chk = polymod([...expand(hrp), ...data]);
  return chk === 1 || chk === 0x2bc830a3;        // bech32 or bech32m
}

if (!validBase58Check(ADDRESS) && !validBech32(ADDRESS)) {
  console.error(`Refusing to build: "${ADDRESS}" is not a valid Bitcoin address.`);
  process.exit(1);
}

/* -------------------------------------------------------------- catalog -- */

/* Every product the store offers lives in store/catalog.json. A product
   marked in_stock is a promise to sell at that price, so a malformed entry
   fails the build rather than reaching a buyer.                            */
let catalog;
try {
  catalog = JSON.parse(readFileSync(CATALOG_PATH, 'utf8'));
} catch (e) {
  console.error(`Refusing to build: cannot read ${CATALOG_PATH} — ${e.message}`);
  process.exit(1);
}

if (!Array.isArray(catalog.products) || catalog.products.length === 0) {
  console.error('Refusing to build: catalog has no products.');
  process.exit(1);
}
{
  const ids = new Set();
  for (const p of catalog.products) {
    const where = `catalog product ${JSON.stringify(p.id ?? p.name ?? '?')}`;
    const fail = why => { console.error(`Refusing to build: ${where} ${why}.`); process.exit(1); };
    if (typeof p.id !== 'string' || !/^[a-z0-9-]+$/.test(p.id)) fail('needs a lowercase slug id');
    if (ids.has(p.id)) fail('has a duplicate id');
    ids.add(p.id);
    if (typeof p.name !== 'string' || !p.name.trim()) fail('needs a name');
    if (typeof p.priceUsd !== 'number' || !Number.isFinite(p.priceUsd) || p.priceUsd <= 0)
      fail('needs a priceUsd greater than 0');
    if (p.status !== 'in_stock' && p.status !== 'out_of_stock')
      fail('needs status "in_stock" or "out_of_stock"');
    if (p.fulfillment !== 'download' && p.fulfillment !== 'contact')
      fail('needs fulfillment "download" or "contact"');
  }
}

const esc = s => String(s).replace(/[&<>"']/g,
  c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const productCard = p => {
  const inStock = p.status === 'in_stock';
  return `<article class="prod${inStock ? '' : ' out-of-stock'}" data-product="${esc(p.id)}">
  <div class="prod-top"><h3>${esc(p.name)}</h3>
    <span class="badge ${inStock ? 'in' : 'out'}">${inStock ? 'In stock' : 'Out of stock'}</span></div>
  ${p.blurb ? `<p>${esc(p.blurb)}</p>` : ''}
  <div class="prod-foot"><span class="prod-price">$${p.priceUsd}</span>
    ${inStock
      ? `<button class="btn btn-primary btn-sm" type="button" data-buy="${esc(p.id)}">Buy with Bitcoin</button>`
      : `<button class="btn btn-ghost btn-sm" type="button" disabled>Out of stock</button>`}
  </div>
</article>`;
};

/* A typo'd payment link sends card buyers to a dead page, so only a Stripe
   Payment Link URL is accepted. Unset means Bitcoin only.                  */
const STRIPE_LINK = (process.env.STRIPE_LINK || '').trim();
if (STRIPE_LINK && !/^https:\/\/buy\.stripe\.com\/[A-Za-z0-9_]+$/.test(STRIPE_LINK)) {
  console.error(`Refusing to build: "${STRIPE_LINK}" is not a Stripe Payment Link ` +
                '(expected https://buy.stripe.com/...).');
  process.exit(1);
}

/* ------------------------------------------------------------ packaging -- */

execFileSync('node', ['build-standalone.mjs', 'standalone.html'],
             { cwd: path('product'), stdio: 'pipe' });

mkdirSync(path('dist'), { recursive: true });
rmSync(path('dist/quote-desk.zip'), { force: true });
execFileSync('zip', ['-r', '-X', '-q', '../dist/quote-desk.zip', '.',
                     '-x', 'node_modules/*', '.preview.png', '.shot-*.png'],
             { cwd: path('product') });

const zip = readFileSync(path('dist/quote-desk.zip'));
const standalone = readFileSync(path('product/standalone.html'));

/* The demo is served from the same build as the package, so a buyer can never
   try one version and receive another. */
mkdirSync(path('demo'), { recursive: true });
writeFileSync(path('demo/index.html'), standalone);

/* Cross-check the archive before it is sold: unzip -t proves it is readable,
   and the manifest is what the storefront promises the buyer.               */
execFileSync('unzip', ['-t', '-q', path('dist/quote-desk.zip')]);
const listing = execFileSync('unzip', ['-Z1', path('dist/quote-desk.zip')], { encoding: 'utf8' })
  .trim().split('\n').filter(f => !f.endsWith('/')).sort();

for (const required of ['index.html', 'README.md', 'test.mjs',
                        'assets/app.js', 'assets/catalog.js', 'assets/styles.css',
                        'standalone.html']) {
  if (!listing.includes(required)) {
    console.error(`Refusing to build: the package is missing ${required}.`);
    process.exit(1);
  }
}

/* ----------------------------------------------------------- assembling -- */

let html = readFileSync(path('store/template.html'), 'utf8');
const put = (marker, value) => {
  if (!html.includes(marker)) {
    console.error(`Refusing to build: template has no ${marker}.`);
    process.exit(1);
  }
  html = html.replaceAll(marker, () => value);     // function: values contain $
};

put('__BTC_ADDRESS__', ADDRESS);
put('__SITE_URL__', SITE_URL);
put('__STRIPE_LINK__', STRIPE_LINK);
html = html.replaceAll('__PAY_METHODS__', STRIPE_LINK ? 'card or Bitcoin' : 'Bitcoin');
put('__PRODUCT_B64__', zip.toString('base64'));
put('__STANDALONE_B64__', standalone.toString('base64'));
put('__ZIP_KB__', Math.round(zip.length / 1024));
put('__CATALOG_CARDS__', catalog.products.map(productCard).join('\n'));
/* <-escape so a name containing "</script" can't break out of the tag */
put('__CATALOG_JSON__', JSON.stringify({
  contact: typeof catalog.contact === 'string' ? catalog.contact : '',
  products: catalog.products
}).replace(/</g, '\\u003c'));

if (/__[A-Z_]+__/.test(html)) {
  console.error('Refusing to build: a placeholder was left unreplaced —',
                html.match(/__[A-Z_]+__/)[0]);
  process.exit(1);
}

writeFileSync(OUT_PATH, html);

/* --------------------------------------------------- robots and sitemap -- */

const today = new Date().toISOString().slice(0, 10);
writeFileSync(path('robots.txt'),
  `User-agent: *
Allow: /

Sitemap: ${SITE_URL}sitemap.xml
`);
writeFileSync(path('sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${SITE_URL}</loc><lastmod>${today}</lastmod></url>
  <url><loc>${SITE_URL}demo/</loc><lastmod>${today}</lastmod></url>
</urlset>
`);

const inStock = catalog.products.filter(p => p.status === 'in_stock').length;
console.log(`${OUT_PATH.split('/').pop().padEnd(15)} ${(html.length / 1024).toFixed(0)} KB`);
console.log(`  site url      ${SITE_URL}`);
console.log(`  package       ${(zip.length / 1024).toFixed(0)} KB, ${listing.length} files`);
console.log(`  catalog       ${catalog.products.length} product(s), ${inStock} in stock`);
console.log(`  paying to     ${ADDRESS}`);
console.log(`  card link     ${STRIPE_LINK || 'none — card button hidden'}`);
