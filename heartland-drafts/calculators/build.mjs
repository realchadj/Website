// Builds the compound-specific calculator pages for heartlandbiolabs.com.
//   node heartland-drafts/calculators/build.mjs
// Writes heartland-drafts/peptide-calculator-<slug>.html, one paste-ready Custom HTML
// block per page. Tables, FAQ text and FAQPage JSON-LD are generated from the same
// data, so the visible answers and the schema cannot drift apart.

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import compounds from './compounds.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, '..');
const SITE = 'https://heartlandbiolabs.com';
const css = readFileSync(join(here, 'calc.css'), 'utf8').trim();
const js = readFileSync(join(here, 'calc.js'), 'utf8').trim();


// ---------- number helpers ----------
const num = (n, d = 2) => Number(n.toFixed(d)).toLocaleString('en-US', { maximumFractionDigits: d });
const conc = (mg, ml) => mg / ml;
const concTxt = (mg, ml) => `${num(conc(mg, ml), 2)} mg/mL`;
const perUnit = (mg, ml) => `${num(conc(mg, ml) * 10, 1)} mcg`;
const per10 = (mg, ml) => `${num(conc(mg, ml) * 100, 0)} mcg`;
const strip = html => html.replace(/<[^>]+>/g, '');

// ---------- FAQ generation ----------
function faqs(c) {
  const N = c.name;
  const byVial = {};
  for (const [mg, ml] of c.table) (byVial[mg] ||= []).push(ml);
  const first = c.vials[0];
  const list = [];

  // One question per vial size that has searchable demand, answered from the table.
  for (const mg of c.faqVials) {
    const vols = byVial[mg] || [1, 2, 3];
    const parts = vols.map(ml => `${ml} mL makes ${concTxt(mg, ml)} (${perUnit(mg, ml)} per unit)`);
    list.push({
      q: `How much bacteriostatic water do you add to ${mg} mg of ${N}?`,
      a: `No single amount is correct. The volume you add sets the concentration. With a ${mg} mg vial, ${joinList(parts)}. More water means each aliquot takes up more volume, which is easier to measure accurately. A standard 3 mL vial holds up to about 3 mL.`
    });
  }
  const [m, v] = c.unitExample; // mg vial, mL diluent
  const cc = conc(m, v), aliq = c.unitExampleAliquotMg, vol = aliq / cc;
  list.push({
    q: `How do you convert a ${N} amount in mg to units on a syringe?`,
    a: `Divide the amount by the concentration to get millilitres, then multiply by 100 to get U-100 units. At ${num(cc, 2)} mg/mL, ${aliq} mg is ${num(vol, 3)} mL, which is ${num(vol * 100, 1)} units. Units measure volume. The mass in each unit depends on the concentration you prepared.`
  });
  list.push({
    q: `Is this a ${N} dosage calculator?`,
    a: `It does the arithmetic people usually mean by that search: concentration, mcg per syringe unit and the volume of a chosen aliquot. It does not suggest or endorse any dose. ${c.status} Heartland sells it for laboratory research only.`
  });
  list.push({ q: `How long does reconstituted ${N} last?`, a: c.storageFaq });
  list.push({
    q: `Why is my reconstituted ${N} cloudy?`,
    a: `Cloudiness or particles after gentle swirling mean the powder hasn't fully dissolved or the material has degraded. Common causes are shaking the vial, spraying diluent straight onto the powder, or adding diluent to a cold vial. Solution that stays cloudy is not used.`
  });
  list.push({
    q: `Does adding more water change how much ${N} is in the vial?`,
    a: `No. A ${first} mg vial holds ${first} mg whether you add 1 mL or 3 mL. Water changes only how much of that mass is in each millilitre.`
  });
  for (const x of c.extraFaq || []) list.push(x);
  return list;
}
function joinList(a) { return a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1]; }

// ---------- page ----------
function page(c) {
  const N = c.name, Nc = c.nameCap, url = `${SITE}/peptide-calculator/${c.slug}/`;
  const f = faqs(c);
  const vialChips = c.vials.map(v => `      <button type="button" data-v="${v}">${v} mg</button>`).join('\n');
  const rows = c.table.map(([mg, ml]) =>
    `    <tr><td>${mg} mg</td><td>${ml} mL</td><td>${concTxt(mg, ml)}</td><td>${perUnit(mg, ml)}</td><td>${per10(mg, ml)}</td></tr>`).join('\n');
  const faqHtml = f.map((x, i) =>
    `<details${i === 0 ? ' open' : ''}>\n  <summary>${x.q}</summary>\n  <p>${x.a}</p>\n</details>`).join('\n');
  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebApplication',
        name: `${Nc} Reconstitution Calculator`,
        url,
        applicationCategory: 'UtilitiesApplication',
        operatingSystem: 'Any (web browser)',
        isAccessibleForFree: true,
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
        description: `Calculates concentration, micrograms per U-100 syringe unit and aliquot volume for ${joinList(c.vials.map(v => v + ' mg'))} ${N} vials reconstituted with bacteriostatic water. For laboratory research use only.`,
        publisher: { '@type': 'Organization', name: 'Heartland Bio Labs', url: SITE + '/' }
      },
      {
        '@type': 'FAQPage',
        mainEntity: f.map(x => ({ '@type': 'Question', name: strip(x.q), acceptedAnswer: { '@type': 'Answer', text: strip(x.a) } }))
      }
    ]
  };

  const blend = c.blend ? `
<h2 id="rc-blend">${c.blend.title}</h2>
${c.blend.html}
` : '';

  return `<!--
  Heartland Bio Labs — /peptide-calculator/${c.slug}/
  GENERATED by heartland-drafts/calculators/build.mjs. Edit compounds.mjs and rebuild; don't hand-edit.
  Paste this whole file into ONE "Custom HTML" block on a new WordPress page.
  Page title: ${Nc} Calculator   Slug: ${c.slug}   Parent page: Peptide Calculator
  SEO title:  ${c.seoTitle}
  Meta desc:  ${c.metaDesc}
  Focus kw:   ${c.focus}
  Secondary:  ${c.secondary}
  Stock note: ${c.stockNote}
-->
<style>
${css}
</style>

<div class="hbl-rc">

<p class="rc-lede">${c.lede}</p>

<ul class="rc-jump">
  <li><a href="#rc-calc">Calculator</a></li>
  <li><a href="#rc-water">How much bac water</a></li>
  <li><a href="#rc-how">How to reconstitute ${N}</a></li>${c.blend ? `\n  <li><a href="#rc-blend">${c.blend.jump}</a></li>` : ''}
  <li><a href="#rc-faq">FAQ</a></li>
</ul>

<section id="rc-calc" class="rc-panel" aria-labelledby="rc-calc-h">
  <h2 id="rc-calc-h" style="margin-top:0">${Nc} reconstitution calculator</h2>

  <div class="rc-field">
    <label for="rc-mg">${Nc} in vial (mg)</label>
    <div class="rc-chips" data-for="rc-mg">
${vialChips}
    </div>
    <input id="rc-mg" type="number" min="0.1" step="0.1" value="${c.defaults[0]}" inputmode="decimal">
  </div>

  <div class="rc-field">
    <label for="rc-ml">Bacteriostatic water added (mL)</label>
    <div class="rc-chips" data-for="rc-ml">
      <button type="button" data-v="1">1 mL</button>
      <button type="button" data-v="2">2 mL</button>
      <button type="button" data-v="3">3 mL</button>
    </div>
    <input id="rc-ml" type="number" min="0.1" step="0.1" value="${c.defaults[1]}" inputmode="decimal">
    <p class="rc-hint">The volume only changes the concentration. The amount of peptide in the vial stays the same.</p>
  </div>

  <div class="rc-field">
    <label for="rc-al">Amount per aliquot (mcg), optional</label>
    <input id="rc-al" type="number" min="0" step="1" placeholder="e.g. ${c.aliquotPlaceholder}" inputmode="decimal">
    <p class="rc-hint">The mass one measured aliquot should contain, per your research protocol. 1 mg = 1,000 mcg.</p>
  </div>

  <div class="rc-out" aria-live="polite">
    <div class="rc-stat"><b id="rc-o-conc">${concTxt(...c.defaults)}</b><span>Concentration</span></div>
    <div class="rc-stat"><b id="rc-o-unit">${perUnit(...c.defaults)}</b><span>per unit (U-100, 1 unit = 0.01 mL)</span></div>
    <div class="rc-stat"><b id="rc-o-vol">—</b><span>Aliquot volume</span></div>
    <div class="rc-stat"><b id="rc-o-n">—</b><span>Aliquots per vial</span></div>
  </div>
  <p id="rc-w-small" class="rc-warn">This aliquot is under 2 units (0.02 mL). Syringe graduation error is a large share of a volume that small. Adding more diluent turns the same aliquot into a larger volume that is easier to measure.</p>
  <p id="rc-w-big" class="rc-warn">A standard 3 mL vial holds about 3 mL of diluent. For larger volumes, move the solution to a larger sterile vial.</p>
  <p id="rc-w-over" class="rc-warn">This aliquot is larger than the syringe. A U-100 1 mL syringe holds 100 units.</p>

  <p class="rc-ruo">This tool calculates solution concentrations for laboratory preparation records. It gives no dosage guidance. ${c.status} Heartland Bio Labs sells ${N} for research use only. It is not for human consumption, self-administration or therapeutic use.</p>
</section>

<h2 id="rc-water">How much bacteriostatic water for ${c.waterH2}?</h2>
<p>No single volume is correct. What you add sets the concentration, and the concentration sets how large each aliquot is. The math is <strong>concentration = ${N} mass ÷ diluent volume</strong>. Each unit on a U-100 syringe is 0.01 mL, so <strong>mcg per unit = concentration in mg/mL × 10</strong>.</p>

<div class="rc-scroll">
<table class="rc-table">
  <caption class="rc-hint" style="caption-side:bottom;text-align:left">Worked examples for Heartland's catalog vial sizes. They are arithmetic only and do not recommend any preparation.</caption>
  <thead><tr><th>Vial</th><th>Bac water added</th><th>Concentration</th><th>Per 1 unit (0.01 mL)</th><th>Per 10 units (0.1 mL)</th></tr></thead>
  <tbody>
${rows}
  </tbody>
</table>
</div>

<p>Two limits apply in practice:</p>
<ul>
  <li><strong>Small volumes measure poorly.</strong> Below about 2 units, the syringe's graduation error is a large share of the reading. More diluent turns the same mass into a larger volume that reads more accurately.</li>
  <li><strong>Vial headspace is limited.</strong> Most research vials are 3 mL vials, which puts the practical ceiling around 3 mL of diluent. To dilute further, transfer the solution to a larger sterile vial.</li>
</ul>

<h2 id="rc-how">How to reconstitute ${N}</h2>
<p>${Nc} ships as lyophilized (freeze-dried) powder because it is stable that way. Reconstitution follows the standard bench procedure:</p>
<ol>
  <li><strong>Let it warm up.</strong> Bring the sealed vial to room temperature. Wipe the stoppers of the ${N} vial and the <a href="${SITE}/product/bac-water/">bacteriostatic water</a> vial with alcohol.</li>
  <li><strong>Draw the diluent.</strong> With a sterile syringe, draw the volume you chose above.</li>
  <li><strong>Add it slowly, down the glass.</strong> Aim the stream at the inside wall of the vial, not at the powder. A direct jet can shear the peptide.</li>
  <li><strong>Swirl it; don't shake it.</strong> Roll the vial gently until the solution is clear. If it stays cloudy or has particles, it hasn't fully dissolved or the material has degraded.</li>
  <li><strong>Label and refrigerate.</strong> Write down the date, lot number and the concentration the calculator gave. Store at 2–8 °C.</li>
</ol>
<p>${c.howNote ? c.howNote + ' ' : ''}For materials, technique and storage in more depth, see the full guide: <a href="${SITE}/how-to-reconstitute-peptides/">how to reconstitute peptides</a>.</p>

<h2>Storage after reconstitution</h2>
<p>${c.storage}</p>
${blend}
<h2>${Nc} for research, with published COAs</h2>
<p>${c.product}</p>
<div class="rc-cta">
  <a class="rc-primary" href="${SITE}/product/${c.productSlug}/">${c.cta}</a>
  <a href="${SITE}/product/bac-water/">Bacteriostatic water</a>
  <a href="${SITE}/coa-portal/">View COAs</a>
</div>
<p>Further reading: ${c.reading.map(([href, t]) => `<a href="${SITE}${href}">${t}</a>`).join(' · ')} · <a href="${SITE}/peptide-calculator/">peptide calculator for any compound</a></p>

<h2 id="rc-faq">${Nc} calculator FAQ</h2>

${faqHtml}

<div class="rc-notice">
  <strong>Research Use Only.</strong> ${c.notice} Nothing on this page is medical advice or dosage guidance. See the <a href="${SITE}/research-use-policy/">Research Use Policy</a>.
</div>

</div>

<script>
${js}
</script>

<script type="application/ld+json">
${JSON.stringify(ld, null, 2)}
</script>
`;
}

for (const c of compounds) {
  const file = join(out, `peptide-calculator-${c.slug}.html`);
  writeFileSync(file, page(c));
  console.log('wrote', file);
}
