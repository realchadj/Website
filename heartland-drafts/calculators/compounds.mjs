// Per-compound content for the calculator pages. build.mjs turns each entry into a page.
// Vial sizes and prices match the live product pages as of 2026-09-23. All products are treated as available.
// Worked aliquot examples deliberately avoid approved-label or trial dose steps.

const S = 'https://heartlandbiolabs.com';

export default [
  {
    slug: 'retatrutide',
    name: 'retatrutide',
    nameCap: 'Retatrutide',
    productSlug: 'retatrutide',
    vials: [10, 20, 30],
    defaults: [10, 2],
    aliquotPlaceholder: 300,
    table: [[10, 1], [10, 2], [10, 3], [20, 2], [20, 3], [30, 3]],
    faqVials: [10, 20, 30],
    unitExample: [10, 2],
    unitExampleAliquotMg: 0.3,
    waterH2: '10 mg retatrutide (and 20 or 30 mg)',
    seoTitle: 'Retatrutide Calculator: 10, 20 & 30 mg Reconstitution Math',
    metaDesc: 'Free retatrutide reconstitution calculator. See how much bac water to add to a 10, 20 or 30 mg vial, the mg/mL concentration and mcg per syringe unit. Research use only.',
    focus: 'retatrutide calculator',
    secondary: 'retatrutide dosage calculator (5.4k, KD 11); how much bac water for 10mg retatrutide (2.9k, KD 4); how to reconstitute retatrutide (2.4k, KD 0); retatrutide reconstitution calculator (1.3k, KD 18); reta calculator (590, KD 2); how much bac water for 30mg retatrutide (480, KD 2)',
    stockNote: 'Publish now.',
    lede: 'Reconstitution arithmetic for 10 mg, 20 mg and 30 mg retatrutide vials. Enter the vial size and how much bacteriostatic water is added. The calculator gives the concentration, the micrograms in each unit on a U-100 syringe, and the volume of any aliquot you specify.',
    status: 'Retatrutide is an investigational compound that the FDA has not approved.',
    storage: 'Lyophilized retatrutide keeps long-term at −20 °C, sealed and protected from light and moisture. Once reconstituted with bacteriostatic water, store it at 2–8 °C and use it within 28 days. That window is what the 0.9% benzyl alcohol in bacteriostatic water supports. Avoid repeated freeze–thaw cycles and vigorous agitation, which both degrade peptide solutions.',
    storageFaq: 'Reconstituted with bacteriostatic water and kept at 2–8 °C, it is conventionally used within 28 days. Lyophilized powder is stored at −20 °C, protected from light and moisture. Avoid repeated freeze–thaw cycles.',
    blend: {
      jump: 'Reta + tirz blend',
      title: 'Retatrutide + tirzepatide blend vial math',
      html: `<p>A blend vial holds two peptides. Diluent dilutes both, so each one has its own concentration. Run the calculation once for each component, using that component's mass. For the <a href="${S}/product/retatrutide-20mg-tirzepatide-40mg/">retatrutide 20 mg / tirzepatide 40 mg blend</a> reconstituted with 3 mL:</p>
<ul>
  <li>Retatrutide: 20 mg ÷ 3 mL = <strong>6.67 mg/mL</strong> (66.7 mcg per unit)</li>
  <li>Tirzepatide: 40 mg ÷ 3 mL = <strong>13.3 mg/mL</strong> (133 mcg per unit)</li>
</ul>
<p>The ratio between the two is fixed by the fill (1 : 2 here) and stays the same whatever volume you use. Enter each component's mass in the calculator above to get its figures.</p>`
    },
    product: `Heartland stocks <a href="${S}/product/retatrutide/">retatrutide</a> in 10 mg, 20 mg and 30 mg vials ($148, $175 and $225). Certificates of analysis (HPLC purity and mass-spectrometry identity) are published in the COA portal. The concentration the calculator gives assumes the label mass. The measured net content is on the lot's <a href="${S}/coa-portal/">certificate of analysis</a>.`,
    cta: 'Retatrutide: 10 / 20 / 30 mg',
    reading: [
      ['/blog/retatrutide-research-overview/', 'retatrutide research overview'],
      ['/blog/retatrutide-vs-tirzepatide-research-comparison/', 'retatrutide vs tirzepatide'],
      ['/blog/buying-retatrutide-research-verification/', 'what to verify before buying retatrutide'],
      ['/peptide-calculator/tirzepatide/', 'tirzepatide calculator'],
      ['/peptide-calculator/semaglutide/', 'semaglutide calculator']
    ],
    notice: 'Retatrutide from Heartland Bio Labs is sold only for in vitro laboratory research by qualified personnel. The FDA has not approved it, and it is not for human or veterinary use, self-administration or therapeutic use.'
  },

  {
    slug: 'semaglutide',
    name: 'semaglutide',
    nameCap: 'Semaglutide',
    productSlug: 'semaglutide',
    vials: [2, 5, 10],
    defaults: [5, 2],
    aliquotPlaceholder: 300,
    table: [[2, 1], [2, 2], [5, 1], [5, 2], [5, 3], [10, 1], [10, 2], [10, 3]],
    faqVials: [5, 10, 2],
    unitExample: [5, 2],
    unitExampleAliquotMg: 0.3,
    waterH2: 'semaglutide (2, 5 and 10 mg vials)',
    seoTitle: 'Semaglutide Reconstitution Calculator: 2, 5 & 10 mg Vials',
    metaDesc: 'Free semaglutide reconstitution calculator. Find the mg/mL concentration and mcg per syringe unit for 2, 5 or 10 mg vials with bacteriostatic water. Research use only.',
    focus: 'semaglutide reconstitution calculator',
    secondary: 'semaglutide calculator (480, KD 20); how to reconstitute semaglutide (320, KD 0); semaglutide mixing calculator (320, KD 24); how much bac water for 10mg semaglutide (140, KD 6); semaglutide dosage calculator (110, KD 11); how much bac water for 5mg semaglutide (70, KD 4)',
    stockNote: 'Publish now.',
    lede: 'Reconstitution arithmetic for 2 mg, 5 mg and 10 mg semaglutide research vials. Enter the vial size and how much bacteriostatic water is added. The calculator gives the concentration, the micrograms in each unit on a U-100 syringe, and the volume of any aliquot you specify.',
    status: 'Semaglutide is the active ingredient in FDA-approved prescription drugs, but the research material sold here is not an approved drug product.',
    storage: 'Keep lyophilized semaglutide sealed, cold, dry and away from light, and refrigerate or freeze it for longer storage. Once reconstituted with bacteriostatic water, store it at 2–8 °C. Bacteriostatic preparations are conventionally used within about 28 days. Avoid repeated temperature swings and agitation.',
    storageFaq: 'Reconstituted with bacteriostatic water and kept at 2–8 °C, it is conventionally used within about 28 days. Keep lyophilized powder sealed, cold, dry and away from light. Avoid repeated freeze–thaw cycles.',
    howNote: 'Semaglutide carries a C18 fatty diacid side chain but dissolves in bacteriostatic water with gentle swirling. Give it a minute or two before deciding it hasn\'t dissolved.',
    product: `Heartland stocks <a href="${S}/product/semaglutide/">semaglutide</a> in 2 mg, 5 mg and 10 mg vials ($49, $105 and $185). Certificates of analysis (HPLC purity and mass-spectrometry identity) are published in the COA portal. The concentration the calculator gives assumes the label mass. The measured net content is on the lot's <a href="${S}/coa-portal/">certificate of analysis</a>.`,
    cta: 'Semaglutide: 2 / 5 / 10 mg',
    reading: [
      ['/blog/semaglutide-research-overview/', 'semaglutide research overview'],
      ['/blog/cagrilintide-non-incretin-amylin/', 'cagrilintide and amylin research'],
      ['/peptide-calculator/tirzepatide/', 'tirzepatide calculator'],
      ['/peptide-calculator/retatrutide/', 'retatrutide calculator']
    ],
    notice: 'Semaglutide from Heartland Bio Labs is research-grade material sold only for in vitro laboratory research by qualified personnel. It is not an FDA-approved drug product and is not for human or veterinary use, self-administration or therapeutic use.'
  },

  {
    slug: 'tirzepatide',
    name: 'tirzepatide',
    nameCap: 'Tirzepatide',
    productSlug: 'tirzepatide',
    vials: [10, 20],
    defaults: [10, 2],
    aliquotPlaceholder: 300,
    table: [[10, 1], [10, 2], [10, 3], [20, 1], [20, 2], [20, 3]],
    faqVials: [10, 20],
    unitExample: [10, 2],
    unitExampleAliquotMg: 3,
    waterH2: 'tirzepatide (10 and 20 mg vials)',
    seoTitle: 'Tirzepatide Reconstitution Calculator: 10 & 20 mg Vials',
    metaDesc: 'Free tirzepatide reconstitution calculator. Find the mg/mL concentration and mcg per syringe unit for 10 or 20 mg vials with bacteriostatic water. Research use only.',
    focus: 'tirzepatide reconstitution calculator',
    secondary: 'tirzepatide dosage calculator (1.6k, KD 20); tirzepatide calculator (1.3k, KD 23); how to reconstitute tirzepatide (1k, KD 7); peptide calculator for tirzepatide (880, KD 24); tirzepatide mixing calculator (260, KD 32); how much bac water for 10mg tirzepatide (170, KD 11)',
    stockNote: 'Publish now.',
    lede: 'Reconstitution arithmetic for 10 mg and 20 mg tirzepatide research vials. Enter the vial size and how much bacteriostatic water is added. The calculator gives the concentration, the micrograms in each unit on a U-100 syringe, and the volume of any aliquot you specify.',
    status: 'Tirzepatide is the active ingredient in FDA-approved prescription drugs, but the research material sold here is not an approved drug product.',
    storage: 'Keep lyophilized tirzepatide sealed, cold, dry and away from light, and refrigerate or freeze it for longer storage. Once reconstituted with bacteriostatic water, store it at 2–8 °C. Bacteriostatic preparations are conventionally used within about 28 days. Don\'t agitate the solution or warm and cool it repeatedly.',
    storageFaq: 'Reconstituted with bacteriostatic water and kept at 2–8 °C, it is conventionally used within about 28 days. Keep lyophilized powder sealed, cold, dry and away from light. Avoid repeated freeze–thaw cycles.',
    blend: {
      jump: 'Reta + tirz blend',
      title: 'Tirzepatide in a blend vial',
      html: `<p>A blend vial holds two peptides. Diluent dilutes both, so each one has its own concentration. Run the calculation once for each component, using that component's mass. For the <a href="${S}/product/retatrutide-20mg-tirzepatide-40mg/">retatrutide 20 mg / tirzepatide 40 mg blend</a> reconstituted with 3 mL:</p>
<ul>
  <li>Tirzepatide: 40 mg ÷ 3 mL = <strong>13.3 mg/mL</strong> (133 mcg per unit)</li>
  <li>Retatrutide: 20 mg ÷ 3 mL = <strong>6.67 mg/mL</strong> (66.7 mcg per unit)</li>
</ul>
<p>The fill fixes the 2 : 1 ratio, and it stays the same whatever volume you use. The <a href="${S}/peptide-calculator/retatrutide/">retatrutide calculator</a> covers the other component.</p>`
    },
    product: `Heartland carries <a href="${S}/product/tirzepatide/">tirzepatide</a> in 10 mg and 20 mg vials ($105 and $135). Certificates of analysis (HPLC purity and mass-spectrometry identity) are published in the COA portal. The concentration the calculator gives assumes the label mass. The measured net content is on the lot's <a href="${S}/coa-portal/">certificate of analysis</a>.`,
    cta: 'Tirzepatide: 10 / 20 mg',
    reading: [
      ['/blog/tirzepatide-research-overview/', 'tirzepatide research overview'],
      ['/blog/retatrutide-vs-tirzepatide-research-comparison/', 'retatrutide vs tirzepatide'],
      ['/peptide-calculator/retatrutide/', 'retatrutide calculator'],
      ['/peptide-calculator/semaglutide/', 'semaglutide calculator']
    ],
    notice: 'Tirzepatide from Heartland Bio Labs is research-grade material sold only for in vitro laboratory research by qualified personnel. It is not an FDA-approved drug product and is not for human or veterinary use, self-administration or therapeutic use.'
  },

  {
    slug: 'bpc-157',
    name: 'BPC-157',
    nameCap: 'BPC-157',
    productSlug: 'bpc-157',
    vials: [5, 10],
    defaults: [5, 2],
    aliquotPlaceholder: 250,
    table: [[5, 1], [5, 2], [5, 3], [10, 1], [10, 2], [10, 3]],
    faqVials: [5, 10],
    unitExample: [5, 2],
    unitExampleAliquotMg: 0.25,
    waterH2: 'BPC-157 (5 and 10 mg vials)',
    seoTitle: 'BPC-157 Calculator: 5 & 10 mg Reconstitution Math',
    metaDesc: 'Free BPC-157 reconstitution calculator. See how much bac water to add to a 5 or 10 mg vial, the mg/mL concentration and mcg per syringe unit. Research use only.',
    focus: 'bpc 157 calculator',
    secondary: 'bpc 157 dosage calculator (4.4k, KD 17); bpc-157 reconstitution calculator (260, KD 16); bpc 157 reconstitution (260, KD 8); how to reconstitute bpc 157 (170, KD 0)',
    stockNote: 'Publish now.',
    lede: 'Reconstitution arithmetic for 5 mg and 10 mg BPC-157 vials. Enter the vial size and how much bacteriostatic water is added. The calculator gives the concentration, the micrograms in each unit on a U-100 syringe, and the volume of any aliquot you specify.',
    status: 'The FDA has not approved BPC-157 for any use.',
    howNote: 'BPC-157 is a 15-amino-acid peptide that dissolves readily in bacteriostatic water, and it is notably stable in solution compared with most research peptides.',
    storage: 'Keep lyophilized BPC-157 sealed, cold, dry and away from light, and freeze it for long-term storage. Once reconstituted with bacteriostatic water, store it at 2–8 °C. Bacteriostatic preparations are conventionally used within about 28 days. Avoid repeated freeze–thaw cycles and vigorous agitation.',
    storageFaq: 'Reconstituted with bacteriostatic water and kept at 2–8 °C, it is conventionally used within about 28 days. Lyophilized powder is stored frozen, protected from light and moisture. Avoid repeated freeze–thaw cycles.',
    blend: {
      jump: 'BPC-157 blends',
      title: 'BPC-157 blend vials (BPC-157 + TB-500, GLOW, KLOW)',
      html: `<p>In a blend vial, the diluent dilutes every component at once, so each one ends up with its own concentration. Run the calculation once per component, using that component's mass from the label or the <a href="${S}/coa-portal/">certificate of analysis</a>. The ratio between components is fixed by the fill and doesn't change with the volume you add. Blends Heartland carries: <a href="${S}/product/bpc-157-tb-500/">BPC-157 + TB-500</a>, <a href="${S}/product/glow/">GLOW</a> and <a href="${S}/product/klow/">KLOW</a> (see the <a href="${S}/blog/klow-reconstitution/">KLOW reconstitution guide</a>).</p>`
    },
    product: `Heartland carries <a href="${S}/product/bpc-157/">BPC-157</a> in 5 mg and 10 mg vials. Certificates of analysis (HPLC purity and mass-spectrometry identity) are published in the COA portal. The concentration the calculator gives assumes the label mass. The measured net content is on the lot's <a href="${S}/coa-portal/">certificate of analysis</a>.`,
    cta: 'BPC-157: 5 / 10 mg',
    reading: [
      ['/blog/bpc-157-research-overview-structure-stability-quality/', 'BPC-157 research overview'],
      ['/blog/bpc-157-vs-tb-500-research-comparison/', 'BPC-157 vs TB-500'],
      ['/blog/buying-bpc-157-research-verification/', 'what to verify before buying BPC-157'],
      ['/blog/wolverine-peptide-stack/', 'the BPC-157 + TB-500 "Wolverine" blend']
    ],
    notice: 'BPC-157 from Heartland Bio Labs is sold only for in vitro laboratory research by qualified personnel. The FDA has not approved it, and it is not for human or veterinary use, self-administration or therapeutic use.'
  }
];
