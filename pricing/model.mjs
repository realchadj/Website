/* The pricing model shared by reprice.mjs (the repo's CSV) and
   reprice-live.mjs (the live store). Every cost here is a share of the
   shelf price except the vial itself, which comes from the cost sheet. */

export const ASSUMPTIONS = {
  /* Card processing. Stripe, Square and PayPal don't accept research
     peptides, so this is a high-risk merchant account's rate. */
  cardPct: 0.10,

  /* Label, vial box, mailer share and packing time, as a share of price. */
  fulfilmentPct: 0.10,

  /* Everything else it takes to run the store, as a share of price. */
  overheadPct: 0.10,

  /* The discount assumed on every order: the welcome code or the 10% volume
     tier. A coupon replaces the volume discount rather than stacking. */
  discountPct: 0.10,

  /* Profit left after the vial, the three fees and the discount, as a
     share of price. */
  targetMargin: 0.35,

  /* Never earn less than this per vial, so cheap items still pay their way. */
  minProfit: 8.00,

  /* Shelf price as a multiple of per-vial cost. Retail for research peptides
     typically runs 8–15x landed cost; 6x prices the store as the affordable
     option while keeping about 43% of each sale after every cost above. */
  costMultiple: 6,

  /* Mix-and-match volume discount on research vials (not Lab Supplies),
     applied in the cart by wordpress/peptide-store.php — keep the two in
     step. The deepest tier replaces discountPct and must still leave
     targetMargin. */
  volumeTiers: [{ minQty: 3, off: 0.10 }, { minQty: 5, off: 0.15 }],
};

export const feesPct = (a = ASSUMPTIONS) => a.cardPct + a.fulfilmentPct + a.overheadPct;

/* The floor is the smallest p with p − cost − fees·p − discount·p ≥ the
   larger of targetMargin·p and minProfit. The price is the shelf multiple
   or the floor, whichever is higher, rounded up to the next .99. */
export function floorFor(cost, a = ASSUMPTIONS) {
  const keep = 1 - feesPct(a) - a.discountPct;
  return Math.max(cost / (keep - a.targetMargin), (cost + a.minProfit) / keep);
}

export function priceFor(cost, a = ASSUMPTIONS) {
  return up99(Math.max(cost * a.costMultiple - 0.01, floorFor(cost, a)));
}

export function breakdown(price, cost, off = ASSUMPTIONS.discountPct, a = ASSUMPTIONS) {
  const fees = price * feesPct(a);
  const discount = price * off;
  const profit = price - cost - fees - discount;
  return { fees, discount, profit, margin: profit / price };
}

export const up99 = x => Math.ceil(x + 0.01) - 0.01;      // 15 → 15.99, 15.99 → 15.99
export const down99 = x => Math.floor(x + 0.01) - 0.01;   // 30 → 29.99, 29.99 → 29.99
