/* Reprices peptide-products-woocommerce.csv from supplier cost.

   `Meta: _supplier_cost` is the cost of ONE vial. The supplier quotes per box
   of 10, so a $50 box line is a $5.00 vial; `Stock` counts vials.

   Each vial is priced at the lowest .99 that covers the vial, fulfilment,
   card processing and the reserve, and still does on the deepest volume
   tier. The assumptions live in model.mjs; change them there and rerun.
   reprice-live.mjs prices the live store from the same model.

   Usage:  node pricing/reprice.mjs            (rewrites the CSV in place)
           node pricing/reprice.mjs --check    (verifies, changes nothing)   */

import { readFileSync, writeFileSync } from 'node:fs';

import { priceFor, breakdown, deepestOff } from './model.mjs';

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
const deepest = deepestOff();

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
  const off = r[iCat] === 'Lab Supplies' ? 0 : deepest;
  const now = priceFor(cost, off);
  const list = breakdown(now, cost);
  const tier = breakdown(now, cost, off);
  if (list.left < -1e-9) {
    console.error(`${r[iSku]}: $${now} is $${(-list.left).toFixed(2)} short of cost, fulfilment, processing and the reserve`);
    bad++;
  }
  if (tier.left < -1e-9) {
    console.error(`${r[iSku]}: at the ${off * 100}% volume tier $${now} is $${(-tier.left).toFixed(2)} short`);
    bad++;
  }
  if (process.argv.includes('--check') && Math.abs(was - now) > 0.001) {
    console.error(`${r[iSku]}: CSV has $${was}, assumptions give $${now.toFixed(2)}`);
    bad++;
  }
  r[iPrice] = now.toFixed(2);
  report.push({ sku: r[iSku], name: r[iName], cost, was, now, off, ...list, tierLeft: tier.left });
}

if (bad) { console.error(`\n${bad} problem(s); CSV not written.`); process.exit(1); }

const pad = (s, n) => String(s).padEnd(n);
const usd = n => ('$' + n.toFixed(2)).padStart(9);
console.log(pad('SKU', 8) + pad('Product', 40) + '     Cost      Was      Now     Fees  Reserve     Left  @' + (deepest * 100).toFixed(0) + '% off');
for (const x of report) {
  console.log(pad(x.sku, 8) + pad(x.name.slice(0, 39), 40) + usd(x.cost) + usd(x.was) + usd(x.now) +
              usd(x.fees) + usd(x.reserve) + usd(x.left) + (x.off ? usd(x.tierLeft) : '      n/a'));
}

if (!process.argv.includes('--check')) {
  writeFileSync(CSV, rows.map(r => r.map(cell).join(',')).join(EOL) + EOL);
  console.log(`\nWrote ${report.length} prices to peptide-products-woocommerce.csv`);
} else {
  console.log(`\nAll ${report.length} prices match the assumptions.`);
}
