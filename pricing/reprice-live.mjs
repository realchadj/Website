/* Reprices the live store from supplier cost, using the same model as
   reprice.mjs (pricing/model.mjs), and writes the result to
   catalog/import/2-prices.csv for Products → Import or catalog/apply-live.mjs.

   Costs come from peptide-products-woocommerce.csv (one vial each). A live
   strength with no cost row is costed from the nearest strength of the same
   product, erring high either way: a bigger vial pro rata by content (real
   bigger vials are cheaper per mg), a smaller vial at SMALLER_COST of the
   known one (the cost sheet's half- and fifth-size vials run 0.62–0.80 of
   the full size). A product with no cost row at all is left alone and
   listed.

   A price is only ever lowered: where the model says a live price is too
   low, it's reported, not raised. Within a product, a bigger vial never
   costs more per mg than a smaller one, and a bigger vial always costs more
   than a smaller one, so pricing/audit-live.mjs stays clean.

   Usage:  node pricing/reprice-live.mjs                 (rewrites 2-prices.csv)
           node pricing/reprice-live.mjs live.tsv        (another snapshot) */

import { readFileSync, writeFileSync } from 'node:fs';
import { priceFor, breakdown, deepestOff, up99, down99 } from './model.mjs';

const here = new URL('.', import.meta.url);
const COSTS = new URL('../peptide-products-woocommerce.csv', here);
const LIVE = process.argv[2] || new URL('live-variations.tsv', here);
const OUT = new URL('../catalog/import/2-prices.csv', here);

/* Repo SKU → the live product (parent ID) and strength it is the cost of. */
const SKU_TO_LIVE = {
  TSM10: [279, '10mg'], SM2: [262, '2mg'], SM5: [262, '5mg'], SM10: [262, '10mg'],
  BC5: [114, '5mg'], BC10: [114, '10mg'], BT10: [274, '10mg'],
  KLOW80: [197, '10mg/10mg/50mg/10mg'], BBG70: [168, '10mg/10mg/50mg'], BB10: [121, '5mg/5mg'],
  BA10: [109, '10ml'], SMO5: [3423, '5mg'], SMO10: [3423, '10mg'], CU50: [149, '50mg'],
  IP5: [185, '5mg'], IP10: [185, '10mg'], CD5: [825, '5mg'], CGL10: [3426, '10mg'],
  KP5: [202, '5mg'], MS10: [215, '10mg'], XA10: [269, '10mg'], SK10: [257, '10mg'],
  P41: [242, '10mg'], ML10: [222, '10mg'], NJ500: [225, '500mg'], NJ1000: [225, '1000mg'],
  CP10: [139, '5mg/5mg'], CND5: [126, '5mg (No DAC)'], TA5: [3602, '5mg'], TA10: [3602, '10mg'],
  DS5: [3605, '5mg'], '5AD': [102, '5mg'], G65: [163, '5mg'],
};

const SMALLER_COST = 0.8;   // a smaller vial's cost as a share of the nearest known bigger one

const SUPPLIES = new Set([109]);   // no volume discount on Lab Supplies

/* "5mg/5mg/50mg" → 60, "100mcg" → 0.1, "10ml" → 10. */
function amount(s) {
  let total = 0;
  for (const [, n, unit] of s.matchAll(/([\d.]+)\s*(mcg|mg|ml|g)\b/gi))
    total += Number(n) * ({ mcg: 0.001, mg: 1, ml: 1, g: 1000 })[unit.toLowerCase()];
  return total;
}

function parseCsv(text) {
  const rows = []; let row = [], field = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (c !== '\r') field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  const [head, ...body] = rows.filter(r => r.some(Boolean));
  return body.map(r => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ''])));
}

/* ---------------------------------------------------------------- costs -- */

const known = new Map();   // parent → [{ strength, qty, cost }]
for (const r of parseCsv(readFileSync(COSTS, 'utf8'))) {
  const to = SKU_TO_LIVE[r.SKU];
  if (!to) continue;
  const cost = Number(r['Meta: _supplier_cost']);
  if (!(cost > 0)) throw new Error(`${r.SKU}: no usable supplier cost`);
  if (!known.has(to[0])) known.set(to[0], []);
  known.get(to[0]).push({ strength: to[1], qty: amount(to[1]), cost });
}

function costFor(parent, strength) {
  const rows = known.get(parent);
  if (!rows) return null;
  const exact = rows.find(r => r.strength === strength);
  if (exact) return { cost: exact.cost, how: 'cost sheet' };
  const qty = amount(strength);
  const nearest = rows.reduce((a, b) => Math.abs(b.qty - qty) < Math.abs(a.qty - qty) ? b : a);
  if (qty > nearest.qty) return { cost: nearest.cost * qty / nearest.qty, how: `pro rata from ${nearest.strength}` };
  return { cost: nearest.cost * SMALLER_COST, how: `${SMALLER_COST} × ${nearest.strength}` };
}

/* ----------------------------------------------------------------- live -- */

const [head, ...lines] = readFileSync(LIVE, 'utf8').trim().split('\n').map(l => l.split('\t'));
const live = lines.map(l => Object.fromEntries(head.map((h, i) => [h, l[i]])))
  .map(v => ({ id: Number(v.id), parent: Number(v.parent), product: v.product, strength: v.strength,
               qty: amount(v.strength), live: Number(v.price), inStock: v.in_stock === '1' }));

const byParent = new Map();
for (const v of live) { if (!byParent.has(v.parent)) byParent.set(v.parent, []); byParent.get(v.parent).push(v); }

const skipped = [], tooLow = [], rows = [];
for (const [parent, vars] of byParent) {
  vars.sort((a, b) => a.qty - b.qty);
  if (!known.has(parent)) { skipped.push(vars[0].product); continue; }
  const off = SUPPLIES.has(parent) ? 0 : deepestOff();
  let prev = null;
  for (const v of vars) {
    const { cost, how } = costFor(parent, v.strength);
    const floor = priceFor(cost, off);   // covers everything even on the deepest tier
    let want = Math.min(floor, v.live);
    // Hold the bigger vial to the smaller one's per-mg price, and above its price.
    if (prev && !v.strength.includes('/')) want = Math.min(want, down99(prev.price / prev.qty * v.qty));
    if (prev && want <= prev.price) want = up99(prev.price + 0.01);
    want = Math.max(want, floor);
    if (v.live < floor - 1e-9) tooLow.push({ ...v, cost, floor });
    const worst = breakdown(want, cost, off);
    if (worst.left < -1e-9 && want > v.live)
      throw new Error(`${v.product} ${v.strength}: $${want} is $${(-worst.left).toFixed(2)} short at the ${off * 100}% tier`);
    rows.push({ ...v, cost, how, price: want, full: breakdown(want, cost), worst, off });
    prev = { price: want, qty: v.qty };
  }
}

/* --------------------------------------------------------------- output -- */

const changed = rows.filter(r => r.live - r.price >= 1);   // a cut under $1 isn't worth a reimport
const pad = (s, n) => String(s).padEnd(n);
const usd = n => ('$' + n.toFixed(2)).padStart(9);
console.log(pad('Product', 34) + pad('Strength', 20) + '     Cost     Live      New     Fees  Reserve     Left  @tier');
for (const r of rows) {
  console.log(pad(r.product.replace(/\s*\(.*\)$/, '').slice(0, 33), 34) + pad(r.strength, 20) + usd(r.cost) + usd(r.live) +
    (r.price < r.live ? usd(r.price) : '     same') + usd(r.full.fees) + usd(r.full.reserve) + usd(r.full.left) +
    (r.off ? usd(r.worst.left) : '      n/a') + (r.how === 'cost sheet' ? '' : `   (cost ${r.how})`));
}
if (tooLow.length) {
  console.log(`\nBelow the model's floor on the live store (left as they are):`);
  for (const r of tooLow) console.log(`  ${r.product} ${r.strength}: $${r.live.toFixed(2)} live, floor $${r.floor.toFixed(2)} on a $${r.cost.toFixed(2)} vial`);
}
if (skipped.length) console.log(`\nNo cost row, left as they are: ${skipped.map(s => s.replace(/\s*\(.*\)$/, '')).join(', ')}`);

const csv = ['ID,Type,Parent,Regular price', ...changed.map(r => `${r.id},variation,id:${r.parent},${r.price.toFixed(2)}`)].join('\n') + '\n';
writeFileSync(OUT, csv);
const lost = changed.reduce((s, r) => s + r.live - r.price, 0);
console.log(`\nWrote ${changed.length} lower prices to catalog/import/2-prices.csv (${rows.length - changed.length} unchanged; average cut $${(lost / changed.length).toFixed(2)}).`);
