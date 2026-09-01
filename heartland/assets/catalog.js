/* ---------------------------------------------------------------------------
   TEST CATALOG & PRICING
   ---------------------------------------------------------------------------
   This is the only file you need to edit to make the quoting engine your own.
   Change prices, rename tests, add or delete panels, adjust turnaround
   multipliers and volume breaks. Nothing else in the app hardcodes a price.

   Prices below are placeholder market-typical figures for a small US
   analytical lab. REPLACE THEM WITH YOURS before going live.

   Field reference for a test:
     code      short SKU shown on the quote and chain-of-custody
     name      customer-facing name
     price     per-sample price in USD
     tat       standard turnaround, in business days
     method    reference method — builds credibility, shown on hover
     detail    one-line plain-English description of what they get
--------------------------------------------------------------------------- */

const CATALOG = {
  currency: 'USD',

  categories: [
    {
      id: 'soil',
      name: 'Soil & Agronomy',
      blurb: 'Fertility, texture and salinity work for growers, agronomists and land managers.',
      tests: [
        { code: 'S1', name: 'Basic Soil Fertility', price: 18, tat: 5,
          method: 'Mehlich-3 / ICP-OES',
          detail: 'pH, buffer pH, organic matter, P, K, Ca, Mg, CEC and base saturation.' },
        { code: 'S2', name: 'Complete Soil + Micronutrients', price: 28, tat: 5,
          method: 'Mehlich-3 / ICP-OES',
          detail: 'Everything in S1 plus sulfur, zinc, iron, manganese, copper and boron.' },
        { code: 'S3', name: 'Soil Texture (Hydrometer)', price: 32, tat: 7,
          method: 'ASTM D422',
          detail: 'Sand, silt and clay percentages with USDA textural class.' },
        { code: 'S4', name: 'Soluble Salts / Saturated Paste', price: 35, tat: 6,
          method: 'USDA Handbook 60',
          detail: 'EC, SAR, soluble Ca/Mg/Na/K and chloride for salinity diagnosis.' },
        { code: 'S5', name: 'Nitrate-N', price: 9, tat: 3,
          method: 'KCl extraction / colorimetric',
          detail: 'Residual nitrate-nitrogen for in-season sidedress decisions.' },
        { code: 'S6', name: 'Compost & Manure Analysis', price: 62, tat: 7,
          method: 'TMECC',
          detail: 'Nutrient value, moisture, C:N ratio and pH for land-application planning.' }
      ]
    },
    {
      id: 'water',
      name: 'Water Quality',
      blurb: 'Private wells, municipal compliance, irrigation and process water.',
      tests: [
        { code: 'W1', name: 'Coliform & E. coli (Presence/Absence)', price: 30, tat: 2,
          method: 'SM 9223B',
          detail: 'Pass/fail bacteriological safety screen — the standard well test.' },
        { code: 'W2', name: 'Drinking Water Basic Panel', price: 65, tat: 5,
          method: 'EPA 300.0 / 200.7',
          detail: 'pH, hardness, TDS, alkalinity, nitrate, nitrite, iron, manganese, sulfate.' },
        { code: 'W3', name: 'Heavy Metals Panel (13 metals)', price: 120, tat: 7,
          method: 'EPA 200.8 (ICP-MS)',
          detail: 'Includes lead, arsenic, cadmium, chromium, copper, mercury and selenium.' },
        { code: 'W4', name: 'Nitrate / Nitrite', price: 22, tat: 3,
          method: 'EPA 300.0',
          detail: 'Quantitative nitrate and nitrite — infant safety and irrigation planning.' },
        { code: 'W5', name: 'Total Coliform MPN (Quantitative)', price: 45, tat: 3,
          method: 'SM 9223B',
          detail: 'Numeric coliform count where presence/absence is not sufficient.' },
        { code: 'W6', name: 'Irrigation Suitability', price: 78, tat: 6,
          method: 'SM / USDA',
          detail: 'EC, SAR, bicarbonate, chloride, boron and sodium hazard classification.' }
      ]
    },
    {
      id: 'food',
      name: 'Food & Beverage',
      blurb: 'Label compliance, safety testing and shelf life for producers and co-packers.',
      tests: [
        { code: 'F1', name: 'Nutrition Facts Panel (FDA 2016)', price: 475, tat: 10,
          method: 'AOAC / FDA 21 CFR 101.9',
          detail: 'Full label-ready panel with camera-ready artwork and added-sugars declaration.' },
        { code: 'F2', name: 'Proximate Analysis', price: 95, tat: 7,
          method: 'AOAC 934.01 / 990.03 / 920.39',
          detail: 'Moisture, protein, fat, crude fiber, ash and calculated carbohydrate.' },
        { code: 'F3', name: 'Aerobic Plate Count', price: 28, tat: 4,
          method: 'FDA BAM Ch. 3',
          detail: 'General microbial load — the baseline sanitation indicator.' },
        { code: 'F4', name: 'Salmonella (PCR, 25 g)', price: 55, tat: 3,
          method: 'AOAC-RI validated PCR',
          detail: 'Rapid presence/absence screen with cultural confirmation of presumptives.' },
        { code: 'F5', name: 'Listeria monocytogenes (PCR)', price: 58, tat: 3,
          method: 'AOAC-RI validated PCR',
          detail: 'Ready-to-eat and environmental swab testing for Listeria programs.' },
        { code: 'F6', name: 'Mycotoxin Panel', price: 150, tat: 6,
          method: 'HPLC-FLD / LC-MS/MS',
          detail: 'Aflatoxin, deoxynivalenol, fumonisin, zearalenone and ochratoxin A.' },
        { code: 'F7', name: 'Shelf Life Study (5 pull points)', price: 850, tat: 45,
          method: 'Accelerated or real-time protocol',
          detail: 'Micro and quality attributes across five intervals with a written conclusion.' },
        { code: 'F8', name: 'Water Activity (aw)', price: 24, tat: 3,
          method: 'AOAC 978.18',
          detail: 'Critical control point documentation for HACCP and process authority filings.' }
      ]
    },
    {
      id: 'feed',
      name: 'Feed & Forage',
      blurb: 'Ration balancing and quality verification for livestock operations and feed mills.',
      tests: [
        { code: 'A1', name: 'Standard Forage Package', price: 42, tat: 5,
          method: 'NIR / wet chemistry',
          detail: 'Dry matter, crude protein, ADF, NDF, TDN and relative feed value.' },
        { code: 'A2', name: 'Complete Feed Analysis', price: 88, tat: 7,
          method: 'AOAC',
          detail: 'Proximates plus calcium, phosphorus, potassium, magnesium and sodium.' },
        { code: 'A3', name: 'Nitrate Toxicity Screen', price: 26, tat: 2,
          method: 'Colorimetric',
          detail: 'Same-week nitrate result for drought-stressed forage before feed-out.' },
        { code: 'A4', name: 'Mineral Panel (ICP)', price: 68, tat: 6,
          method: 'ICP-OES',
          detail: 'Macro and trace minerals for ration formulation and deficiency workups.' }
      ]
    },
    {
      id: 'environmental',
      name: 'Environmental',
      blurb: 'Site assessment, remediation verification and regulatory reporting.',
      tests: [
        { code: 'E1', name: 'RCRA 8 Metals in Soil', price: 110, tat: 7,
          method: 'EPA 6010/7471',
          detail: 'Arsenic, barium, cadmium, chromium, lead, mercury, selenium, silver.' },
        { code: 'E2', name: 'TPH — Diesel & Gasoline Range', price: 135, tat: 7,
          method: 'EPA 8015',
          detail: 'Petroleum hydrocarbon quantitation for tank pulls and spill closure.' },
        { code: 'E3', name: 'Volatile Organics (VOC)', price: 185, tat: 8,
          method: 'EPA 8260',
          detail: 'Full volatile organic scan for groundwater and soil vapor investigations.' },
        { code: 'E4', name: 'TCLP Extraction + 8 Metals', price: 215, tat: 10,
          method: 'EPA 1311 / 6010',
          detail: 'Waste characterization to determine hazardous vs. non-hazardous disposal.' }
      ]
    }
  ],

  /* Turnaround options. `multiplier` is applied to the whole testing subtotal.
     `days` overrides the standard TAT shown to the customer.               */
  turnaround: [
    { id: 'standard', name: 'Standard',  multiplier: 1.00, note: 'Published turnaround for each test' },
    { id: 'priority', name: 'Priority',  multiplier: 1.50, note: 'Results in 3 business days where methods allow' },
    { id: 'rush',     name: 'Rush',      multiplier: 2.00, note: '24–48 hours, confirm capacity before shipping' }
  ],

  /* Volume breaks applied on sample count. First matching tier from the
     bottom wins, so keep this sorted ascending by `min`.                    */
  volumeBreaks: [
    { min: 10,  discount: 0.10, label: '10+ samples' },
    { min: 25,  discount: 0.15, label: '25+ samples' },
    { min: 50,  discount: 0.20, label: '50+ samples' },
    { min: 100, discount: 0.25, label: '100+ samples' }
  ],

  /* Optional line items the customer can toggle. `perSample: true` bills
     once per sample; otherwise it is a single flat charge per order.        */
  addOns: [
    { id: 'kit',      name: 'Prepaid sample kit & shipping label', price: 12,  perSample: true,
      detail: 'Bottles, bags, ice pack and a prepaid return label mailed to you.' },
    { id: 'pickup',   name: 'Courier pickup (regional)',           price: 45,  perSample: false,
      detail: 'We collect from your site — available within our service radius.' },
    { id: 'coc',      name: 'Formal chain of custody',             price: 0,   perSample: false,
      detail: 'Signed custody documentation. Required for regulatory and legal work.' },
    { id: 'interp',   name: 'Written interpretation & recommendations', price: 85, perSample: false,
      detail: 'An analyst walks through what the numbers mean and what to do next.' },
    { id: 'archive',  name: 'Extended sample retention (90 days)', price: 15,  perSample: true,
      detail: 'We hold your sample for retesting instead of the standard 14 days.' }
  ],

  /* Minimum order value. Set to 0 to disable.                              */
  minimumOrder: 35,

  /* Quote validity shown in the footer of the printed quote.               */
  quoteValidDays: 30
};
