/* Checks peptide-products-woocommerce.csv for the things that hurt a listing
   once it's imported: missing or duplicate content, search snippets that
   Google will truncate, cross-sells pointing at SKUs that don't exist, and
   published products that can't be shipped or bought.

   Usage:  node pricing/check-catalog.mjs                                  */

import { readFileSync } from 'node:fs';

const rows = parseCsv(readFileSync(new URL('../peptide-products-woocommerce.csv', import.meta.url), 'utf8'));
const head = rows[0];
const get = (r, name) => {
  const i = head.indexOf(name);
  if (i < 0) throw new Error(`CSV has no "${name}" column`);
  return r[i];
};

const RUO = 'For laboratory research use only. Not for human or veterinary use.';
const TITLE_MAX = 50;   // characters before the site name; ~60 in all before Google truncates
const DESC_MAX = 160;

const skus = new Set(rows.slice(1).map(r => get(r, 'SKU')));
const seen = new Map();
const problems = [];
const fail = (sku, msg) => problems.push(`${sku}: ${msg}`);

for (const r of rows.slice(1)) {
  const sku = get(r, 'SKU');
  const published = get(r, 'Published') === '1';
  const desc = get(r, 'Description');
  const short = get(r, 'Short description');

  if (!short.includes(RUO)) fail(sku, 'short description lacks the research-use-only statement');
  if (!desc.includes(RUO)) fail(sku, 'description lacks the research-use-only statement');
  if (/never coming/i.test(short + desc)) fail(sku, 'customer-facing text says "never coming"; unpublish it instead');
  if (desc.length < 400) fail(sku, `description is thin (${desc.length} chars)`);
  if (seen.has(desc)) fail(sku, `description duplicates ${seen.get(desc)}`);
  seen.set(desc, sku);

  if (/\b(dose|dosage|dosing|inject(ion)? (for|into)|take daily)\b/i.test(short + desc.replace(/Not intended for injection/, '')))
    fail(sku, 'text reads as human-use instructions');

  const title = get(r, 'Meta: rank_math_title').replace(/\s*%sep%\s*%sitename%$/, '');
  if (!title || title.length > TITLE_MAX) fail(sku, `SEO title is ${title.length} chars before the site name`);
  for (const col of ['Meta: rank_math_description', 'Meta: _yoast_wpseo_metadesc']) {
    const d = get(r, col);
    if (!d || d.length > DESC_MAX) fail(sku, `${col} is ${d.length} chars (1–${DESC_MAX})`);
  }
  if (!get(r, 'Meta: rank_math_focus_keyword')) fail(sku, 'no focus keyword');
  if (!get(r, 'Categories')) fail(sku, 'no category');

  for (const col of ['Upsells', 'Cross-sells'])
    for (const ref of get(r, col).split(',').filter(Boolean)) {
      if (!skus.has(ref)) fail(sku, `${col} names unknown SKU ${ref}`);
      if (ref === sku) fail(sku, `${col} names itself`);
    }

  if (published) {
    for (const col of ['Weight (lbs)', 'Length (in)', 'Width (in)', 'Height (in)'])
      if (!(Number(get(r, col)) > 0)) fail(sku, `published without ${col}, so shipping can't be calculated`);
    if (get(r, 'In stock?') === '0' && get(r, 'Backorders allowed?') === '0')
      fail(sku, 'published but out of stock with no backorders; hide it or restock');
  }
}

if (problems.length) {
  console.error(problems.join('\n') + `\n\n${problems.length} catalog problem(s).`);
  process.exit(1);
}
console.log(`All ${rows.length - 1} products pass the catalog checks.`);

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
