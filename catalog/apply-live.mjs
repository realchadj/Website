/* Applies catalog/import/*.csv to the live store through the WooCommerce
   REST API, instead of clicking through Products → Import five times.

   It reads every product and variation it's about to change first, saves
   those current values to catalog/backups/<time>.json, and only then writes.
   Each CSV column maps to one field; nothing else on a product is sent.

   Usage:
     WP_USER=admin WP_APP_PASSWORD='xxxx xxxx …' node catalog/apply-live.mjs           # dry run: shows every change
     WP_USER=admin WP_APP_PASSWORD='xxxx xxxx …' node catalog/apply-live.mjs --apply   # writes, after a backup
     node catalog/apply-live.mjs --restore catalog/backups/<file>.json --apply         # puts the backed-up values back

   STORE (default https://heartlandbiolabs.com) and IMPORT_DIR (default
   catalog/import) can be overridden. Credentials are a WordPress
   application password for an administrator (Users → Profile).          */

import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const STORE = (process.env.STORE || 'https://heartlandbiolabs.com').replace(/\/$/, '');
const IMPORT_DIR = process.env.IMPORT_DIR || join(here, 'import');
const APPLY = process.argv.includes('--apply');
const restoreIdx = process.argv.indexOf('--restore');
const RESTORE = restoreIdx > 0 ? process.argv[restoreIdx + 1] : null;

// Reads happen before any write, so a failure here leaves the store untouched.
process.on('uncaughtException', e => { console.error(`Stopped: ${e.message}`); process.exit(1); });

const { WP_USER, WP_APP_PASSWORD } = process.env;
if (!WP_USER || !WP_APP_PASSWORD) {
  console.error('Set WP_USER and WP_APP_PASSWORD (a WordPress application password for an administrator).');
  process.exit(2);
}
const auth = 'Basic ' + Buffer.from(`${WP_USER}:${WP_APP_PASSWORD.replace(/\s+/g, '')}`).toString('base64');

async function api(method, path, body) {
  const res = await fetch(`${STORE}/wp-json/wc/v3${path}`, {
    method,
    headers: { Authorization: auth, 'Content-Type': 'application/json', 'User-Agent': 'catalog-apply' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data; try { data = JSON.parse(text); } catch { data = text; }
  if (!res.ok) throw new Error(`${method} ${path}: HTTP ${res.status} ${typeof data === 'object' ? data.message || data.code : String(data).slice(0, 200)}`);
  return data;
}

// The same columns the CSVs use, mapped to the REST field each one sets.
const COLUMNS = {
  'SKU': { get: o => o.sku, set: v => ({ sku: v }) },
  'Regular price': { get: o => o.regular_price, set: v => ({ regular_price: v }) },
  'Description': { get: o => o.description, set: v => ({ description: v }) },
  'Meta: rank_math_title': {
    get: o => (o.meta_data || []).find(m => m.key === 'rank_math_title')?.value ?? '',
    set: v => ({ meta_data: [{ key: 'rank_math_title', value: v }] }),
  },
};

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

// One change = one field on one product or variation.
let changes = [];
if (RESTORE) {
  changes = JSON.parse(readFileSync(RESTORE, 'utf8')).map(c => ({ ...c, to: c.from, from: undefined, file: 'restore' }));
} else {
  for (const file of readdirSync(IMPORT_DIR).filter(f => f.endsWith('.csv')).sort()) {
    for (const row of parseCsv(readFileSync(join(IMPORT_DIR, file), 'utf8'))) {
      const parent = (row.Parent || '').replace(/^id:/, '');
      for (const [col, value] of Object.entries(row)) {
        if (!COLUMNS[col]) continue;
        changes.push({ file, column: col, id: Number(row.ID), parent: parent ? Number(parent) : null, to: value });
      }
    }
  }
}
for (const c of changes) {
  if (!COLUMNS[c.column]) throw new Error(`${c.file}: unknown column ${c.column}`);
  if (!(c.id > 0)) throw new Error(`${c.file}: row without an ID`);
}

const pathFor = c => (c.parent ? `/products/${c.parent}/variations/${c.id}` : `/products/${c.id}`);

// Read everything first. A missing product, or a variation under the wrong
// parent, stops the run before anything is written.
const current = new Map();
for (const c of changes) {
  const p = pathFor(c);
  // context=edit returns the stored values, not ones run through display filters.
  if (!current.has(p)) current.set(p, await api('GET', p + '?context=edit'));
  const obj = current.get(p);
  if (c.parent && obj.parent_id !== undefined && obj.parent_id !== c.parent)
    throw new Error(`${c.file}: variation ${c.id} belongs to product ${obj.parent_id}, not ${c.parent}`);
  c.from = COLUMNS[c.column].get(obj);
  if (c.parent && !current.has(`/products/${c.parent}`)) current.set(`/products/${c.parent}`, await api('GET', `/products/${c.parent}?context=edit`));
  c.name = c.parent ? `${current.get(`/products/${c.parent}`).name} ${obj.name}` : obj.name || `#${c.id}`;
}

const todo = changes.filter(c => String(c.from ?? '') !== String(c.to));
const short = v => { const s = String(v ?? '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim(); return s.length > 60 ? `${s.slice(0, 57)}… (${s.length} chars)` : `"${s}"`; };
console.log(`${STORE}: ${changes.length} field(s) in ${RESTORE || IMPORT_DIR}, ${todo.length} differ from the live store.\n`);
for (const c of todo) console.log(`  ${c.name} (#${c.id}) ${c.column}: ${short(c.from)} → ${short(c.to)}`);
if (!todo.length) process.exit(0);

if (!APPLY) { console.log('\nDry run. Add --apply to write these.'); process.exit(0); }

if (!RESTORE) {
  const dir = join(here, 'backups');
  mkdirSync(dir, { recursive: true });
  const file = join(dir, new Date().toISOString().replace(/[:.]/g, '-') + '.json');
  writeFileSync(file, JSON.stringify(todo.map(({ file, column, id, parent, from, name }) => ({ file, column, id, parent, from, name })), null, 2));
  console.log(`\nBacked up the current values to ${file}`);
  console.log(`Undo with: node catalog/apply-live.mjs --restore ${file} --apply\n`);
}

let failed = 0;
for (const c of todo) {
  try {
    const saved = await api('PUT', pathFor(c), COLUMNS[c.column].set(c.to));
    const now = COLUMNS[c.column].get(saved);
    if (String(now) !== String(c.to)) throw new Error(`saved as ${short(now)}`);
    console.log(`  ✓ ${c.name} ${c.column}`);
  } catch (e) {
    failed++;
    console.log(`  ✗ ${c.name} ${c.column}: ${e.message}`);
  }
}
console.log(failed ? `\n${failed} change(s) failed; the rest were applied.` : `\nAll ${todo.length} change(s) applied.`);
process.exit(failed ? 1 : 0);
