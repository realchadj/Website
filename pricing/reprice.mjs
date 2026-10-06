/* Reprices peptide-products-woocommerce.csv from supplier cost.

   `Meta: _supplier_cost` is the cost of ONE vial. The supplier quotes per box
   of 10, so a $50 box line is a $5.00 vial; `Stock` counts vials.

   Each vial is priced at `costMultiple` × its cost, the low end of what
   research-peptide buyers compare against. That price must still cover the
   vial, card processing, fulfilment, overhead and the discount, and leave
   `targetMargin` (and at least `minProfit`) as profit; where it wouldn't,
   the floor price is used instead. The assumptions live in model.mjs;
   change them there and rerun. reprice-live.mjs prices the live store
   from the same model.

   Usage:  node pricing/reprice.mjs            (rewrites the CSV in place)
           node pricing/reprice.mjs --check    (verifies, changes nothing)   */

import { readFileSync, writeFileSync } from 'node:fs';

import { ASSUMPTIONS, priceFor, breakdown } from './model.mjs';

const CSV = new URL('../peptide-products-woocommerce.csv', import.meta.url);

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
const [iSku, iName, iPrice, iCost, iCat] =
  ['SKU', 'Name', 'Regular price', 'Meta: _supplier_cost', 'Categories'].map(col);
const deepest = Math.max(...ASSUMPTIONS.volumeTiers.map(t => t.off));

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
  if (r[iCat] !== 'Lab Supplies') {
    const d = breakdown(now, cost, deepest);
    if (d.margin < ASSUMPTIONS.targetMargin - 1e-9) {
      console.error(`${r[iSku]}: at the ${deepest * 100}% volume tier margin is ${(d.margin * 100).toFixed(0)}%`);
      bad++;
    }
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
