/* Builds the storefront at ./index.html.

   Packages product/ into dist/quote-desk.zip, then embeds that zip and the
   single-file build as base64 inside the page, so delivery needs no server,
   no storage bucket and no account anywhere.

   Usage:  node build-store.mjs
           BTC_ADDRESS=bc1... node build-store.mjs                          */

import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const ADDRESS = process.env.BTC_ADDRESS || '3ER42NnuB41VoPduKCPKUE1Dh1j17gzKqx';
const ROOT = new URL('./', import.meta.url);
const path = p => new URL(p, ROOT).pathname;

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
  html = html.replace(marker, () => value);        // function: values contain $
};

put('__BTC_ADDRESS__', ADDRESS);
put('__PRODUCT_B64__', zip.toString('base64'));
put('__STANDALONE_B64__', standalone.toString('base64'));
put('__ZIP_KB__', Math.round(zip.length / 1024));

if (/__[A-Z_]+__/.test(html)) {
  console.error('Refusing to build: a placeholder was left unreplaced —',
                html.match(/__[A-Z_]+__/)[0]);
  process.exit(1);
}

writeFileSync(path('index.html'), html);
console.log(`index.html      ${(html.length / 1024).toFixed(0)} KB`);
console.log(`  package       ${(zip.length / 1024).toFixed(0)} KB, ${listing.length} files`);
console.log(`  paying to     ${ADDRESS}`);
