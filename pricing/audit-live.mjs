/* Audits the live WooCommerce catalog through its public Store API — the
   same data shoppers and Google see — for the faults that cost sales or
   merchant listings: variations with no SKU, a bigger size that costs more
   per mg than a smaller one, a default strength that's out of stock while
   another is in stock, thin product copy and images with no alt text.

   Usage:
     node pricing/audit-live.mjs                          # fetches heartlandbiolabs.com
     STORE=https://example.com node pricing/audit-live.mjs
     node pricing/audit-live.mjs products.json variations.json   # saved Store API responses

   Exits 1 if any error-level problem is found.                            */

import { readFileSync } from 'node:fs';

const STORE = (process.env.STORE || 'https://heartlandbiolabs.com').replace(/\/$/, '');
const THIN = 1500;   // description characters; the strong live pages run 3,500–5,000

async function fetchAll(type) {
  const out = [];
  for (let page = 1; ; page++) {
    const url = `${STORE}/wp-json/wc/store/v1/products?per_page=100&page=${page}${type ? `&type=${type}` : ''}`;
    const res = await fetch(url, { headers: { 'User-Agent': 'catalog-audit' } });
    if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
    const batch = await res.json();
    out.push(...batch);
    if (page >= Number(res.headers.get('x-wp-totalpages') || 1)) return out;
  }
}

const [productsFile, variationsFile] = process.argv.slice(2);
const products = productsFile ? JSON.parse(readFileSync(productsFile, 'utf8')) : await fetchAll('');
const variations = variationsFile ? JSON.parse(readFileSync(variationsFile, 'utf8')) : await fetchAll('variation');

const errors = [], warnings = [], notes = [];
const money = cents => `$${(Number(cents) / 100).toFixed(2)}`;
const strengthOf = v => (v.variation || '').replace(/^[^:]*:\s*/, '');

// "5mg/5mg/50mg" → 60, "100mcg" → 0.1, "10ml" → 10. Blends compare by total content.
function amount(s) {
  let total = 0;
  for (const [, n, unit] of s.matchAll(/([\d.]+)\s*(mcg|mg|ml|g)\b/gi))
    total += Number(n) * ({ mcg: 0.001, mg: 1, ml: 1, g: 1000 })[unit.toLowerCase()];
  return total;
}

const bySku = new Map();
const byParent = new Map();
for (const v of variations) {
  const label = `${v.name} ${strengthOf(v)} (variation ${v.id})`;
  if (!v.sku) errors.push(`${label}: no SKU — offers in the schema and Merchant Center feeds go out without one`);
  else if (bySku.has(v.sku)) errors.push(`${label}: SKU ${v.sku} duplicates variation ${bySku.get(v.sku)}`);
  else bySku.set(v.sku, v.id);
  if (!byParent.has(v.parent)) byParent.set(v.parent, []);
  byParent.get(v.parent).push(v);
}

for (const p of products) {
  const vars = (byParent.get(p.id) || []).map(v => ({ v, s: strengthOf(v), qty: amount(strengthOf(v)), price: Number(v.prices.price) }));

  // Per-unit price should fall (or hold) as the vial gets bigger. Blends only
  // get the bigger-must-cost-more check: their components don't scale together.
  const sized = vars.filter(x => x.qty > 0 && x.price > 0).sort((a, b) => a.qty - b.qty);
  for (let i = 1; i < sized.length; i++) {
    const [a, b] = [sized[i - 1], sized[i]];
    if (b.price <= a.price)
      errors.push(`${p.name}: ${b.s} costs ${money(b.price)}, no more than ${a.s} at ${money(a.price)} — the smaller vial is never worth buying`);
    else if (!b.s.includes('/') && b.price / b.qty > (a.price / a.qty) * 1.05)
      errors.push(`${p.name}: ${b.s} at ${money(b.price)} costs more per unit than ${a.s} at ${money(a.price)} (${money(b.price / b.qty)} vs ${money(a.price / a.qty)}) — likely a pricing typo`);
  }

  const inStock = vars.filter(x => x.v.is_in_stock);
  const def = (p.attributes[0]?.terms || []).find(t => t.default);
  if (!p.is_in_stock) warnings.push(`${p.name}: out of stock in every strength`);
  else {
    if (def && inStock.length && !inStock.some(x => x.s === def.name))
      errors.push(`${p.name}: default strength ${def.name} is out of stock while ${inStock.map(x => x.s).join(', ')} is in stock — shoppers land on "out of stock"`);
    const out = vars.filter(x => !x.v.is_in_stock).map(x => x.s);
    if (out.length) notes.push(`${p.name}: out of stock in ${out.join(', ')}`);
  }

  const descLen = (p.description || '').replace(/<[^>]+>/g, '').length;
  if (descLen < THIN) warnings.push(`${p.name}: description is thin (${descLen} characters of text)`);
  for (const img of p.images || [])
    if (!img.alt) warnings.push(`${p.name}: image ${img.id} has no alt text`);
  const offered = new Set(vars.map(x => x.s));
  for (const t of p.attributes[0]?.terms || [])
    if (!offered.has(t.name)) notes.push(`${p.name}: strength ${t.name} is an attribute term with no variation`);
}

const noWeight = variations.filter(v => !v.weight).length;
if (noWeight) notes.push(`${noWeight} of ${variations.length} variations have no shipping weight`);

const section = (title, list) => list.length && console.log(`\n${title} (${list.length})\n` + list.map(l => `  - ${l}`).join('\n'));
console.log(`${products.length} products, ${variations.length} variations from ${productsFile ? productsFile : STORE}`);
section('ERRORS', errors);
section('WARNINGS', warnings);
section('NOTES', notes);
if (errors.length) process.exit(1);
