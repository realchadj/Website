/* The pricing model shared by reprice.mjs (the repo's CSV) and
   reprice-live.mjs (the live store).

   A vial sells at the lowest .99 that covers everything, nothing more: the
   vial itself from the cost sheet, getting it out the door, card
   processing as a share of the sale, and a reserve as a share of the sale.
   Research vials must still cover all of that on the deepest volume tier,
   so a 5-vial order never dips into the reserve. */

export const ASSUMPTIONS = {
  /* Card processing, as a share of the sale. Stripe, Square and PayPal
     don't accept research peptides, so this is a high-risk merchant
     account's rate. */
  cardPct: 0.10,

  /* Set aside from every sale, as a share of the sale: chargebacks,
     replacements under the quality guarantee, restocking, and whatever
     else a month throws at the store. */
  reservePct: 0.20,

  /* Label, vial box, mailer share and packing time, per vial. Shipping
     itself is charged at checkout. Set to 0 to price on the vial's cost
     alone (BPC-157 10mg then drops from $13.99 to $8.99). */
  fulfilmentPerUnit: 3.00,

  /* Mix-and-match volume discount on research vials (not Lab Supplies),
     applied in the cart by wordpress/peptide-store.php — keep the two in
     step. The deepest tier must still cover every cost and the reserve. */
  volumeTiers: [{ minQty: 3, off: 0.10 }, { minQty: 5, off: 0.15 }],
};

export const deepestOff = (a = ASSUMPTIONS) => Math.max(0, ...a.volumeTiers.map(t => t.off));

/* What a sale leaves after the vial, fulfilment, card processing and the
   reserve, with `off` already taken off the price. Negative means the sale
   ate into the reserve. */
export function breakdown(price, cost, off = 0, a = ASSUMPTIONS) {
  const paid = price * (1 - off);
  const fees = paid * a.cardPct;
  const reserve = paid * a.reservePct;
  const left = paid - cost - a.fulfilmentPerUnit - fees - reserve;
  return { paid, fees, reserve, left };
}

/* The smallest price whose breakdown is still non-negative after `off`:
     (1 − off)·p·(1 − card − reserve) ≥ cost + fulfilment  */
export function floorFor(cost, off = 0, a = ASSUMPTIONS) {
  const keep = 1 - a.cardPct - a.reservePct;
  if (keep <= 0 || off >= 1) throw new Error('the assumptions leave nothing to cover the vial');
  return (cost + a.fulfilmentPerUnit) / (keep * (1 - off));
}

export const priceFor = (cost, off = 0, a = ASSUMPTIONS) => up99(floorFor(cost, off, a));

export const up99 = x => Math.ceil(x + 0.01) - 0.01;      // 15 → 15.99, 15.99 → 15.99
export const down99 = x => Math.floor(x + 0.01) - 0.01;   // 30 → 29.99, 29.99 → 29.99
