// Browser checks against the site setup.sh builds. Run via checks.sh.
import { chromium } from 'playwright';
const BASE = 'http://127.0.0.1:8099';
const exe = process.env.CHROMIUM || undefined;
const b = await chromium.launch(exe ? { executablePath: exe } : {});
let fail = 0;
const ok = (cond, what) => { console.log((cond ? 'PASS ' : 'FAIL ') + what); if (!cond) fail++; };
const page = async () => { const p = await b.newPage(); p.errors = []; p.on('pageerror', e => p.errors.push(e.message)); return p; };

if (!process.env.CHECKOUT) { // "Same-day shipping" line
  const p = await page();
  const shown = () => p.locator('.hbl-delivery-countdown').first().isVisible();
  await p.goto(BASE + '/product/glutathione/'); ok(!(await shown()), 'countdown hidden on an all-out-of-stock product');
  await p.goto(BASE + '/product/tb-500/'); await p.waitForLoadState('networkidle');
  ok(!(await shown()), 'countdown hidden while the default strength is out of stock');
  await p.selectOption('select[name=attribute_pa_strength]', '10mg'); await p.waitForTimeout(300); ok(await shown(), 'countdown shown for an in-stock strength');
  await p.selectOption('select[name=attribute_pa_strength]', '5mg'); await p.waitForTimeout(300); ok(!(await shown()), 'countdown hidden again for an out-of-stock strength');
  await p.goto(BASE + '/product/bpc-157/'); ok(await shown(), 'countdown shown on an in-stock product');
  ok(p.errors.length === 0, 'no JavaScript errors on product pages');
}

async function addToCart(p) {
  await p.goto(BASE + '/product/bpc-157/');
  await p.selectOption('select[name=attribute_pa_strength]', '5mg'); await p.click('.single_add_to_cart_button'); await p.waitForLoadState('networkidle');
}

if (process.env.CHECKOUT === 'classic') {
  const p = await page(); await addToCart(p);
  await p.goto(BASE + '/classic-checkout/'); await p.waitForLoadState('networkidle');
  ok(await p.locator('#ps_ruo_ack').count() === 1, 'classic checkout shows the 21+ / research-use checkbox');
  await p.selectOption('#billing_country', 'US'); await p.waitForTimeout(800);
  for (const [k, v] of Object.entries({ billing_first_name: 'Ann', billing_last_name: 'Lab', billing_address_1: '1 Main', billing_city: 'Tulsa', billing_postcode: '74101', billing_phone: '5555555555', billing_email: 'ann@example.com' })) await p.fill('#' + k, v);
  await p.selectOption('#billing_state', 'OK').catch(() => {}); await p.waitForTimeout(1500);
  await p.click('#place_order'); await p.waitForTimeout(3000);
  ok(/research-use-only acknowledgment/.test(await p.locator('.woocommerce-error').first().innerText().catch(() => '')) && !/order-received/.test(p.url()), 'classic checkout refuses an order without it');
  await p.check('#ps_ruo_ack'); await p.click('#place_order'); await p.waitForURL(/order-received/, { timeout: 20000 }).catch(() => {});
  ok(/order-received/.test(p.url()), 'classic checkout places the order with it ticked');
}

if (process.env.CHECKOUT === 'block') {
  const p = await page(); await addToCart(p);
  await p.goto(BASE + '/checkout/'); await p.waitForSelector('.wc-block-checkout', { timeout: 30000 }); await p.waitForTimeout(2000);
  const ack = p.getByLabel(/I am 21 or older/);
  ok(await ack.count() === 1, 'block checkout shows the 21+ / research-use checkbox');
  await p.fill('#email', 'bob@example.com');
  for (const [k, v] of Object.entries({ 'shipping-first_name': 'Bob', 'shipping-last_name': 'Lab', 'shipping-address_1': '1 Main', 'shipping-city': 'Tulsa', 'shipping-postcode': '74101', 'shipping-phone': '5555555555' })) await p.fill('#' + k, v);
  await p.waitForTimeout(2500);
  await p.click('.wc-block-components-checkout-place-order-button'); await p.waitForTimeout(3000);
  ok(!/order-received/.test(p.url()), 'block checkout refuses an order without it');
  await ack.check(); await p.click('.wc-block-components-checkout-place-order-button'); await p.waitForURL(/order-received/, { timeout: 20000 }).catch(() => {});
  ok(/order-received/.test(p.url()), 'block checkout places the order with it ticked');
  ok(p.errors.length === 0, 'no JavaScript errors at checkout');
}

await b.close();
process.exit(fail ? 1 : 0);
