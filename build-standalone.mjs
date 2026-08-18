/* Inlines styles.css, catalog.js and app.js into one self-contained HTML file.
   Used to publish a hosted preview; the repo files stay the source of truth.
   Usage: node build-standalone.mjs [outfile]                                 */
import { readFileSync, writeFileSync } from 'node:fs';

const out = process.argv[2] || 'standalone.html';
const read = p => readFileSync(new URL(p, import.meta.url), 'utf8');

let html = read('./index.html');
// Replacement is passed as a function: file contents contain "$'" and other
// $-patterns that String.replace would otherwise interpret as substitutions.
const inline = (marker, open, file, close) => {
  html = html.replace(marker, () => `${open}\n${read(file)}\n${close}`);
};
inline('<link rel="stylesheet" href="assets/styles.css">', '<style>',  './assets/styles.css', '</style>');
inline('<script src="assets/catalog.js"></script>',        '<script>', './assets/catalog.js', '<\/script>');
inline('<script src="assets/app.js"></script>',            '<script>', './assets/app.js',     '<\/script>');

// The artifact host supplies the document skeleton, so hand it page content.
if (process.env.ARTIFACT) {
  const title = html.match(/<title>([\s\S]*?)<\/title>/)[1];
  const head = html.match(/<head>([\s\S]*?)<\/head>/)[1];
  const body = html.match(/<body>([\s\S]*?)<\/body>/)[1];
  const keep = head
    .replace(/<title>[\s\S]*?<\/title>/, '')
    .replace(/<meta charset[^>]*>|<meta name="viewport"[^>]*>/g, '')
    .trim();
  html = `<title>${title}</title>\n${keep}\n${body.trim()}`;
}

writeFileSync(new URL(out, import.meta.url), html);
console.log(`${out} — ${(html.length / 1024).toFixed(1)} KB`);
