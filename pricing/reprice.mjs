/* Reprices peptide-products-woocommerce.csv from supplier cost.

   `Meta: _supplier_cost` is the cost of ONE vial. The supplier quotes per box
   of 10, so a $50 box line is a $5.00 vial; `Stock` counts vials.

   Each vial is priced at `costMultiple` × its cost, the low end of what
   research-peptide buyers compare against. That price must still cover the
   vial, packing, card processing and leave `targetMargin` (and at least
   `minProfit`) as profit; where it wouldn't, the floor price is used instead.
   Change the assumptions below and rerun.

   Usage:  node pricing/reprice.mjs            (rewrites the CSV in place)
           node pricing/reprice.mjs --check    (verifies, changes nothing)   */

import { readFileSync, writeFileSync } from 'node:fs';

const ASSUMPTIONS = {
  /* Card processing. Stripe, Square and PayPal don't accept research
     peptides, so this is a high-risk merchant account's typical rate. */
  processingPct: 0.05,      // 5% of the sale
  processingFixed: 0.30,    // + $0.30 per transaction

  /* Per-unit cost to get a vial out the door: label, vial box, padded or
     insulated mailer share, packing time. Shipping itself is charged to the
     buyer at checkout and isn't included. */
  fulfilmentPerUnit: 3.00,

  /* Profit left after cost, fulfilment and processing, as a share of price.
     35% is a healthy specialty-retail margin and lands most items in the
     range buyers compare against. */
  targetMargin: 0.35,

  /* Never earn less than this per unit, so cheap items still pay their way. */
  minProfit: 8.00,

  /* Shelf price as a multiple of per-vial cost. Retail for research
     peptides typically runs 8–15× landed cost; 6× prices the store as the
     affordable option (BPC-157 10mg at $29.99) while still keeping about 70%
     of each sale after every cost. Selling through today's in-stock
     inventory at these prices clears roughly $46,000 profit. */
  costMultiple: 6
};

const CSV = new URL('../peptide-products-woocommerce.csv', import.meta.url);

/* ------------------------------------------------------------------ math -- */

/* The floor is the smallest p with p − cost − fulfilment − (pct·p + fixed)
   ≥ the larger of targetMargin·p and minProfit. The price is the shelf
   multiple or the floor, whichever is higher, rounded up to the next .99. */
function priceFor(cost, a = ASSUMPTIONS) {
  const base = cost + a.fulfilmentPerUnit + a.processingFixed;
  const byMargin = base / (1 - a.processingPct - a.targetMargin);
  const byFloor = (base + a.minProfit) / (1 - a.processingPct);
  const shelf = cost * a.costMultiple;
  return Math.ceil(Math.max(shelf - 0.01, byMargin, byFloor) + 0.01) - 0.01;
}

function breakdown(price, cost, a = ASSUMPTIONS) {
  const fees = price * a.processingPct + a.processingFixed;
  const profit = price - cost - a.fulfilmentPerUnit - fees;
  return { fees, profit, margin: profit / price };
}

/* ------------------------------------------------------------------- csv -- */

function parseCsv(text) {
  const rows = [];
  let row = [], field = '', quoted = false;
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
  return rows;
}

const cell = v => /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;

/* ------------------------------------------------------------------ main -- */

const raw = readFileSync(CSV, 'utf8');
const EOL = raw.includes('\r\n') ? '\r\n' : '\n';   // keep the file's own line endings
const rows = parseCsv(raw);
const head = rows[0];
const col = name => {
  const i = head.indexOf(name);
  if (i < 0) throw new Error(`CSV has no "${name}" column`);
  return i;
};
const [iSku, iName, iPrice, iCost] =
  ['SKU', 'Name', 'Regular price', 'Meta: _supplier_cost'].map(col);

let bad = 0;
const report = [];
for (const r of rows.slice(1)) {
  const cost = Number(r[iCost]);
  if (!Number.isFinite(cost) || cost <= 0) {
    console.error(`${r[iSku]}: no usable supplier cost ("${r[iCost]}")`);
    bad++;
    continue;
  }
  const was = Number(r[iPrice]);
  const now = priceFor(cost);
  const { fees, profit, margin } = breakdown(now, cost);
  if (profit < ASSUMPTIONS.minProfit - 1e-9 || margin < ASSUMPTIONS.targetMargin - 1e-9) {
    console.error(`${r[iSku]}: $${now} leaves $${profit.toFixed(2)} — below target`);
    bad++;
  }
  if (process.argv.includes('--check') && Math.abs(was - now) > 0.001) {
    console.error(`${r[iSku]}: CSV has $${was}, assumptions give $${now.toFixed(2)}`);
    bad++;
  }
  r[iPrice] = now.toFixed(2);
  report.push({ sku: r[iSku], name: r[iName], cost, was, now, fees, profit, margin });
}

if (bad) { console.error(`\n${bad} problem(s); CSV not written.`); process.exit(1); }

const pad = (s, n) => String(s).padEnd(n);
const usd = n => ('$' + n.toFixed(2)).padStart(9);
console.log(pad('SKU', 8) + pad('Product', 44) + '     Cost      Was      Now     Fees   Profit  Margin');
for (const x of report) {
  console.log(pad(x.sku, 8) + pad(x.name.slice(0, 43), 44) + usd(x.cost) + usd(x.was) +
              usd(x.now) + usd(x.fees) + usd(x.profit) + `  ${(x.margin * 100).toFixed(0)}%`.padStart(6));
}

if (!process.argv.includes('--check')) {
  writeFileSync(CSV, rows.map(r => r.map(cell).join(',')).join(EOL) + EOL);
  console.log(`\nWrote ${report.length} prices to peptide-products-woocommerce.csv`);
} else {
  console.log(`\nAll ${report.length} prices match the assumptions.`);
}
